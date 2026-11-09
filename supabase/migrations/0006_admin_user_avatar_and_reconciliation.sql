-- ============================================================================
-- 0006_admin_user_avatar_and_reconciliation.sql
--
-- Additive reconciliation for environments where 0005 was applied manually and
-- to complete admin/user/avatar requirements. Safe to review before applying.
-- Do NOT reapply 0004/0005 blindly in production; apply only required new
-- migrations after verifying live schema/state.
--
-- Reconciles:
--   - 0004 invite/signup/profile triggers to recognize the `user` CRM role used
--     by 0005/app code, without disabling invite-only registration.
--   - profiles self-insert RLS to allow the current default non-admin role.
--   - monthly_targets admin management (idempotent policy reinforcement).
--   - Supabase Storage policies for profile avatar objects (bucket must exist).
--
-- Does NOT delete data. Does NOT reset RLS globally except targeted policies.
-- ============================================================================

-- Ensure role domain includes `user` (idempotent with 0005).
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

-- ----------------------------------------------------------------------------
-- Invite-only signup reconciliation: accept `user` role from trusted admin API
-- (app_metadata) and invited rows. Public self-signup still requires bootstrap
-- or a pending invite.
-- ----------------------------------------------------------------------------
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

  if v_role is null or v_role not in ('owner', 'admin', 'user', 'agent', 'viewer') then
    if not exists (select 1 from public.profiles) then
      v_role := 'owner';
    else
      v_role := 'user';
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
  -- trusted admin-controlled account creation without a public invite row.
  v_role := new.raw_app_meta_data ->> 'crm_role';
  if v_role in ('owner', 'admin', 'user', 'agent', 'viewer') then
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

-- Keep triggers pointing at reconciled functions (idempotent with 0001/0004).
drop trigger if exists enforce_invite_only_signup on auth.users;
create trigger enforce_invite_only_signup
  before insert on auth.users
  for each row execute function public.enforce_invite_only_signup();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Profiles: allow self insert for ordinary CRM roles (profile trigger normally
-- creates rows; this reconciles RLS if an app path uses authenticated insert).
-- Self role elevation remains blocked by with check + prevent_profile_role_change.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_crm_admin());

drop policy if exists profiles_admin_delete on public.profiles;
-- Intentionally no admin delete policy by default; account/profile deletion
-- requires an explicit operational decision and cleanup of owned CRM records.

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role in ('user', 'agent', 'viewer')
  );

-- ----------------------------------------------------------------------------
-- Monthly targets: admin full management (0005 may already provide this).
-- ----------------------------------------------------------------------------
drop policy if exists monthly_targets_admin_all on public.monthly_targets;
create policy monthly_targets_admin_all
  on public.monthly_targets
  for all to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

-- ----------------------------------------------------------------------------
-- Avatar storage policies (bucket: profile-avatars).
-- Create the bucket in Supabase Dashboard/Storage first (recommended private).
-- Objects are stored as: avatars/<auth.uid()>/...
-- Admins may manage all avatar objects; users may manage only their own folder.
-- ----------------------------------------------------------------------------
do $$
begin
  -- Policies require storage schema; ignore if not accessible in this environment.
  drop policy if exists profile_avatars_read_own_or_admin on storage.objects;
  create policy profile_avatars_read_own_or_admin
    on storage.objects
    for select to authenticated
    using (
      bucket_id = 'profile-avatars'
      and (
        public.is_crm_admin()
        or (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    );

  drop policy if exists profile_avatars_insert_own_or_admin on storage.objects;
  create policy profile_avatars_insert_own_or_admin
    on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'profile-avatars'
      and (
        public.is_crm_admin()
        or (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    );

  drop policy if exists profile_avatars_update_own_or_admin on storage.objects;
  create policy profile_avatars_update_own_or_admin
    on storage.objects
    for update to authenticated
    using (
      bucket_id = 'profile-avatars'
      and (
        public.is_crm_admin()
        or (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
    with check (
      bucket_id = 'profile-avatars'
      and (
        public.is_crm_admin()
        or (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    );

  drop policy if exists profile_avatars_delete_own_or_admin on storage.objects;
  create policy profile_avatars_delete_own_or_admin
    on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'profile-avatars'
      and (
        public.is_crm_admin()
        or (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    );
exception
  when insufficient_privilege then
    raise notice 'Skipping storage.objects avatar policies: insufficient privilege. Apply policies in Supabase SQL editor as project owner.';
  when undefined_table then
    raise notice 'Skipping storage.objects avatar policies: storage schema unavailable.';
end $$;
