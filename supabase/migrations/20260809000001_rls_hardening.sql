-- FV PocketLab — RLS defense-in-depth
--
-- Prerequisites: 20260809000000_auth_profiles_plans.sql already applied.
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- Goal: anon / PUBLIC get nothing; authenticated keeps own-row access only.
-- Billing columns remain locked by guard_profile_billing_columns().

-- ---------------------------------------------------------------------------
-- Revoke broad defaults, then re-grant the least privilege needed
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from anon, public;
revoke all on table public.plan_events from anon, public;

revoke all on function public.is_admin() from anon, public;
revoke all on function public.has_full_access(uuid) from anon, public;
revoke all on function public.my_entitlements() from anon, public;
revoke all on function public.admin_set_plan(uuid, text, text, timestamptz, text) from anon, public;

-- Authenticated: profiles own-row CRUD (minus delete)
grant select, insert, update on public.profiles to authenticated;
revoke delete on table public.profiles from authenticated;

-- Authenticated: plan_events are read-only audit rows
grant select on public.plan_events to authenticated;
revoke insert, update, delete on table public.plan_events from authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_full_access(uuid) to authenticated;
grant execute on function public.my_entitlements() to authenticated;
grant execute on function public.admin_set_plan(uuid, text, text, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Re-assert RLS + own-row policies (idempotent; matches migration 000)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plan_events enable row level security;

-- Force RLS even for table owners in local/dev roles (safe on Supabase).
alter table public.profiles force row level security;
alter table public.plan_events force row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Document intent: clients must not delete profiles (account deletion is Auth Admin).
drop policy if exists "profiles_delete_denied" on public.profiles;
create policy "profiles_delete_denied"
  on public.profiles for delete
  to authenticated
  using (false);

drop policy if exists "plan_events_select_own_or_admin" on public.plan_events;
create policy "plan_events_select_own_or_admin"
  on public.plan_events for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Explicit denies so the dashboard shows mutation is considered and rejected.
drop policy if exists "plan_events_insert_denied" on public.plan_events;
create policy "plan_events_insert_denied"
  on public.plan_events for insert
  to authenticated
  with check (false);

drop policy if exists "plan_events_update_denied" on public.plan_events;
create policy "plan_events_update_denied"
  on public.plan_events for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "plan_events_delete_denied" on public.plan_events;
create policy "plan_events_delete_denied"
  on public.plan_events for delete
  to authenticated
  using (false);
