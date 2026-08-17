-- FV PocketLab — per-user data backups in Supabase Storage
--
-- Prerequisites: 20260809000000_auth_profiles_plans.sql (needs public.has_full_access).
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- One private object per user: `{auth.uid()}/pocketlab.slfv` — a JSON snapshot of
-- the on-device teams / athletes / tests. Ownership is the first path segment,
-- mirroring the auth.uid() model already used by public.profiles.
--
-- Deliberate asymmetry between read and write:
--   SELECT  → any authenticated owner, even on the free plan. A lapsed
--             subscription must never lock someone out of their own data.
--   INSERT  → owner AND public.has_full_access(): backups are a paid feature,
--   UPDATE    and the paywall has to live in SQL to be worth anything.

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-backups',
  'user-backups',
  false,
  26214400, -- 25 MB
  array['application/json', 'application/octet-stream']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Row level security on storage.objects
--
-- Supabase already owns storage.objects and ships it with RLS enabled, so we
-- only add policies here — `alter table ... enable row level security` would
-- fail with "must be owner of table objects".
-- ---------------------------------------------------------------------------

drop policy if exists "user_backups_select_own" on storage.objects;
create policy "user_backups_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_backups_insert_own_paid" on storage.objects;
create policy "user_backups_insert_own_paid"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_full_access(auth.uid())
  );

drop policy if exists "user_backups_update_own_paid" on storage.objects;
create policy "user_backups_update_own_paid"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_full_access(auth.uid())
  );

drop policy if exists "user_backups_delete_own" on storage.objects;
create policy "user_backups_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
