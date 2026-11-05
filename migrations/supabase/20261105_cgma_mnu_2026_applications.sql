-- 2026 MNU Accelerator / MNU 특공대 1기: contact-only intake.
-- Personal data belongs to private schema, never Data API table access.
create schema if not exists private;
create table if not exists private.cgma_mnu_2026_applications (
  id uuid primary key default gen_random_uuid(),
  store_name text not null check (char_length(btrim(store_name)) between 2 and 80),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  phone text not null check (phone ~ '^01[016789][0-9]{7,8}$'),
  consent_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp()
);
create unique index if not exists cgma_mnu_2026_unique_person
  on private.cgma_mnu_2026_applications(lower(name),phone);
create index if not exists cgma_mnu_2026_created
  on private.cgma_mnu_2026_applications(created_at desc);
revoke all on private.cgma_mnu_2026_applications from public, anon, authenticated;

create or replace function public.cgma_mnu_2026_apply(
  p_store_name text,p_name text,p_phone text,p_privacy_ack boolean
) returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare
  v_store text:=pg_catalog.btrim(coalesce(p_store_name,''));
  v_name text:=pg_catalog.btrim(coalesce(p_name,''));
  v_phone text:=pg_catalog.regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
begin
  if (pg_catalog.clock_timestamp() at time zone 'Asia/Seoul') > timestamp '2026-11-10 23:59:59'
    then return pg_catalog.jsonb_build_object('ok',false,'error','closed'); end if;
  if p_privacy_ack is distinct from true
    then return pg_catalog.jsonb_build_object('ok',false,'error','consent_required'); end if;
  if pg_catalog.char_length(v_store) not between 2 and 80 or
     pg_catalog.char_length(v_name) not between 2 and 40 or
     v_phone !~ '^01[016789][0-9]{7,8}$'
    then return pg_catalog.jsonb_build_object('ok',false,'error','invalid'); end if;
  insert into private.cgma_mnu_2026_applications(store_name,name,phone)
    values(v_store,v_name,v_phone);
  return pg_catalog.jsonb_build_object('ok',true,'saved',true);
exception when unique_violation then
  return pg_catalog.jsonb_build_object('ok',false,'error','duplicate');
end;
$fn$;
revoke all on function public.cgma_mnu_2026_apply(text,text,text,boolean) from public;
grant execute on function public.cgma_mnu_2026_apply(text,text,text,boolean) to anon,authenticated;

create or replace function public.cgma_mnu_2026_admin_list()
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
begin
  if auth.uid() is null or public.cgma_is_site_admin() is distinct from true
    then return pg_catalog.jsonb_build_object('ok',false,'error','tenant_admin_required'); end if;
  return (
    select pg_catalog.jsonb_build_object(
      'ok',true,
      'total',count(*),
      'rows',coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'store_name',store_name,'name',name,'phone',phone,
            'created_at',created_at
          ) order by created_at desc
        ),'[]'::jsonb)
    ) from private.cgma_mnu_2026_applications
  );
end;
$fn$;
revoke all on function public.cgma_mnu_2026_admin_list() from public,anon;
grant execute on function public.cgma_mnu_2026_admin_list() to authenticated;
comment on table private.cgma_mnu_2026_applications is
  'CGMA 2026 MNU application contacts; consented through 2027-11-10, remove on withdrawal or retention expiration';
notify pgrst, 'reload schema';
