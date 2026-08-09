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
