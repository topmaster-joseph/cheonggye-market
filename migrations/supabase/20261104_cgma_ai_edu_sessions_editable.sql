-- CGMA AI education: the eight session dates become data that an authorized
-- roster manager or CGMA site admin can edit in place (application page and
-- roster page), before and during the course. Additive and idempotent.
--
-- Session shape: {"no":1..8,"date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM",
--                 "title":text<=60,"detail":text<=120}
-- Session numbers are stable so applicants' available_sessions / attendance
-- (int 1..8) keep pointing at the same session after a date change.

alter table public.cgma_ai_edu_2026_settings
  add column if not exists sessions jsonb,
  add column if not exists schedule_note text;

update public.cgma_ai_edu_2026_settings set sessions = '[
  {"no":1,"date":"2026-11-13","start":"14:00","end":"16:00","title":"휴대폰 AI 시작하기","detail":"AI 앱 설치 · 음성/사진 질문"},
  {"no":2,"date":"2026-11-20","start":"14:00","end":"16:00","title":"ChatGPT 질문법","detail":"가게 소개서 · 공지문"},
  {"no":3,"date":"2026-11-27","start":"14:00","end":"16:00","title":"홍보 전략 · AI 홍보문구","detail":"타깃 고객 카드 · 문구 3종"},
  {"no":4,"date":"2026-12-04","start":"14:00","end":"16:00","title":"AI 상품 사진 · 홍보 이미지","detail":"상품 사진 3장 · 포스터 1장"},
  {"no":5,"date":"2026-12-11","start":"14:00","end":"16:00","title":"숏폼 기획 · 촬영","detail":"15초 숏폼 초안"},
  {"no":6,"date":"2026-12-18","start":"14:00","end":"16:00","title":"자막 · 음성 · 편집 완성","detail":"숏폼 1편 게시"},
  {"no":7,"date":"2026-12-25","start":"14:00","end":"16:00","title":"인스타 · 플레이스 · 리뷰","detail":"게시물 · 소식 · 리뷰 답글"},
  {"no":8,"date":"2027-01-01","start":"14:00","end":"16:00","title":"판매 · 예약 · 실행계획","detail":"4주 실행계획 · 수료 발표"}
]'::jsonb
where id = 1 and sessions is null;

update public.cgma_ai_edu_2026_settings
  set schedule_note = '교육시간은 매회 오후 2~4시이며, 사정에 따라 바뀔 수 있습니다. 변경되면 문자로 미리 알려드립니다.'
where id = 1 and schedule_note is null;

-- Public: schedule is public information (no applicant data).
create or replace function public.cgma_ai_edu_2026_public_stats()
returns jsonb
language sql stable security definer set search_path = ''
as $fn$
  select jsonb_build_object(
    'capacity', s.capacity, 'is_open', s.is_open,
    'active', (select count(*) from public.cgma_ai_edu_2026_applications a where a.status in ('접수','확정')),
    'waiting', (select count(*) from public.cgma_ai_edu_2026_applications a where a.status = '대기'),
    'sessions', coalesce(s.sessions, '[]'::jsonb),
    'schedule_note', s.schedule_note)
  from public.cgma_ai_edu_2026_settings s where s.id = 1;
$fn$;

create or replace function public.cgma_ai_edu_2026_admin_list(p_pin text)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v text;
begin
  v := public.cgma_ai_edu_2026_check_pin(p_pin);
  if v <> 'ok' then return jsonb_build_object('ok', false, 'error', v); end if;
  return jsonb_build_object('ok', true,
    'settings', (select jsonb_build_object('capacity', capacity, 'is_open', is_open,
                   'sessions', coalesce(sessions,'[]'::jsonb), 'schedule_note', schedule_note)
                 from public.cgma_ai_edu_2026_settings where id = 1),
    'rows', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.cgma_ai_edu_2026_applications a), '[]'::jsonb));
end $fn$;

-- Lets the public application page show the in-place "일정 수정" control only
-- to someone the server would accept. Never reveals anything else.
create or replace function public.cgma_ai_edu_2026_can_manage()
returns boolean
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if auth.uid() is null then return false; end if;
  return public.cgma_is_site_admin() or private.cgma_ai_edu_2026_is_roster_manager();
