alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'admin', 'user', 'agent', 'viewer'));

alter table public.signup_invites
  drop constraint if exists signup_invites_role_check;

alter table public.signup_invites
  add constraint signup_invites_role_check
  check (role in ('admin', 'user', 'agent', 'viewer'));

alter table public.profiles
  alter column role set default 'user';

create or replace function public.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_crm_admin() from public;
grant execute on function public.is_crm_admin() to authenticated;

create or replace function public.prevent_last_crm_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_count integer;
begin
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and old.role in ('owner', 'admin')
     and new.role not in ('owner', 'admin') then
    perform pg_advisory_xact_lock(hashtext('public.profiles.crm_admin_role')::bigint);

    select count(*)
      into v_admin_count
      from public.profiles
     where role in ('owner', 'admin')
       and id <> old.id;

    if v_admin_count = 0 then
      raise exception 'Cannot demote the last CRM administrator.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_last_crm_admin_removal on public.profiles;
create trigger prevent_last_crm_admin_removal
  before update of role on public.profiles
  for each row execute function public.prevent_last_crm_admin_removal();

drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all
  on public.leads
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists activities_admin_all on public.lead_activities;
create policy activities_admin_all
  on public.lead_activities
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists financing_admin_all on public.financing_applications;
create policy financing_admin_all
  on public.financing_applications
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists reservations_admin_all on public.reservations;
create policy reservations_admin_all
  on public.reservations
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists releases_admin_all on public.vehicle_releases;
create policy releases_admin_all
  on public.vehicle_releases
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists lost_sales_admin_all on public.lost_sales;
create policy lost_sales_admin_all
  on public.lost_sales
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists monthly_targets_admin_all on public.monthly_targets;
create policy monthly_targets_admin_all
  on public.monthly_targets
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists app_settings_admin_all on public.app_settings;
create policy app_settings_admin_all
  on public.app_settings
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists audit_logs_admin_all on public.audit_logs;
create policy audit_logs_admin_all
  on public.audit_logs
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists import_batches_admin_all on public.import_batches;
create policy import_batches_admin_all
  on public.import_batches
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
  on public.profiles
  for select to authenticated
  using (public.is_crm_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
  on public.profiles
  for update to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

-- Reconcile dropdown policies from 0002/0004.
-- 0004.dropdown_update_visible allowed any authenticated user to update global
-- (owner_id IS NULL) options. PostgreSQL permissive policies are OR-combined, so
-- we must remove/replace it; global/shared dropdown mutations are admin-only.
drop policy if exists dropdown_write on public.dropdown_options;
drop policy if exists dropdown_update_visible on public.dropdown_options;
drop policy if exists dropdown_read on public.dropdown_options;
drop policy if exists dropdown_insert_own on public.dropdown_options;
drop policy if exists dropdown_delete_own on public.dropdown_options;
drop policy if exists dropdown_options_admin_all on public.dropdown_options;

create policy dropdown_read
  on public.dropdown_options
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid() or public.is_crm_admin());

create policy dropdown_insert_own
  on public.dropdown_options
  for insert to authenticated
  with check (owner_id = auth.uid() and is_system = false);

create policy dropdown_update_own
  on public.dropdown_options
  for update to authenticated
  using (owner_id = auth.uid() and is_system = false)
  with check (owner_id = auth.uid() and is_system = false);

create policy dropdown_delete_own
  on public.dropdown_options
  for delete to authenticated
  using (owner_id = auth.uid() and is_system = false);

create policy dropdown_options_admin_all
  on public.dropdown_options
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());
