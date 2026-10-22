-- CGMA-PROGRAMS-001 (EKODI AI 협의 이슈 ekodi-platform#5616, 조건부 승인 반영)
-- 대상: Supabase ekodi-platform-prod. 가산적 변경만(기존 데이터 무변경).
-- 적용: 2026-10-22 KST, 5개 마이그레이션으로 분할 적용(cgma_site_admin_and_audit, cgma_programs_table_and_public_rpc, cgma_programs_admin_save_rpc, cgma_ai_edu_site_admin_jwt_auth, cgma_programs_seed_current_activities).
-- 롤백: drop function cgma_programs_* / cgma_is_site_admin, drop table cgma_programs, cgma_admin_audit.

create or replace function public.cgma_is_site_admin()
returns boolean language sql security definer set search_path = '' stable as $$
  select auth.uid() is not null and (
    public.is_platform_admin()
    or coalesce(private.has_tenant_admin_access('c1b26bcc-05f8-4392-b665-ec5c44008e91'::uuid), false));
$$;
revoke all on function public.cgma_is_site_admin() from public;
grant execute on function public.cgma_is_site_admin() to anon, authenticated;

create table if not exists public.cgma_admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_kind text not null check (actor_kind in ('site_admin','pin')),
  subject text not null,
  subject_id text,
  action text not null,
  changes jsonb
);
comment on table public.cgma_admin_audit is '청계면상인회 사용자 화면 직접관리 변경 이력(행사·활동, AI 교육 신청). 개인정보 원문 미기록.';
alter table public.cgma_admin_audit enable row level security;
revoke all on public.cgma_admin_audit from anon, authenticated;

-- AI 교육 관리: 상인회 관리자 로그인 우선 (PIN은 cgma.or.kr 이전 확인 후 퇴역)
create or replace function public.cgma_ai_edu_2026_check_pin(p_pin text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_fail int; v_ok boolean;
begin
  if public.cgma_is_site_admin() then return 'ok'; end if;
  if coalesce(p_pin, '') = '' then return 'login_required'; end if;
  select count(*) into v_fail from public.cgma_ai_edu_2026_admin_attempts
   where not ok and at > now() - interval '1 hour';
  if v_fail >= 5 then return 'locked'; end if;
  select (admin_hash = extensions.crypt(p_pin, admin_hash)) into v_ok
    from public.cgma_ai_edu_2026_settings where id = 1;
  insert into public.cgma_ai_edu_2026_admin_attempts (ok) values (coalesce(v_ok,false));
  return case when v_ok then 'ok' else 'denied' end;
end $$;
revoke all on function public.cgma_ai_edu_2026_check_pin(text) from public, anon, authenticated;

create or replace function public.cgma_ai_edu_2026_admin_update(p_pin text, p_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v text; v_att int[];
begin
  v := public.cgma_ai_edu_2026_check_pin(p_pin);
  if v <> 'ok' then return jsonb_build_object('ok', false, 'error', v); end if;
  if p_id is null then
    update public.cgma_ai_edu_2026_settings set
      capacity = coalesce((p_patch->>'capacity')::int, capacity),
      is_open = coalesce((p_patch->>'is_open')::boolean, is_open),
      updated_at = now() where id = 1;
  else
    if p_patch ? 'attendance' then
      select coalesce(array_agg(distinct x::int order by x::int), '{}') into v_att
        from jsonb_array_elements_text(p_patch->'attendance') x where x ~ '^[1-8]$';
    end if;
    update public.cgma_ai_edu_2026_applications set
      status = coalesce(p_patch->>'status', status),
      admin_memo = case when p_patch ? 'admin_memo' then nullif(btrim(p_patch->>'admin_memo'), '') else admin_memo end,
      attendance = coalesce(v_att, attendance),
      updated_at = now()
    where id = p_id;
    if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  end if;
  insert into public.cgma_admin_audit (actor, actor_kind, subject, subject_id, action, changes)
  values (auth.uid(), case when public.cgma_is_site_admin() then 'site_admin' else 'pin' end,
          'ai_edu_2026', coalesce(p_id::text, 'settings'), 'update', p_patch - 'admin_memo');
  return jsonb_build_object('ok', true);
exception when check_violation or invalid_text_representation then
  return jsonb_build_object('ok', false, 'error', 'invalid');
end $$;

create table if not exists public.cgma_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  title text not null check (char_length(title) between 2 and 80),
  category text not null check (category in ('교육','행사·축제','모집·신청','설문','공지')),
  summary text check (summary is null or char_length(summary) <= 300),
  period_label text check (period_label is null or char_length(period_label) <= 60),
  starts_on date,
  ends_on date,
  status text not null default '준비' check (status in ('준비','모집중','마감','종료')),
  apply_url text check (apply_url is null or apply_url ~ '^(/[^\s<>"]*|https://[^\s<>"]+)$'),
  apply_label text check (apply_label is null or char_length(apply_label) <= 30),
  manage_url text check (manage_url is null or manage_url ~ '^(/[^\s<>"]*|https://[^\s<>"]+)$'),
  image_url text check (image_url is null or image_url ~ '^(/[^\s<>"]*|https://[^\s<>"]+)$'),
  is_public boolean not null default true,
  sort_order int not null default 100 check (sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
comment on table public.cgma_programs is '청계면상인회 행사·활동 단일 원본(cgma.or.kr /programs/ 와 홈 띠의 원본). 브라우저 직접 접근 불가, RPC 전용. 쓰기는 상인회 관리자 JWT만.';
alter table public.cgma_programs enable row level security;
revoke all on public.cgma_programs from anon, authenticated;

create or replace function public.cgma_programs_public()
returns jsonb language sql security definer set search_path = '' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', slug, 'title', title, 'category', category, 'summary', summary,
    'period_label', period_label, 'starts_on', starts_on, 'ends_on', ends_on, 'status', status,
    'apply_url', apply_url, 'apply_label', apply_label, 'image_url', image_url, 'sort_order', sort_order)
    order by (case status when '모집중' then 0 when '준비' then 1 when '마감' then 2 else 3 end), sort_order, starts_on nulls last), '[]'::jsonb)
  from public.cgma_programs where is_public;
