-- ============================================================================
-- Personal Toyota CRM — core schema
-- Readable IDs are generated from sequences so they are never reused.
-- ============================================================================

create extension if not exists "pgcrypto";

create sequence if not exists lead_code_seq start with 1 increment by 1;
create sequence if not exists financing_code_seq start with 1 increment by 1;
create sequence if not exists reservation_code_seq start with 1 increment by 1;
create sequence if not exists release_code_seq start with 1 increment by 1;
create sequence if not exists lost_code_seq start with 1 increment by 1;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'agent', 'viewer')),
  title text,
  status text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text not null unique
    default ('C' || lpad(nextval('lead_code_seq')::text, 4, '0')),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date_created date not null default current_date,
  lead_source text,
  prospect_name text not null,
  preferred_model text,
  transaction text,
  sales_channel text,
  purchase_timeline date,
  pipeline_status text not null default 'New Prospect',
  last_contact_date date,
  next_action text,
  next_action_due_date date,
  next_action_completed_at timestamptz,
  contact_number text,
  email text,
  location text,
  remarks text,
  is_archived boolean not null default false,
  lost_at timestamptz,
  legacy_key text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_owner_idx on public.leads (owner_id);
create index if not exists leads_date_created_idx on public.leads (date_created);
create index if not exists leads_status_idx on public.leads (pipeline_status);
create index if not exists leads_source_idx on public.leads (lead_source);
create index if not exists leads_model_idx on public.leads (preferred_model);
create index if not exists leads_name_idx on public.leads (lower(prospect_name));
create index if not exists leads_contact_idx on public.leads (contact_number);
create index if not exists leads_next_due_idx on public.leads (next_action_due_date);
create index if not exists leads_archived_idx on public.leads (is_archived);
create unique index if not exists leads_legacy_key_unique
  on public.leads (owner_id, legacy_key)
  where legacy_key is not null;

-- ----------------------------------------------------------------------------
-- lead_activities
-- ----------------------------------------------------------------------------
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_type text not null,
  activity_at timestamptz not null default now(),
  summary text,
  notes text,
  outcome text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_idx
  on public.lead_activities (lead_id, activity_at desc);
create index if not exists lead_activities_owner_idx
  on public.lead_activities (owner_id);

