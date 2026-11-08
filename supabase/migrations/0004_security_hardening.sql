-- ============================================================================
-- 0004_security_hardening.sql
--
-- Additive security hardening. This migration does not delete customer data.
--
--   1. dropdown_options: authenticated users can read shared/own rows, create
--      only their own rows, update visible rows, and delete only their own.
--   2. vehicle_models: writes are restricted to owner/admin profiles.
--   3. profiles.role: users cannot change their own role or self-provision an
--      elevated role through the API.
--   4. auth.users: public registration becomes invite-only after bootstrap.
--   5. CRM foreign keys: destructive cascades are replaced with RESTRICT.
--   6. All CRM tables are re-checked for RLS and at least one policy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Re-assert RLS on every CRM table (idempotent)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 1. Helpers
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. Invite-only account creation
-- ----------------------------------------------------------------------------
create table if not exists public.signup_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'agent'
    check (role in ('admin', 'agent', 'viewer')),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  consumed_by uuid
);

create unique index if not exists signup_invites_pending_email_unique
  on public.signup_invites (lower(email))
  where consumed_at is null;

create index if not exists signup_invites_email_idx
  on public.signup_invites (lower(email));

alter table public.signup_invites enable row level security;

drop policy if exists invites_admin_select on public.signup_invites;
create policy invites_admin_select on public.signup_invites
  for select to authenticated using (public.is_crm_admin());

drop policy if exists invites_admin_insert on public.signup_invites;
create policy invites_admin_insert on public.signup_invites
  for insert to authenticated with check (public.is_crm_admin());

drop policy if exists invites_admin_update on public.signup_invites;
create policy invites_admin_update on public.signup_invites
  for update to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

drop policy if exists invites_admin_delete on public.signup_invites;
create policy invites_admin_delete on public.signup_invites
  for delete to authenticated using (public.is_crm_admin());

grant select, insert, update, delete on public.signup_invites to authenticated;
grant all on public.signup_invites to service_role;
revoke all on public.signup_invites from anon;

-- Backfill any auth users that predate the profile trigger. Existing profiles
-- are left untouched. The first missing profile becomes owner only when the
-- profiles table is still empty; everyone else becomes an agent.
insert into public.profiles (id, full_name, email, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  u.email,
  case
    when not exists (select 1 from public.profiles)
      and row_number() over (order by u.created_at) = 1
      then 'owner'
    else 'agent'
  end
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

alter table public.profiles alter column role set default 'agent';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := new.raw_app_meta_data ->> 'crm_role';

  if v_role is null or v_role not in ('owner', 'admin', 'agent', 'viewer') then
    if not exists (select 1 from public.profiles) then
      v_role := 'owner';
    else
      v_role := 'agent';
    end if;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.enforce_invite_only_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Serialize bootstrap so concurrent initial registrations cannot both become owners.
  perform pg_advisory_xact_lock(hashtext('public.profiles.bootstrap')::bigint);

  -- The very first account bootstraps the workspace as owner.
  if not exists (select 1 from public.profiles) then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('crm_role', 'owner');
    return new;
  end if;

  -- app_metadata is writable only by the service role/admin API. This allows
  -- the owner to create accounts deliberately without an invite row.
  v_role := new.raw_app_meta_data ->> 'crm_role';
  if v_role in ('owner', 'admin', 'agent', 'viewer') then
    return new;
  end if;

  if new.email is null then
    raise exception 'An email address is required to create an account.'
      using errcode = '42501';
  end if;

  update public.signup_invites
     set consumed_at = now(),
         consumed_by = new.id
   where id = (
     select id
     from public.signup_invites
     where lower(email) = lower(new.email)
       and consumed_at is null
     order by created_at
     limit 1
   )
  returning role into v_role;

  if v_role is null then
    raise exception 'Registration is invite-only. Ask the CRM owner for an invitation.'
      using errcode = '42501';
  end if;

  new.raw_app_meta_data :=
    coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('crm_role', v_role);

  return new;
end;
$$;

drop trigger if exists enforce_invite_only_signup on auth.users;
create trigger enforce_invite_only_signup
  before insert on auth.users
  for each row execute function public.enforce_invite_only_signup();

-- ----------------------------------------------------------------------------
-- 3. Prevent self role changes and elevated self-provisioning
-- ----------------------------------------------------------------------------
-- Self-service inserts may only create ordinary agent profiles. Owner/admin
-- provisioning still runs through the SECURITY DEFINER signup trigger or the
-- service role.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'agent'
  );

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_crm_admin() then
      raise exception 'Only CRM owners or admins can change profile roles.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- ----------------------------------------------------------------------------
