-- CGMA AI education roster-scoped passcode authentication.
-- Deliberately no password or password hash in source control.
-- Provision admin_hash via an authorized secret-management flow.
-- This change does not grant any tenant/site/global administration privileges.
alter table public.cgma_ai_edu_2026_admin_attempts
  add column if not exists attempt_key text not null default 'legacy';

create index if not exists cgma_ai_edu_2026_admin_attempts_key_time_idx
  on public.cgma_ai_edu_2026_admin_attempts(attempt_key, at desc)
  where ok = false;

create or replace function public.cgma_ai_edu_2026_check_pin(p_pin text)
returns text language plpgsql security definer set search_path = ''
as $func$
declare
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_key text;
  v_hash text;
begin
  if public.cgma_is_site_admin() then return 'ok'; end if;
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
  if v_hash like '$2%' and extensions.crypt(p_pin,v_hash) = v_hash then return 'ok'; end if;
  insert into public.cgma_ai_edu_2026_admin_attempts(ok,attempt_key) values(false,v_key);
  return 'invalid_pin';
end
$func$;
revoke all on function public.cgma_ai_edu_2026_check_pin(text) from public, anon, authenticated;
