-- 2026 축제 쿠폰 상가: 관리자 일괄접수 · 일괄 승인 · 선택항목 외부공유 · 관리자 작업 로그
-- Target: EKODI production Supabase (renzehysxirjilvdxacv), used only through the
-- cgma-festival-intake Edge Function with the service role.
--
-- ADDITIVE ONLY. Existing applicant rows are never updated, deleted or overwritten:
--  * new columns get defaults that describe how the existing rows were collected (web form);
--  * bulk import inserts with ON CONFLICT DO NOTHING against the existing unique index;
--  * the intake guard keeps its behaviour for public submissions.

alter table public.cgma_festival_2026_coupon_merchant
  add column if not exists intake_source text not null default 'web',
  add column if not exists consent_basis text not null default 'web_form',
  add column if not exists import_batch uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='cgma_festival_2026_coupon_intake_source_check') then
    alter table public.cgma_festival_2026_coupon_merchant add constraint cgma_festival_2026_coupon_intake_source_check
      check (intake_source in ('web','admin_bulk'));
  end if;
  if not exists (select 1 from pg_constraint where conname='cgma_festival_2026_coupon_consent_basis_check') then
    alter table public.cgma_festival_2026_coupon_merchant add constraint cgma_festival_2026_coupon_consent_basis_check
      check (consent_basis in ('web_form','admin_attested_offline'));
  end if;
end $$;

-- Admin bulk intake records applications collected offline, so it is not blocked by the public
-- open/closed switch. Public (web) submissions keep exactly the previous rule.
create or replace function public.cgma_festival_2026_accept_guard()
returns trigger language plpgsql set search_path to 'public' as $function$
declare enabled boolean;
begin
  if TG_TABLE_NAME='cgma_festival_2026_coupon_merchant' and (to_jsonb(NEW)->>'intake_source')='admin_bulk' then
    return NEW;
  end if;
  if TG_TABLE_NAME='cgma_festival_2026_booth' then
    select booth_open into enabled from public.cgma_festival_2026_settings where event_id=NEW.event_id for share;
  else
    select coupon_open into enabled from public.cgma_festival_2026_settings where event_id=NEW.event_id for share;
  end if;
  if enabled is distinct from true then raise exception 'festival_intake_closed' using errcode='P0001'; end if;
  return NEW;
end $function$;

create table if not exists public.cgma_festival_2026_admin_log(
  id bigint generated always as identity primary key,
  event_id text not null default 'cgma-du-dream-2026' references public.cgma_festival_2026_settings(event_id),
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null check (length(action) between 1 and 40),
  target_count integer not null default 0,
  -- Never applicant contact data: ids, counts, states and field names only.
  detail jsonb not null default '{}'::jsonb
);
create index if not exists cgma_festival_2026_admin_log_at on public.cgma_festival_2026_admin_log(at desc);

create table if not exists public.cgma_festival_2026_import_batch(
  idempotency_key uuid primary key,
  event_id text not null default 'cgma-du-dream-2026' references public.cgma_festival_2026_settings(event_id),
  actor_id uuid,
  actor_email text,
  created_at timestamptz not null default now(),
  row_count integer not null default 0,
  created_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  result jsonb not null default '{}'::jsonb
);