-- 4. dropdown_options policies
-- ----------------------------------------------------------------------------
drop policy if exists dropdown_write on public.dropdown_options;

drop policy if exists dropdown_read on public.dropdown_options;
create policy dropdown_read on public.dropdown_options
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists dropdown_insert_own on public.dropdown_options;
create policy dropdown_insert_own on public.dropdown_options
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists dropdown_update_visible on public.dropdown_options;
create policy dropdown_update_visible on public.dropdown_options
  for update to authenticated
  using (owner_id is null or owner_id = auth.uid())
  with check (owner_id is null or owner_id = auth.uid());

drop policy if exists dropdown_delete_own on public.dropdown_options;
create policy dropdown_delete_own on public.dropdown_options
  for delete to authenticated
  using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. vehicle_models policies
-- ----------------------------------------------------------------------------
drop policy if exists models_read on public.vehicle_models;
create policy models_read on public.vehicle_models
  for select to authenticated using (true);

drop policy if exists models_write on public.vehicle_models;
create policy models_write on public.vehicle_models
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

-- ----------------------------------------------------------------------------
-- 6. leads: archive/restore only, no hard delete for authenticated users
-- ----------------------------------------------------------------------------
drop policy if exists leads_owner_all on public.leads;

drop policy if exists leads_owner_select on public.leads;
create policy leads_owner_select on public.leads
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists leads_owner_insert on public.leads;
create policy leads_owner_insert on public.leads
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists leads_owner_update on public.leads;
create policy leads_owner_update on public.leads
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- No DELETE policy on public.leads. Prospects are archived, not deleted.

-- ----------------------------------------------------------------------------
-- 7. Replace destructive customer-data cascades with RESTRICT
-- ----------------------------------------------------------------------------
do $$
declare
  spec record;
  con record;
  v_relid regclass;
  v_attnum smallint;
begin
  for spec in
    select * from (values
      ('leads', 'owner_id', 'profiles', 'id', 'leads_owner_id_fkey'),
      ('lead_activities', 'lead_id', 'leads', 'id', 'lead_activities_lead_id_fkey'),
      ('lead_activities', 'owner_id', 'profiles', 'id', 'lead_activities_owner_id_fkey'),
      ('financing_applications', 'lead_id', 'leads', 'id', 'financing_applications_lead_id_fkey'),
      ('financing_applications', 'owner_id', 'profiles', 'id', 'financing_applications_owner_id_fkey'),
      ('reservations', 'lead_id', 'leads', 'id', 'reservations_lead_id_fkey'),
      ('reservations', 'owner_id', 'profiles', 'id', 'reservations_owner_id_fkey'),
      ('vehicle_releases', 'lead_id', 'leads', 'id', 'vehicle_releases_lead_id_fkey'),
      ('vehicle_releases', 'owner_id', 'profiles', 'id', 'vehicle_releases_owner_id_fkey'),
      ('lost_sales', 'lead_id', 'leads', 'id', 'lost_sales_lead_id_fkey'),
      ('lost_sales', 'owner_id', 'profiles', 'id', 'lost_sales_owner_id_fkey')
    ) as v(tbl, col, ref_tbl, ref_col, conname)
  loop
    v_relid := format('public.%I', spec.tbl)::regclass;

    select attnum into v_attnum
    from pg_attribute
    where attrelid = v_relid
      and attname = spec.col;

    for con in
      select conname
      from pg_constraint
      where conrelid = v_relid
        and contype = 'f'
        and conkey = array[v_attnum]
        and confrelid = format('public.%I', spec.ref_tbl)::regclass
    loop
      execute format(
        'alter table public.%I drop constraint %I',
        spec.tbl,
        con.conname
      );
    end loop;

    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete restrict',
      spec.tbl,
      spec.conname,
      spec.col,
      spec.ref_tbl,
      spec.ref_col
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Verify RLS coverage (fails the migration if anything is unprotected)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  has_rls boolean;
  policy_count integer;
begin
  foreach t in array array[
    'profiles', 'leads', 'lead_activities', 'financing_applications',
    'reservations', 'vehicle_releases', 'lost_sales', 'dropdown_options',
    'vehicle_models', 'monthly_targets', 'app_settings', 'audit_logs',
    'import_batches', 'signup_invites'
  ] loop
    select c.relrowsecurity into has_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = t;

    if has_rls is distinct from true then
      raise exception 'RLS is not enabled on public.%', t;
    end if;

    select count(*) into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = t;

    if policy_count = 0 then
      raise exception 'No RLS policies found for public.%', t;
    end if;
  end loop;
end $$;