end $fn$;
revoke all on function public.cgma_ai_edu_2026_can_manage() from public, anon, authenticated;
grant execute on function public.cgma_ai_edu_2026_can_manage() to anon, authenticated;

-- Google-login only (no shared password): site admin or allowlisted roster manager.
create or replace function public.cgma_ai_edu_2026_admin_sessions(p_sessions jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare
  v_old jsonb; v_new jsonb := '[]'::jsonb; e jsonb; i int;
  v_no int; v_date date; v_start text; v_end text; v_title text; v_detail text;
  v_first date; v_last date; v_note text;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','login_required'); end if;
  if not (public.cgma_is_site_admin() or private.cgma_ai_edu_2026_is_roster_manager()) then
    return jsonb_build_object('ok',false,'error','denied');
  end if;
  if p_sessions is null or jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) <> 8 then
    return jsonb_build_object('ok',false,'error','invalid_sessions');
  end if;
  for i in 1..8 loop
    select x into e from jsonb_array_elements(p_sessions) x where (x->>'no') = i::text;
    if e is null then return jsonb_build_object('ok',false,'error','invalid_sessions'); end if;
    begin
      v_date := (e->>'date')::date;
    exception when others then
      return jsonb_build_object('ok',false,'error','invalid_date','no',i);
    end;
    if v_date is null or (e->>'date') !~ '^\d{4}-\d{2}-\d{2}$'
       or v_date < date '2026-01-01' or v_date > date '2027-12-31' then
      return jsonb_build_object('ok',false,'error','invalid_date','no',i);
    end if;
    v_start := coalesce(e->>'start',''); v_end := coalesce(e->>'end','');
    if v_start !~ '^([01]\d|2[0-3]):[0-5]\d$' or v_end !~ '^([01]\d|2[0-3]):[0-5]\d$' or v_end <= v_start then
      return jsonb_build_object('ok',false,'error','invalid_time','no',i);
    end if;
    v_title := btrim(coalesce(e->>'title','')); v_detail := btrim(coalesce(e->>'detail',''));
    if length(v_title) = 0 or length(v_title) > 60 or length(v_detail) > 120 then
      return jsonb_build_object('ok',false,'error','invalid_text','no',i);
    end if;
    if v_last is not null and v_date < v_last then
      return jsonb_build_object('ok',false,'error','order','no',i);
    end if;
    v_first := coalesce(v_first, v_date); v_last := v_date;
    v_new := v_new || jsonb_build_array(jsonb_build_object('no',i,'date',to_char(v_date,'YYYY-MM-DD'),
      'start',v_start,'end',v_end,'title',v_title,'detail',v_detail));
    e := null;
  end loop;
  v_note := nullif(btrim(coalesce(p_note,'')),'');
  if v_note is not null and length(v_note) > 300 then
    return jsonb_build_object('ok',false,'error','invalid_text');
  end if;

  select sessions into v_old from public.cgma_ai_edu_2026_settings where id = 1 for update;
  update public.cgma_ai_edu_2026_settings
     set sessions = v_new,
         schedule_note = case when p_note is null then schedule_note else v_note end,
         updated_at = now()
   where id = 1;

  -- Keep the 행사·참여 card in step with the real schedule.
  update public.cgma_programs set
    starts_on = v_first, ends_on = v_last,
    period_label = to_char(v_first,'FMMM.FMDD') || ' – ' || to_char(v_last,'FMMM.FMDD') || ' · 8회',
    updated_at = now()
  where slug = 'ai-marketing-2026';

  insert into public.cgma_admin_audit(actor, actor_kind, subject, subject_id, action, changes)
  values(auth.uid(),
    case when public.cgma_is_site_admin() then 'site_admin' else 'roster_manager' end,
    'ai_edu_2026','sessions','update_sessions',
    jsonb_build_object('from',v_old,'to',v_new,'note_changed',p_note is not null));
  return jsonb_build_object('ok',true,'sessions',v_new,
    'schedule_note',(select schedule_note from public.cgma_ai_edu_2026_settings where id = 1));
end $fn$;
revoke all on function public.cgma_ai_edu_2026_admin_sessions(jsonb,text) from public, anon, authenticated;
grant execute on function public.cgma_ai_edu_2026_admin_sessions(jsonb,text) to authenticated;
