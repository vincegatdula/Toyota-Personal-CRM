-- ============================================================================
-- 0007_lead_reassignment.sql
--
-- Admin-only transactional lead reassignment. Updates lead and all related
-- CRM records owned by the reassigned lead context in a single function call.
-- Audit triggers on affected tables record row changes (changed_by = auth.uid()).
-- An explicit lead activity is also written for timeline visibility.
-- ============================================================================
create or replace function public.admin_reassign_lead(
  p_lead_id uuid,
  p_new_owner_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_lead record;
  v_new_owner record;
  v_counts jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not public.is_crm_admin() then
    raise exception 'Only CRM administrators can reassign leads.' using errcode = '42501';
  end if;

  select id, owner_id, prospect_name, lead_code
    into v_lead
    from public.leads
   where id = p_lead_id
   for update;

  if v_lead.id is null then
    raise exception 'Lead not found.' using errcode = 'P0002';
  end if;

  select id, full_name, email, role
    into v_new_owner
    from public.profiles
   where id = p_new_owner_id;

  if v_new_owner.id is null then
    raise exception 'Target user profile not found.' using errcode = 'P0002';
  end if;

  if v_lead.owner_id = p_new_owner_id then
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'lead_id', v_lead.id,
      'owner_id', p_new_owner_id
    );
  end if;

  update public.leads
     set owner_id = p_new_owner_id,
         updated_at = now()
   where id = p_lead_id;

  update public.lead_activities
     set owner_id = p_new_owner_id
   where lead_id = p_lead_id;

  update public.financing_applications
     set owner_id = p_new_owner_id
   where lead_id = p_lead_id;

  update public.reservations
     set owner_id = p_new_owner_id
   where lead_id = p_lead_id;

  update public.vehicle_releases
     set owner_id = p_new_owner_id
   where lead_id = p_lead_id;

  update public.lost_sales
     set owner_id = p_new_owner_id
   where lead_id = p_lead_id;

  insert into public.lead_activities (
    lead_id,
    owner_id,
    activity_type,
    activity_at,
    summary,
    notes,
    outcome,
    created_by
  ) values (
    p_lead_id,
    p_new_owner_id,
    'Status change',
    now(),
    'Lead reassigned by administrator',
    concat_ws(
      E'\n',
      'Previous owner: ' || v_lead.owner_id::text,
      'New owner: ' || coalesce(v_new_owner.full_name, v_new_owner.email, p_new_owner_id::text),
      nullif(trim(coalesce(p_note, '')), '')
    ),
    'Reassigned',
    v_actor
  );

  v_counts := jsonb_build_object(
    'lead', 1,
    'activities', (select count(*) from public.lead_activities where lead_id = p_lead_id),
    'financing', (select count(*) from public.financing_applications where lead_id = p_lead_id),
    'reservations', (select count(*) from public.reservations where lead_id = p_lead_id),
    'releases', (select count(*) from public.vehicle_releases where lead_id = p_lead_id),
    'lost_sales', (select count(*) from public.lost_sales where lead_id = p_lead_id)
  );

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'lead_id', v_lead.id,
    'lead_code', v_lead.lead_code,
    'previous_owner_id', v_lead.owner_id,
    'owner_id', p_new_owner_id,
    'counts', v_counts
  );
end;
$$;

revoke all on function public.admin_reassign_lead(uuid, uuid, text) from public;
grant execute on function public.admin_reassign_lead(uuid, uuid, text) to authenticated;
