-- FV PocketLab — verify RLS is applied on the live project
-- Paste into the Supabase SQL editor and inspect the results.

-- 1) Tables exist and RLS is forced/enabled
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'plan_events')
order by c.relname;

-- Expected: both rows, rls_enabled = true (rls_forced = true after hardening migration).

-- 2) Policies present
select tablename, policyname, cmd, roles, permissive
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'plan_events')
order by tablename, cmd, policyname;

-- Expected (after both migrations):
-- profiles: SELECT own/admin, INSERT self, UPDATE own/admin, DELETE denied
-- plan_events: SELECT own/admin, INSERT/UPDATE/DELETE denied

-- 3) Table privileges for anon vs authenticated
select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'plan_events')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
group by grantee, table_name
order by table_name, grantee;

-- Expected after hardening:
-- anon / PUBLIC: no rows (or no privileges)
-- authenticated: profiles = SELECT, INSERT, UPDATE ; plan_events = SELECT

-- 4) Backup bucket is private
select id, name, public, file_size_limit
from storage.buckets
where id = 'user-backups';

-- Expected: one row, public = false.

-- 5) Storage policies scope objects to the owner's folder
select policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'user_backups%'
order by cmd, policyname;

-- Expected four policies: SELECT + DELETE (owner), INSERT + UPDATE (owner and
-- public.has_full_access, so only paid plans can upload).

-- 6) Creem writer is service_role only
select
  p.proname,
  r.rolname as grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname = 'apply_creem_event'
  and r.rolname in ('anon', 'authenticated', 'service_role');

-- Expected: anon/authenticated = false, service_role = true.

-- 7) Admin console view keeps RLS in force and is hidden from anon
select
  c.relname as view_name,
  (select option_value
   from pg_options_to_table(c.reloptions)
   where option_name = 'security_invoker') as security_invoker
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'admin_user_plans';

-- Expected: one row, security_invoker = true (a definer view would leak every
-- account's email to any signed-in user).

select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'admin_user_plans'
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'service_role')
group by grantee
order by grantee;

-- Expected: no anon / PUBLIC row; authenticated and service_role have SELECT.

-- 8) Admin helpers are closed to anon
select
  p.proname,
  r.rolname as grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname in ('admin_set_plan', 'admin_set_plan_by_email', 'admin_revoke_plan', 'is_privileged_admin')
  and r.rolname in ('anon', 'authenticated', 'service_role')
order by p.proname, r.rolname;

-- Expected: anon = false everywhere. authenticated/service_role may execute,
-- but every admin_* function still calls public.is_privileged_admin() first,
-- which is false for a PostgREST caller that is not an is_admin profile.