$$;

create or replace function public.cgma_programs_admin_list()
returns jsonb language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.cgma_is_site_admin() then return jsonb_build_object('ok', false, 'error', 'tenant_admin_required'); end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'updated_by' order by p.sort_order, p.created_at) from public.cgma_programs p), '[]'::jsonb));
end $$;

create or replace function public.cgma_programs_admin_save(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_slug text; v_action text;
begin
  if not public.cgma_is_site_admin() then return jsonb_build_object('ok', false, 'error', 'tenant_admin_required'); end if;
  v_id := nullif(p->>'id','')::uuid;
  if v_id is null then
    v_action := 'create';
    v_slug := coalesce(nullif(lower(btrim(p->>'slug')), ''), 'program-' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD-HH24MISS'));
    insert into public.cgma_programs (slug, title, category, summary, period_label, starts_on, ends_on, status, apply_url, apply_label, manage_url, image_url, is_public, sort_order, updated_by)
    values (v_slug, btrim(p->>'title'), p->>'category', nullif(btrim(coalesce(p->>'summary','')),''), nullif(btrim(coalesce(p->>'period_label','')),''),
            nullif(p->>'starts_on','')::date, nullif(p->>'ends_on','')::date, coalesce(nullif(p->>'status',''),'준비'),
            nullif(btrim(coalesce(p->>'apply_url','')),''), nullif(btrim(coalesce(p->>'apply_label','')),''),
            nullif(btrim(coalesce(p->>'manage_url','')),''), nullif(btrim(coalesce(p->>'image_url','')),''),
            coalesce((p->>'is_public')::boolean, true), coalesce(nullif(p->>'sort_order','')::int, 100), auth.uid())
    returning id into v_id;
  else
    v_action := 'update';
    update public.cgma_programs set
      title = coalesce(nullif(btrim(p->>'title'),''), title),
      category = coalesce(nullif(p->>'category',''), category),
      summary = case when p ? 'summary' then nullif(btrim(p->>'summary'),'') else summary end,
      period_label = case when p ? 'period_label' then nullif(btrim(p->>'period_label'),'') else period_label end,
      starts_on = case when p ? 'starts_on' then nullif(p->>'starts_on','')::date else starts_on end,
      ends_on = case when p ? 'ends_on' then nullif(p->>'ends_on','')::date else ends_on end,
      status = coalesce(nullif(p->>'status',''), status),
      apply_url = case when p ? 'apply_url' then nullif(btrim(p->>'apply_url'),'') else apply_url end,
      apply_label = case when p ? 'apply_label' then nullif(btrim(p->>'apply_label'),'') else apply_label end,
      manage_url = case when p ? 'manage_url' then nullif(btrim(p->>'manage_url'),'') else manage_url end,
      image_url = case when p ? 'image_url' then nullif(btrim(p->>'image_url'),'') else image_url end,
      is_public = coalesce((p->>'is_public')::boolean, is_public),
      sort_order = coalesce(nullif(p->>'sort_order','')::int, sort_order),
      updated_at = now(), updated_by = auth.uid()
    where id = v_id;
    if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  end if;
  insert into public.cgma_admin_audit (actor, actor_kind, subject, subject_id, action, changes)
  values (auth.uid(), 'site_admin', 'cgma_programs', v_id::text, v_action, p - 'id');
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate_slug');
end $$;

revoke all on function public.cgma_programs_public(), public.cgma_programs_admin_list(), public.cgma_programs_admin_save(jsonb) from public;
grant execute on function public.cgma_programs_public(), public.cgma_programs_admin_list(), public.cgma_programs_admin_save(jsonb) to anon, authenticated;

insert into public.cgma_programs (slug, title, category, summary, period_label, starts_on, ends_on, status, apply_url, apply_label, manage_url, image_url, sort_order) values
 ('ai-marketing-2026', '상인 AI 마케팅 교육 8회 과정', '교육', '휴대폰으로 사진·숏폼·SNS 홍보를 직접 따라 하며 ‘내 가게 AI 홍보 키트’를 완성합니다. 선착순 15명.', '11.6(금) – 12.18(금) · 매주 2시간', '2026-11-06', '2026-12-18', '모집중', '/programs/ai-marketing-2026/', '참가 신청', '/programs/ai-marketing-2026/#manage', null, 10),
 ('du-dream-festival-2026-booth', '2026 누구나 두:드림 축제 참여부스 신청', '행사·축제', '10월 28일(수) 국립목포대 후문 축제에 상인회 참여부스 5개를 운영합니다.', '10.28(수) 11:00 – 17:00', '2026-10-28', '2026-10-28', '모집중', '/festival/2026/apply/', '부스 신청', '/festival/2026/apply/?manage=festivalManager', '/festival/2026/assets/du-dream-2026-official-poster.webp', 20),
 ('du-dream-festival-2026-coupon', '축제 5천원 쿠폰 사용 상가 신청', '모집·신청', '축제 방문객 5천원 쿠폰을 받을 상가를 모집합니다.', '10.28(수) 축제 당일 사용', '2026-10-28', '2026-10-28', '모집중', '/festival/2026/coupon/', '상가 신청', '/festival/2026/coupon/?manage=couponManager', null, 30),
 ('ai-education-survey-2026', '상인 AI 교육 수요조사', '설문', '응답 결과를 바탕으로 AI 마케팅 교육 8회 과정을 편성했습니다.', '2026년 10월', null, '2026-10-22', '마감', '/ai-education/', '설문 보기', '/ai-education/?manage=educationSurveyManager', null, 90)
on conflict (slug) do nothing;
