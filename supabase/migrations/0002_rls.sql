-- ============================================================================
-- Row Level Security
-- Private single-owner CRM today, owner-scoped by design for future users.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.financing_applications enable row level security;
alter table public.reservations enable row level security;
alter table public.vehicle_releases enable row level security;
alter table public.lost_sales enable row level security;
alter table public.dropdown_options enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.monthly_targets enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.import_batches enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- leads ----------------------------------------------------------------------
drop policy if exists leads_owner_all on public.leads;
create policy leads_owner_all on public.leads
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- lead_activities ------------------------------------------------------------
drop policy if exists activities_owner_all on public.lead_activities;
create policy activities_owner_all on public.lead_activities
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- financing_applications -----------------------------------------------------
drop policy if exists financing_owner_all on public.financing_applications;
create policy financing_owner_all on public.financing_applications
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- reservations ---------------------------------------------------------------
drop policy if exists reservations_owner_all on public.reservations;
create policy reservations_owner_all on public.reservations
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- vehicle_releases -----------------------------------------------------------
drop policy if exists releases_owner_all on public.vehicle_releases;
create policy releases_owner_all on public.vehicle_releases
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- lost_sales -----------------------------------------------------------------
drop policy if exists lost_owner_all on public.lost_sales;
create policy lost_owner_all on public.lost_sales
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- dropdown_options -----------------------------------------------------------
drop policy if exists dropdown_read on public.dropdown_options;
create policy dropdown_read on public.dropdown_options
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists dropdown_write on public.dropdown_options;
create policy dropdown_write on public.dropdown_options
  for all to authenticated
  using (owner_id is null or owner_id = auth.uid())
  with check (owner_id is null or owner_id = auth.uid());

-- vehicle_models -------------------------------------------------------------
drop policy if exists models_read on public.vehicle_models;
create policy models_read on public.vehicle_models
  for select to authenticated using (true);

drop policy if exists models_write on public.vehicle_models;
create policy models_write on public.vehicle_models
  for all to authenticated using (true) with check (true);

-- monthly_targets ------------------------------------------------------------
drop policy if exists targets_read on public.monthly_targets;
create policy targets_read on public.monthly_targets
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists targets_write on public.monthly_targets;
create policy targets_write on public.monthly_targets
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- app_settings ---------------------------------------------------------------
drop policy if exists settings_owner_all on public.app_settings;
create policy settings_owner_all on public.app_settings
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- audit_logs -----------------------------------------------------------------
drop policy if exists audit_read_own on public.audit_logs;
create policy audit_read_own on public.audit_logs
  for select to authenticated using (owner_id = auth.uid());

-- import_batches -------------------------------------------------------------
drop policy if exists import_owner_all on public.import_batches;
create policy import_owner_all on public.import_batches
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
