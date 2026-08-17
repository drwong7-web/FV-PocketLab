-- FV PocketLab — admin plan console
--
-- Lets an operator read every account's plan from the Supabase dashboard and
-- grant/revoke plans by email, and makes a manual grant survive Creem
-- revocation events until an admin clears it.
--
-- Three things this fixes:
--   1. admin_set_plan() only accepted public.is_admin(), which resolves
--      auth.uid(). In the dashboard SQL editor there is no JWT, so every call
--      raised NOT_AUTHORIZED.
--   2. Granting a plan meant copying a uuid out of Authentication > Users.
--   3. A comped account was wiped by the next subscription.expired event.

-- ---------------------------------------------------------------------------
-- Privilege helper
-- ---------------------------------------------------------------------------

-- IMPORTANT: `session_user`, not `current_user`. Inside a SECURITY DEFINER
-- function `current_user` is the function owner (postgres), so a current_user
-- test would pass for every caller. `session_user` stays the role that opened
-- the connection: `authenticator` for PostgREST, `postgres` for the dashboard
-- SQL editor and the CLI.
create or replace function public.is_privileged_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or session_user in ('postgres', 'supabase_admin', 'service_role')
    or pg_has_role(session_user, 'postgres', 'member');
$$;

comment on function public.is_privileged_admin() is
  'True for an is_admin profile or a direct superuser-grade DB connection (dashboard SQL editor, CLI, service role).';

revoke all on function public.is_privileged_admin() from public, anon;
grant execute on function public.is_privileged_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- admin_set_plan v2 — same signature, usable from the dashboard
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
  if not public.is_privileged_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if new_plan is null or new_plan not in ('free', 'pro_monthly', 'pro_yearly', 'lifetime') then
    raise exception 'INVALID_PLAN: %', coalesce(new_plan, 'null')
      using hint = 'Use free, pro_monthly, pro_yearly or lifetime.';
  end if;

  if new_status is null or new_status not in ('active', 'trialing', 'past_due', 'canceled', 'expired') then
    raise exception 'INVALID_STATUS: %', coalesce(new_status, 'null')
      using hint = 'Use active, trialing, past_due, canceled or expired.';
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
          jsonb_build_object('note', note, 'by', auth.uid(), 'session_user', session_user));

  return updated;
end;
$$;

comment on function public.admin_set_plan(uuid, text, text, timestamptz, text) is
  'Set a plan by hand. Writes plan_source = manual, which Creem revocations then cannot undo.';

