-- CGMA: education roster-only access for one verified EKODI Google-login email.
-- The central EKODI Google sign-in bridges to Supabase as a verified email OTP session.
-- This grants access ONLY to cgma_ai_edu_2026_admin_list/admin_update via check_pin.
-- It does not modify cgma_is_site_admin, tenant memberships, platform roles, or other RPCs.

create table if not exists private.cgma_ai_edu_2026_roster_allowlist (
  email text primary key,
  enabled boolean not null default true,
  granted_at timestamptz not null default now(),
  constraint cgma_ai_edu_2026_roster_email_lower check (email = lower(email))
);
alter table private.cgma_ai_edu_2026_roster_allowlist enable row level security;
revoke all on private.cgma_ai_edu_2026_roster_allowlist from public, anon, authenticated;
insert into private.cgma_ai_edu_2026_roster_allowlist(email, enabled)
values ('dlaehd12345619@gmail.com', true)
on conflict(email) do update set enabled = excluded.enabled;

create or replace function private.cgma_ai_edu_2026_is_roster_manager()
returns boolean
language sql stable security definer set search_path = ''
as $func$
  select auth.uid() is not null and exists (
    select 1 from auth.users u
    join private.cgma_ai_edu_2026_roster_allowlist a
      on a.email = lower(u.email) and a.enabled
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until <= now())
      and exists (
        select 1 from auth.identities i
        where i.user_id = u.id
          and lower(i.email) = lower(u.email)
          and i.provider in ('email','google')
      )
  );
$func$;
revoke all on function private.cgma_ai_edu_2026_is_roster_manager() from public, anon, authenticated;

-- Preserve site admins and the existing disabled-by-default password mechanism.
-- Google-login grant is independent and requires an authenticated verified email.
create or replace function public.cgma_ai_edu_2026_check_pin(p_pin text)
returns text
language plpgsql security definer set search_path = ''
as $func$
declare
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_key text;
  v_hash text;
begin
  if public.cgma_is_site_admin() then return 'ok'; end if;
  if private.cgma_ai_edu_2026_is_roster_manager() then return 'ok'; end if;
  if p_pin is null or length(p_pin) = 0 then return 'pin_required'; end if;
  if length(p_pin) > 128 then return 'invalid_pin'; end if;
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true),'')::jsonb,'{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ip := split_part(coalesce(nullif(v_headers->>'cf-connecting-ip',''),
            nullif(v_headers->>'x-forwarded-for',''),nullif(v_headers->>'x-real-ip',''),'unknown'),',',1);
  v_key := md5('cgma-ai-edu-2026:' || left(trim(v_ip),128));
  perform pg_advisory_xact_lock(hashtext('cgma-ai-edu-pin:' || v_key));
  if (select count(*) from public.cgma_ai_edu_2026_admin_attempts
      where attempt_key=v_key and ok=false and at>now()-interval '15 minutes') >= 5 then
    return 'locked';
  end if;
  select admin_hash into v_hash from public.cgma_ai_edu_2026_settings where id=1;
  if v_hash like '$2%' and extensions.crypt(p_pin,v_hash) = v_hash then
    return 'ok';
  end if;
  insert into public.cgma_ai_edu_2026_admin_attempts(ok,attempt_key) values(false,v_key);
  return 'invalid_pin';
end
$func$;
revoke all on function public.cgma_ai_edu_2026_check_pin(text) from public, anon, authenticated;

-- Keep detailed audit trace distinguishable from site-admin and shared-password actors.
alter table public.cgma_admin_audit
  drop constraint if exists cgma_admin_audit_actor_kind_check;
alter table public.cgma_admin_audit
  add constraint cgma_admin_audit_actor_kind_check
  check (actor_kind in ('site_admin','pin','roster_manager'));

create or replace function public.cgma_ai_edu_2026_admin_update(p_pin text, p_id uuid, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $func$
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
  insert into public.cgma_admin_audit(actor, actor_kind, subject, subject_id, action, changes)
  values(auth.uid(),
       case when public.cgma_is_site_admin() then 'site_admin'
            when private.cgma_ai_edu_2026_is_roster_manager() then 'roster_manager'
            else 'pin' end,
       'ai_edu_2026', coalesce(p_id::text,'settings'), 'update', p_patch - 'admin_memo');
  return jsonb_build_object('ok', true);
exception when check_violation or invalid_text_representation then
  return jsonb_build_object('ok', false, 'error', 'invalid');
end
$func$;