create table if not exists public.cgma_festival_2026_share(
  id uuid primary key default gen_random_uuid(),
  event_id text not null default 'cgma-du-dream-2026' references public.cgma_festival_2026_settings(event_id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (length(trim(label)) between 1 and 80),
  fields text[] not null check (
    cardinality(fields) between 1 and 6
    and fields <@ array['shop_name','location_text','phone','items','created_at','review_state']::text[]
  ),
  receipts uuid[] not null check (cardinality(receipts) between 1 and 500),
  includes_pii boolean generated always as (fields && array['phone','location_text']::text[]) stored,
  pii_basis text check (pii_basis is null or length(trim(pii_basis)) between 5 and 300),
  password_salt text,
  password_hash text,
  allow_download boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by_id uuid,
  created_by_email text,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  check ((password_hash is null) = (password_salt is null)),
  check (expires_at > created_at and expires_at <= created_at + interval '30 days'),
  -- Personal data (연락처·상가 주소) needs a recorded legal basis, a password and a short life.
  check (not includes_pii or (pii_basis is not null and password_hash is not null and expires_at <= created_at + interval '7 days'))
);

create table if not exists public.cgma_festival_2026_share_access(
  id bigint generated always as identity primary key,
  share_id uuid not null references public.cgma_festival_2026_share(id) on delete cascade,
  at timestamptz not null default now(),
  outcome text not null check (outcome in ('ok','password_required','password_invalid','locked','expired','revoked'))
);
create index if not exists cgma_festival_2026_share_access_share on public.cgma_festival_2026_share_access(share_id, at desc);

alter table public.cgma_festival_2026_admin_log enable row level security;
alter table public.cgma_festival_2026_import_batch enable row level security;
alter table public.cgma_festival_2026_share enable row level security;
alter table public.cgma_festival_2026_share_access enable row level security;
revoke all on public.cgma_festival_2026_admin_log, public.cgma_festival_2026_import_batch,
  public.cgma_festival_2026_share, public.cgma_festival_2026_share_access from anon, authenticated;

-- Bulk intake: validate, classify against existing applicants, optionally insert.
-- p_rows: [{"i":row_no,"shop":"","phone":"","location":"","items":"","confirm":bool}]
-- Statuses: ready | needs_confirm | duplicate_existing | duplicate_in_file | invalid
--           (commit) created | skipped | failed
create or replace function public.cgma_festival_2026_coupon_import(
  p_key uuid, p_rows jsonb, p_commit boolean, p_actor_id uuid, p_actor_email text
) returns jsonb language plpgsql set search_path to 'public' as $function$
declare
  r jsonb; out_rows jsonb := '[]'::jsonb; stored jsonb;
  v_i int; v_shop text; v_phone text; v_loc text; v_items text; v_confirm boolean;
  v_status text; v_reason text; v_match jsonb; v_receipt uuid; seen jsonb := '{}'::jsonb;
  n_total int := 0; n_ready int := 0; n_confirm int := 0; n_dup int := 0; n_invalid int := 0;
  n_created int := 0; n_skipped int := 0; n_failed int := 0; result jsonb;
begin
  if p_key is null then raise exception 'idempotency_key_required'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'rows_required'; end if;
  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then raise exception 'row_limit'; end if;

  if p_commit then
    perform pg_advisory_xact_lock(hashtextextended(p_key::text, 20261023));
    select b.result into stored from public.cgma_festival_2026_import_batch b where b.idempotency_key=p_key;
    if found then return stored || jsonb_build_object('replay', true); end if;
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    n_total := n_total + 1;
    v_i := coalesce(nullif(r->>'i','')::int, n_total);
    v_shop := btrim(coalesce(r->>'shop',''));
    v_phone := regexp_replace(coalesce(r->>'phone',''), '[\s().-]', '', 'g');
    v_loc := btrim(coalesce(r->>'location',''));
    v_items := btrim(coalesce(r->>'items',''));
    v_confirm := coalesce((r->>'confirm')::boolean, false);
    v_status := 'ready'; v_reason := null; v_match := null; v_receipt := null;

    if v_shop = '' or length(v_shop) > 80 then v_status := 'invalid'; v_reason := 'shop';
    elsif v_phone !~ '^0[0-9]{8,10}$' then v_status := 'invalid'; v_reason := 'phone';
    elsif v_loc = '' or length(v_loc) > 200 then v_status := 'invalid'; v_reason := 'location';
    elsif v_items = '' or length(v_items) > 500 then v_status := 'invalid'; v_reason := 'items';
    elsif seen ? (lower(v_shop) || '|' || v_phone) then v_status := 'duplicate_in_file'; v_reason := 'same_shop_phone';
    else
      select jsonb_build_object('receipt',c.receipt,'shop_name',c.shop_name,'phone',c.phone,'review_state',c.review_state)
        into v_match from public.cgma_festival_2026_coupon_merchant c
       where c.event_id='cgma-du-dream-2026' and lower(c.shop_name)=lower(v_shop) and c.phone=v_phone limit 1;
      if v_match is not null then v_status := 'duplicate_existing'; v_reason := 'same_shop_phone';
      else
        select jsonb_build_object('receipt',c.receipt,'shop_name',c.shop_name,'phone',c.phone,'review_state',c.review_state,
                                  'reason',case when c.phone=v_phone then 'same_phone' else 'same_shop' end)
          into v_match from public.cgma_festival_2026_coupon_merchant c
         where c.event_id='cgma-du-dream-2026' and (c.phone=v_phone or lower(c.shop_name)=lower(v_shop)) limit 1;
        if v_match is null and (seen ? ('phone|' || v_phone) or seen ? ('shop|' || lower(v_shop))) then
          v_match := jsonb_build_object('reason', case when seen ? ('phone|' || v_phone) then 'same_phone_in_file' else 'same_shop_in_file' end);
        end if;
        if v_match is not null then
          v_reason := v_match->>'reason';
          v_status := case when v_confirm then 'ready' else 'needs_confirm' end;
        end if;
      end if;
    end if;

    if v_status not in ('invalid') then
      seen := seen || jsonb_build_object(lower(v_shop) || '|' || v_phone, true, 'phone|' || v_phone, true, 'shop|' || lower(v_shop), true);
    end if;

    if p_commit then
      if v_status = 'ready' then
        insert into public.cgma_festival_2026_coupon_merchant
          (event_id, shop_name, phone, location_text, items, privacy_consented_at, intake_source, consent_basis, import_batch)
        values ('cgma-du-dream-2026', v_shop, v_phone, v_loc, v_items, now(), 'admin_bulk', 'admin_attested_offline', p_key)
        on conflict do nothing returning receipt into v_receipt;
        if v_receipt is null then v_status := 'skipped'; v_reason := 'same_shop_phone'; n_skipped := n_skipped + 1;
        else v_status := 'created'; n_created := n_created + 1; end if;
      elsif v_status = 'invalid' then n_failed := n_failed + 1;
      else v_status := 'skipped'; n_skipped := n_skipped + 1;
      end if;
    else
      case v_status
        when 'ready' then n_ready := n_ready + 1;
        when 'needs_confirm' then n_confirm := n_confirm + 1;
        when 'invalid' then n_invalid := n_invalid + 1;
        else n_dup := n_dup + 1;
      end case;
    end if;

    out_rows := out_rows || jsonb_build_object('i', v_i, 'status', v_status, 'reason', v_reason,
      'receipt', v_receipt, 'match', v_match);
  end loop;

  if p_commit then
    result := jsonb_build_object('ok', true, 'committed', true, 'replay', false, 'key', p_key,
      'summary', jsonb_build_object('total', n_total, 'created', n_created, 'skipped', n_skipped, 'failed', n_failed),
      'rows', out_rows);
    insert into public.cgma_festival_2026_import_batch(idempotency_key, actor_id, actor_email, row_count, created_count, skipped_count, failed_count, result)
      values (p_key, p_actor_id, p_actor_email, n_total, n_created, n_skipped, n_failed, result);
    insert into public.cgma_festival_2026_admin_log(actor_id, actor_email, action, target_count, detail)
      values (p_actor_id, p_actor_email, 'bulk_import', n_created,
              jsonb_build_object('batch', p_key, 'total', n_total, 'created', n_created, 'skipped', n_skipped, 'failed', n_failed));
    return result;
  end if;
  return jsonb_build_object('ok', true, 'committed', false, 'key', p_key,
    'summary', jsonb_build_object('total', n_total, 'ready', n_ready, 'needs_confirm', n_confirm, 'duplicate', n_dup, 'invalid', n_invalid),
    'rows', out_rows);
end $function$;

-- Single or bulk review. Only review_state/updated_at change; returns found/changed counts.
create or replace function public.cgma_festival_2026_coupon_review(
  p_receipts uuid[], p_state text, p_actor_id uuid, p_actor_email text
) returns jsonb language plpgsql set search_path to 'public' as $function$
declare v_found int; v_changed int;
begin
  if p_state not in ('pending','approved','rejected') then raise exception 'invalid_state'; end if;
  if p_receipts is null or cardinality(p_receipts) < 1 or cardinality(p_receipts) > 500 then raise exception 'receipt_limit'; end if;
  select count(*) into v_found from public.cgma_festival_2026_coupon_merchant
   where event_id='cgma-du-dream-2026' and receipt = any(p_receipts);
  with changed as (
    update public.cgma_festival_2026_coupon_merchant set review_state=p_state, updated_at=now()
     where event_id='cgma-du-dream-2026' and receipt = any(p_receipts) and review_state <> p_state
    returning 1)
  select count(*) into v_changed from changed;
  insert into public.cgma_festival_2026_admin_log(actor_id, actor_email, action, target_count, detail)
    values (p_actor_id, p_actor_email, case when cardinality(p_receipts)=1 then 'review' else 'bulk_review' end, v_changed,
            jsonb_build_object('state', p_state, 'requested', cardinality(p_receipts), 'found', v_found, 'changed', v_changed));
  return jsonb_build_object('ok', true, 'found', v_found, 'changed', v_changed);
end $function$;

-- Share access bookkeeping (atomic counters + lockout after 10 wrong passwords for 15 minutes).
create or replace function public.cgma_festival_2026_share_record(p_id uuid, p_outcome text)
returns jsonb language plpgsql set search_path to 'public' as $function$
declare v_locked timestamptz;
begin
  insert into public.cgma_festival_2026_share_access(share_id, outcome) values (p_id, p_outcome);
  if p_outcome = 'ok' then
    update public.cgma_festival_2026_share set view_count=view_count+1, last_viewed_at=now(), failed_attempts=0 where id=p_id;
  elsif p_outcome = 'password_invalid' then
    update public.cgma_festival_2026_share
       set failed_attempts=failed_attempts+1,
           locked_until=case when failed_attempts+1 >= 10 then now() + interval '15 minutes' else locked_until end
     where id=p_id returning locked_until into v_locked;
  end if;
  return jsonb_build_object('ok', true, 'locked_until', v_locked);
end $function$;

-- Share creation keeps only receipts that exist for this event and records the action.
create or replace function public.cgma_festival_2026_share_create(
  p_token_hash text, p_label text, p_fields text[], p_receipts uuid[], p_days integer, p_pii_basis text,
  p_salt text, p_hash text, p_allow_download boolean, p_actor_id uuid, p_actor_email text
) returns jsonb language plpgsql set search_path to 'public' as $function$
declare v_receipts uuid[]; v_id uuid; v_exp timestamptz; v_pii boolean;
begin
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'invalid_expiry'; end if;
  select array_agg(c.receipt order by c.created_at) into v_receipts from public.cgma_festival_2026_coupon_merchant c
   where c.event_id='cgma-du-dream-2026' and c.receipt = any(p_receipts);
  if v_receipts is null then raise exception 'no_matching_applicants'; end if;
  insert into public.cgma_festival_2026_share(token_hash, label, fields, receipts, pii_basis, password_salt, password_hash,
      allow_download, expires_at, created_by_id, created_by_email)
    values (p_token_hash, btrim(p_label), p_fields, v_receipts, nullif(btrim(coalesce(p_pii_basis,'')),''), p_salt, p_hash,
      coalesce(p_allow_download,false), now() + make_interval(days => p_days), p_actor_id, p_actor_email)
    returning id, expires_at, includes_pii into v_id, v_exp, v_pii;
  insert into public.cgma_festival_2026_admin_log(actor_id, actor_email, action, target_count, detail)
    values (p_actor_id, p_actor_email, 'share_create', cardinality(v_receipts),
            jsonb_build_object('share', v_id, 'fields', p_fields, 'includes_pii', v_pii, 'expires_at', v_exp,
                               'password', p_hash is not null, 'download', coalesce(p_allow_download,false)));
  return jsonb_build_object('ok', true, 'id', v_id, 'count', cardinality(v_receipts), 'expires_at', v_exp, 'includes_pii', v_pii);
end $function$;

create or replace function public.cgma_festival_2026_share_revoke(p_id uuid, p_actor_id uuid, p_actor_email text)
returns jsonb language plpgsql set search_path to 'public' as $function$
declare v_changed int;
begin
  with changed as (update public.cgma_festival_2026_share set revoked_at=now() where id=p_id and revoked_at is null returning 1)
  select count(*) into v_changed from changed;
  if v_changed > 0 then
    insert into public.cgma_festival_2026_admin_log(actor_id, actor_email, action, target_count, detail)
      values (p_actor_id, p_actor_email, 'share_revoke', 1, jsonb_build_object('share', p_id));
  end if;
  return jsonb_build_object('ok', true, 'revoked', v_changed > 0);
end $function$;

-- The only data path for a share viewer: returns exactly the share's fields, for its receipts,
-- while it is neither revoked nor expired. Field projection is enforced here, not in the client.
create or replace function public.cgma_festival_2026_share_rows(p_id uuid)
returns jsonb language sql stable set search_path to 'public' as $function$
  select coalesce(jsonb_agg(
           (select jsonb_object_agg(f, to_jsonb(c)->f) from unnest(s.fields) as f)
           order by c.created_at), '[]'::jsonb)
    from public.cgma_festival_2026_share s
    join public.cgma_festival_2026_coupon_merchant c on c.receipt = any(s.receipts) and c.event_id = s.event_id
   where s.id = p_id and s.revoked_at is null and s.expires_at > now();
$function$;

revoke all on function public.cgma_festival_2026_share_create(text, text, text[], uuid[], integer, text, text, text, boolean, uuid, text) from public, anon, authenticated;
revoke all on function public.cgma_festival_2026_share_revoke(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cgma_festival_2026_share_rows(uuid) from public, anon, authenticated;
grant execute on function public.cgma_festival_2026_share_create(text, text, text[], uuid[], integer, text, text, text, boolean, uuid, text) to service_role;
grant execute on function public.cgma_festival_2026_share_revoke(uuid, uuid, text) to service_role;
grant execute on function public.cgma_festival_2026_share_rows(uuid) to service_role;

revoke all on function public.cgma_festival_2026_coupon_import(uuid, jsonb, boolean, uuid, text) from public, anon, authenticated;
revoke all on function public.cgma_festival_2026_coupon_review(uuid[], text, uuid, text) from public, anon, authenticated;
revoke all on function public.cgma_festival_2026_share_record(uuid, text) from public, anon, authenticated;
grant execute on function public.cgma_festival_2026_coupon_import(uuid, jsonb, boolean, uuid, text) to service_role;
grant execute on function public.cgma_festival_2026_coupon_review(uuid[], text, uuid, text) to service_role;
grant execute on function public.cgma_festival_2026_share_record(uuid, text) to service_role;
grant select, insert, update on public.cgma_festival_2026_admin_log, public.cgma_festival_2026_import_batch,
  public.cgma_festival_2026_share, public.cgma_festival_2026_share_access to service_role;
