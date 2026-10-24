-- CGMA AI education: atomic bulk status updates for an authenticated roster manager.
-- The only granted entry point is this narrow RPC, which reuses check_pin's
-- scoped Google-roster authorization and existing CGMA site-admin authorization.
create or replace function public.cgma_ai_edu_2026_admin_bulk_status(
  p_pin text,
  p_ids uuid[],
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_auth text;
  v_selected integer;
  v_found integer;
  v_changed integer;
  v_actor_kind text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok',false,'error','login_required');
  end if;
  v_auth := public.cgma_ai_edu_2026_check_pin(p_pin);
  if v_auth <> 'ok' then
    return jsonb_build_object('ok',false,'error',v_auth);
  end if;
  if p_status is null or p_status not in ('접수','확정','대기','취소') then
    return jsonb_build_object('ok',false,'error','invalid_status');
  end if;
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) > 100
    or array_position(p_ids,null) is not null then
    return jsonb_build_object('ok',false,'error','invalid_selection');
  end if;
  select count(distinct id) into v_selected from unnest(p_ids) as x(id);
  if v_selected <> cardinality(p_ids) then
    return jsonb_build_object('ok',false,'error','duplicate_selection');
  end if;

  -- A single transaction locks the selected applicants and rejects stale IDs
  -- before changing any row. Roll back every change if audit insertion fails.
  select count(*) into v_found from (
    select id from public.cgma_ai_edu_2026_applications
    where id = any(p_ids)
    for update
  ) locked;
  if v_found <> v_selected then
    return jsonb_build_object('ok',false,'error','not_found');
  end if;

  v_actor_kind := case
    when public.cgma_is_site_admin() then 'site_admin'
    when private.cgma_ai_edu_2026_is_roster_manager() then 'roster_manager'
    else 'pin' end;
  with targets as (
    select id, status as old_status
    from public.cgma_ai_edu_2026_applications
    where id = any(p_ids) and status is distinct from p_status
  ),
  changed as (
    update public.cgma_ai_edu_2026_applications a
    set status = p_status, updated_at = now()
    from targets t
    where a.id = t.id
    returning a.id,t.old_status
  )
  insert into public.cgma_admin_audit(actor,actor_kind,subject,subject_id,action,changes)
  select auth.uid(),v_actor_kind,'ai_edu_2026',c.id::text,'bulk_status_update',
         jsonb_build_object('from',c.old_status,'to',p_status)
  from changed c;
  get diagnostics v_changed = row_count;
  return jsonb_build_object('ok',true,'selected',v_selected,'changed',v_changed,'status',p_status);
end
$fn$;
revoke all on function public.cgma_ai_edu_2026_admin_bulk_status(text,uuid[],text)
  from public,anon,authenticated;
grant execute on function public.cgma_ai_edu_2026_admin_bulk_status(text,uuid[],text)
  to authenticated;