-- ----------------------------------------------------------------------------
-- financing_applications
-- ----------------------------------------------------------------------------
create table if not exists public.financing_applications (
  id uuid primary key default gen_random_uuid(),
  financing_code text not null unique
    default ('F' || lpad(nextval('financing_code_seq')::text, 4, '0')),
  lead_id uuid not null references public.leads (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date_submitted date,
  lead_source text,
  preferred_model text,
  bank text,
  application_status text not null default 'Application submitted',
  date_approval date,
  approved_dp numeric(14, 4),
  date_released date,
  remarks text,
  legacy_key text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financing_approval_after_submission
    check (date_approval is null or date_submitted is null or date_approval >= date_submitted)
);

create index if not exists financing_lead_idx on public.financing_applications (lead_id);
create index if not exists financing_owner_idx on public.financing_applications (owner_id);
create index if not exists financing_submitted_idx on public.financing_applications (date_submitted);
create index if not exists financing_status_idx on public.financing_applications (application_status);
create index if not exists financing_bank_idx on public.financing_applications (bank);
create index if not exists financing_approval_idx on public.financing_applications (date_approval);
create unique index if not exists financing_legacy_key_unique
  on public.financing_applications (owner_id, legacy_key)
  where legacy_key is not null;

-- ----------------------------------------------------------------------------
-- reservations
-- ----------------------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique
    default ('R' || lpad(nextval('reservation_code_seq')::text, 4, '0')),
  lead_id uuid not null references public.leads (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reservation_date date not null default current_date,
  reserved_model text,
  sales_channel text,
  current_status text not null default 'Reserved',
  expected_release_date date,
  last_customer_update text,
  next_action text,
  remarks text,
  legacy_key text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_lead_idx on public.reservations (lead_id);
create index if not exists reservations_owner_idx on public.reservations (owner_id);
create index if not exists reservations_date_idx on public.reservations (reservation_date);
create index if not exists reservations_status_idx on public.reservations (current_status);
create index if not exists reservations_expected_idx on public.reservations (expected_release_date);
create unique index if not exists reservations_legacy_key_unique
  on public.reservations (owner_id, legacy_key)
  where legacy_key is not null;

-- ----------------------------------------------------------------------------
-- vehicle_releases
-- ----------------------------------------------------------------------------
create table if not exists public.vehicle_releases (
  id uuid primary key default gen_random_uuid(),
  release_code text not null unique
    default ('RL' || lpad(nextval('release_code_seq')::text, 4, '0')),
  lead_id uuid not null references public.leads (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete set null,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  release_date date not null default current_date,
  transaction text,
  model_released text,
  units_released integer not null default 1 check (units_released > 0),
  bank text,
  remarks text,
  legacy_key text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists releases_lead_idx on public.vehicle_releases (lead_id);
create index if not exists releases_owner_idx on public.vehicle_releases (owner_id);
create index if not exists releases_date_idx on public.vehicle_releases (release_date);
create index if not exists releases_model_idx on public.vehicle_releases (model_released);
create index if not exists releases_bank_idx on public.vehicle_releases (bank);
create index if not exists releases_transaction_idx on public.vehicle_releases (transaction);

-- Prevent accidental duplicate release rows. Multiple units belong in one row.
create unique index if not exists releases_unique_entry
  on public.vehicle_releases (lead_id, release_date, model_released);
create unique index if not exists releases_legacy_key_unique
  on public.vehicle_releases (owner_id, legacy_key)
  where legacy_key is not null;

-- ----------------------------------------------------------------------------
-- lost_sales
-- ----------------------------------------------------------------------------
create table if not exists public.lost_sales (
  id uuid primary key default gen_random_uuid(),
  lost_code text not null unique
    default ('LS' || lpad(nextval('lost_code_seq')::text, 4, '0')),
  lead_id uuid not null references public.leads (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date_marked_lost date not null default current_date,
  lead_source text,
  preferred_model text,
  pipeline_stage_when_lost text,
  primary_loss_reason text,
  competitor_alternative text,
  financing_payment_issue text,
  estimated_units_lost numeric(8, 2) not null default 1
    check (estimated_units_lost >= 0),
  recoverable boolean not null default false,
  recovery_next_action text,
  coaching_notes text,
  recovery_status text not null default 'open'
    check (recovery_status in ('open', 'recovered', 'closed')),
  recovered_at date,
  legacy_key text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lost_lead_idx on public.lost_sales (lead_id);
create index if not exists lost_owner_idx on public.lost_sales (owner_id);
create index if not exists lost_date_idx on public.lost_sales (date_marked_lost);
create index if not exists lost_reason_idx on public.lost_sales (primary_loss_reason);
create index if not exists lost_recoverable_idx on public.lost_sales (recoverable);
create index if not exists lost_model_idx on public.lost_sales (preferred_model);
create unique index if not exists lost_legacy_key_unique
  on public.lost_sales (owner_id, legacy_key)
  where legacy_key is not null;

-- ----------------------------------------------------------------------------
-- dropdown_options (all app dropdown values live here)
-- ----------------------------------------------------------------------------
create table if not exists public.dropdown_options (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  owner_id uuid references public.profiles (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, label)
);

create index if not exists dropdown_category_idx
  on public.dropdown_options (category, sort_order);

-- ----------------------------------------------------------------------------
-- vehicle_models
-- ----------------------------------------------------------------------------
create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  make text not null default 'TOYOTA',
  model text,
  variant text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_models_sort_idx
  on public.vehicle_models (sort_order);

-- ----------------------------------------------------------------------------
-- monthly_targets
-- ----------------------------------------------------------------------------
create table if not exists public.monthly_targets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  sales_target integer not null default 0 check (sales_target >= 0),
  financing_target integer not null default 0 check (financing_target >= 0),
  tfs_target integer not null default 0 check (tfs_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists monthly_targets_period_unique
  on public.monthly_targets (
    coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
    year,
    month
  );

-- ----------------------------------------------------------------------------
-- app_settings
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, key)
);

-- ----------------------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  table_name text not null,
  record_id uuid,
  record_code text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_owner_idx
  on public.audit_logs (owner_id, created_at desc);
create index if not exists audit_logs_table_idx
  on public.audit_logs (table_name, record_id);

-- ----------------------------------------------------------------------------
-- import_batches
-- ----------------------------------------------------------------------------
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  filename text not null,
  record_counts jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'leads', 'financing_applications', 'reservations',
    'vehicle_releases', 'lost_sales', 'dropdown_options', 'vehicle_models',
    'monthly_targets', 'app_settings'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- audit trigger
-- ----------------------------------------------------------------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_old jsonb;
  v_new jsonb;
  v_code text;
  v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := null;
    v_owner := old.owner_id;
    v_id := old.id;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_owner := new.owner_id;
    v_id := new.id;
  else
    v_old := null;
    v_new := to_jsonb(new);
    v_owner := new.owner_id;
    v_id := new.id;
  end if;

  v_code := coalesce(
    v_new ->> 'lead_code',
    v_new ->> 'financing_code',
    v_new ->> 'reservation_code',
    v_new ->> 'release_code',
    v_new ->> 'lost_code',
    v_old ->> 'lead_code',
    v_old ->> 'financing_code',
    v_old ->> 'reservation_code',
    v_old ->> 'release_code',
    v_old ->> 'lost_code'
  );

  insert into public.audit_logs (
    owner_id, table_name, record_id, record_code, action,
    old_data, new_data, changed_by
  ) values (
    v_owner, tg_table_name, v_id, v_code, lower(tg_op),
    v_old, v_new, auth.uid()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'leads', 'financing_applications', 'reservations',
    'vehicle_releases', 'lost_sales'
  ] loop
    execute format(
      'drop trigger if exists audit_changes on public.%I; create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log();',
      t, t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- auto-create profile on signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- privileges (RLS still applies to authenticated)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
