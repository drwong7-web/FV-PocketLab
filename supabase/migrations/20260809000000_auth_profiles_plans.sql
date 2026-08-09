-- FV PocketLab — accounts, plans and entitlements
--
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Scope: authentication profiles + subscription state only. Teams, athletes and
-- test sessions stay on the device (see SPEC.md §2).
--
-- Plans
--   free          limited features, ads shown
--   pro_monthly   full access, no ads, recurring (Creem subscription)
--   lifetime      full access, no ads, one-time purchase
--
-- Users can read and edit their own profile, but never their own plan: the
-- billing columns are locked by a trigger and can only be changed by the
-- service role (Creem webhook) or by an admin through admin_set_plan().

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,

  plan text not null default 'free'
    check (plan in ('free', 'pro_monthly', 'lifetime')),
  plan_status text not null default 'active'
    check (plan_status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  plan_source text not null default 'system'
    check (plan_source in ('system', 'manual', 'creem')),
  -- End of the paid period for recurring plans. NULL for free and lifetime.
  current_period_end timestamptz,
  -- Set once the user cancels but still has time left on the period.
  cancel_at timestamptz,

  creem_customer_id text,
  creem_subscription_id text,

  is_admin boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user: identity plus plan/entitlement state.';
comment on column public.profiles.plan is
  'free | pro_monthly | lifetime. Only the service role or an admin can change it.';

create index if not exists profiles_plan_idx on public.profiles (plan, plan_status);
create index if not exists profiles_creem_customer_idx on public.profiles (creem_customer_id);

-- ---------------------------------------------------------------------------
-- plan_events — audit trail, and the log Creem webhooks will write to
-- ---------------------------------------------------------------------------

create table if not exists public.plan_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  from_plan text,
  to_plan text,
  from_status text,
  to_status text,
  source text not null default 'system',
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists plan_events_user_idx on public.plan_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so it can read profiles without tripping the RLS policies
-- that call it (avoids infinite recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- True when the plan grants full, ad-free access right now.
create or replace function public.has_full_access(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target
      and (
        (p.plan = 'lifetime' and p.plan_status = 'active')
        or (
          p.plan = 'pro_monthly'
          and p.plan_status in ('active', 'trialing')
          and (p.current_period_end is null or p.current_period_end > now())
        )
      )
  );
$$;

-- Single round trip for the client: plan state + derived entitlements.
create or replace function public.my_entitlements()
returns table (
  plan text,
  plan_status text,
  current_period_end timestamptz,
  cancel_at timestamptz,
  full_access boolean,
  ads_enabled boolean,
  is_admin boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.plan,
    p.plan_status,
    p.current_period_end,
    p.cancel_at,
    public.has_full_access(p.id) as full_access,
    not public.has_full_access(p.id) as ads_enabled,
    p.is_admin
  from public.profiles p
  where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create the profile row whenever a user signs up (email or OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync when the user changes it in auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Users may edit their name/avatar, never their own billing state.
create or replace function public.guard_profile_billing_columns()
returns trigger
language plpgsql
as $$
declare
  privileged boolean;
begin
  privileged := current_user in ('service_role', 'postgres', 'supabase_admin')
                or public.is_admin();

  if privileged then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.plan_status is distinct from old.plan_status
     or new.plan_source is distinct from old.plan_source
     or new.current_period_end is distinct from old.current_period_end
     or new.cancel_at is distinct from old.cancel_at
     or new.creem_customer_id is distinct from old.creem_customer_id
     or new.creem_subscription_id is distinct from old.creem_subscription_id
     or new.is_admin is distinct from old.is_admin then
    raise exception 'PLAN_CHANGE_NOT_ALLOWED'
      using hint = 'Billing columns are managed by the payment webhook or an admin.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_billing on public.profiles;
create trigger profiles_guard_billing
  before update on public.profiles
  for each row execute function public.guard_profile_billing_columns();

-- Every plan/status change lands in plan_events automatically.
create or replace function public.log_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan
     or new.plan_status is distinct from old.plan_status then
    insert into public.plan_events (
      user_id, event_type, from_plan, to_plan, from_status, to_status, source
    )
    values (
      new.id, 'plan_changed', old.plan, new.plan, old.plan_status, new.plan_status, new.plan_source
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_log_plan_change on public.profiles;
create trigger profiles_log_plan_change
  after update on public.profiles
  for each row execute function public.log_plan_change();

-- ---------------------------------------------------------------------------
-- Admin API — the supported way to edit a user's status by hand
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_plan(
  target_user uuid,
  new_plan text,
  new_status text default 'active',
  period_end timestamptz default null,
  note text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.profiles
  set plan = new_plan,
      plan_status = new_status,
      plan_source = 'manual',
      current_period_end = period_end,
      cancel_at = null
  where id = target_user
  returning * into updated;

  if updated.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into public.plan_events (user_id, event_type, to_plan, to_status, source, payload)
  values (target_user, 'admin_override', new_plan, new_status, 'manual',
          jsonb_build_object('note', note, 'by', auth.uid()));

  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plan_events enable row level security;

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

drop policy if exists "plan_events_select_own_or_admin" on public.plan_events;
create policy "plan_events_select_own_or_admin"
  on public.plan_events for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update on public.profiles to authenticated;
grant select on public.plan_events to authenticated;
grant execute on function public.my_entitlements() to authenticated;
grant execute on function public.has_full_access(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_set_plan(uuid, text, text, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill for users that existed before this migration
-- ---------------------------------------------------------------------------

insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;