-- ---------------------------------------------------------------------------
-- Grant / revoke by email — no uuid copying
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_plan_by_email(
  target_email text,
  new_plan text,
  months int default null,
  note text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  matches int;
  period timestamptz;
  span int;
begin
  -- Checked before the lookup so a non-admin cannot probe which emails exist.
  if not public.is_privileged_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select count(*) into matches
  from public.profiles p
  where lower(p.email) = lower(btrim(target_email));

  if matches = 0 then
    raise exception 'USER_NOT_FOUND: %', target_email;
  elsif matches > 1 then
    raise exception 'EMAIL_AMBIGUOUS: %', target_email;
  end if;

  select p.id into target_id
  from public.profiles p
  where lower(p.email) = lower(btrim(target_email));

  if new_plan in ('free', 'lifetime') then
    period := null;
  else
    span := coalesce(months, case when new_plan = 'pro_yearly' then 12 else 1 end);
    period := now() + make_interval(months => span);
  end if;

  return public.admin_set_plan(target_id, new_plan, 'active', period, note);
end;
$$;

comment on function public.admin_set_plan_by_email(text, text, int, text) is
  'Grant a plan by email. months defaults to 1 for pro_monthly and 12 for pro_yearly; free and lifetime have no period.';

create or replace function public.admin_revoke_plan(
  target_email text,
  note text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Back to free, which also releases the manual lock in apply_creem_event().
  return public.admin_set_plan_by_email(target_email, 'free', null, coalesce(note, 'revoked by admin'));
end;
$$;

comment on function public.admin_revoke_plan(text, text) is
  'Put an account back on the free plan and release its manual lock.';

revoke all on function public.admin_set_plan_by_email(text, text, int, text) from public, anon;
revoke all on function public.admin_revoke_plan(text, text) from public, anon;
grant execute on function public.admin_set_plan_by_email(text, text, int, text) to authenticated, service_role;
grant execute on function public.admin_revoke_plan(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Read-only console view for the Table Editor
-- ---------------------------------------------------------------------------

-- security_invoker keeps the profiles RLS in force through the view: a normal
-- signed-in user sees only their own row, an is_admin profile sees everyone,
-- and a dashboard connection sees the whole table.
create or replace view public.admin_user_plans
with (security_invoker = true) as
select
  p.id as user_id,
  p.email,
  p.full_name,
  p.plan,
  p.plan_status,
  p.plan_source,
  public.has_full_access(p.id) as full_access,
  p.current_period_end,
  p.cancel_at,
  p.creem_customer_id is not null as has_creem_customer,
  p.is_admin,
  p.created_at
from public.profiles p;

comment on view public.admin_user_plans is
  'One row per account: plan, status and derived access. Read-only in the Table Editor; edit public.profiles or call admin_set_plan_by_email().';

revoke all on public.admin_user_plans from public, anon;
grant select on public.admin_user_plans to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- apply_creem_event v3 — a manual grant outranks a Creem revocation
-- ---------------------------------------------------------------------------

create or replace function public.apply_creem_event(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_period_end timestamptz default null,
  p_cancel_at timestamptz default null,
  p_customer_id text default null,
  p_subscription_id text default null,
  p_payload jsonb default '{}'::jsonb,
  p_allow_lifetime_downgrade boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
  existing public.profiles;
  next_plan text := p_plan;
  next_status text := p_status;
  next_period timestamptz := p_period_end;
  next_cancel timestamptz := p_cancel_at;
  next_source text := 'creem';
  revoking boolean;
  overridden boolean := false;
begin
  if p_event_id is null or length(p_event_id) = 0 then
    raise exception 'EVENT_ID_REQUIRED';
  end if;

  if p_plan is null or p_plan not in ('free', 'pro_monthly', 'pro_yearly', 'lifetime') then
    raise exception 'INVALID_PLAN';
  end if;

  if p_status is null or p_status not in ('active', 'trialing', 'past_due', 'canceled', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;

  if exists (
    select 1 from public.plan_events e
    where e.provider_event_id = p_event_id
  ) then
    select * into updated from public.profiles where id = p_user_id;
    if updated.id is null then
      raise exception 'USER_NOT_FOUND';
    end if;
    return updated;
  end if;

  select * into existing from public.profiles where id = p_user_id;

  if existing.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  revoking := next_plan = 'free' or next_status in ('canceled', 'expired', 'past_due');

  -- A comped account keeps what an admin gave it. A real purchase still lands
  -- (it is not a revocation) and flips plan_source back to creem, which ends
  -- the lock on its own.
  if existing.plan_source = 'manual' and existing.plan <> 'free' and revoking then
    next_plan := existing.plan;
    next_status := existing.plan_status;
    next_period := existing.current_period_end;
    next_cancel := existing.cancel_at;
    overridden := true;
  end if;

  -- Lifetime is sticky: a recurring cancel/expiry/refund must not strip a one-time purchase.
  if existing.plan = 'lifetime'
     and existing.plan_status = 'active'
     and next_plan is distinct from 'lifetime'
     and not p_allow_lifetime_downgrade then
    next_plan := 'lifetime';
    next_status := 'active';
    next_period := null;
    next_cancel := null;
    overridden := true;
  end if;

  -- Keep the manual marker only when a rule actually overrode this event. A
  -- genuine payment is left alone and hands the account back to Creem, even
  -- when it renews the same tier the admin had comped.
  if overridden and existing.plan_source = 'manual' then
    next_source := 'manual';
  end if;

  update public.profiles
  set
    plan = next_plan,
    plan_status = next_status,
    plan_source = next_source,
    current_period_end = next_period,
    cancel_at = next_cancel,
    creem_customer_id = coalesce(p_customer_id, creem_customer_id),
    creem_subscription_id = case
      when next_plan = 'lifetime' then null
      when next_plan = 'free' then null
      else coalesce(p_subscription_id, creem_subscription_id)
    end
  where id = p_user_id
  returning * into updated;

  insert into public.plan_events (
    user_id, event_type, from_plan, to_plan, from_status, to_status,
    source, payload, provider_event_id
  )
  values (
    p_user_id,
    p_event_type,
    existing.plan,
    updated.plan,
    existing.plan_status,
    updated.plan_status,
    'creem',
    p_payload,
    p_event_id
  );

  return updated;
end;
$$;

revoke all on function public.apply_creem_event(
  text, text, uuid, text, text, timestamptz, timestamptz, text, text, jsonb, boolean
) from public, anon, authenticated;

grant execute on function public.apply_creem_event(
  text, text, uuid, text, text, timestamptz, timestamptz, text, text, jsonb, boolean
) to service_role;
