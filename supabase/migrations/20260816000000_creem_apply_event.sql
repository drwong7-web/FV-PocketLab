-- FV PocketLab — Creem webhook apply path
--
-- The billing trigger already lets `service_role` update plan columns. This
-- function is the only supported writer for Creem: it applies an entitlement
-- change and records the raw event once (retries are no-ops).
-- Authenticated clients cannot execute it.

alter table public.plan_events
  add column if not exists provider_event_id text;

create unique index if not exists plan_events_provider_event_id_idx
  on public.plan_events (provider_event_id)
  where provider_event_id is not null;

comment on column public.plan_events.provider_event_id is
  'Creem event id (evt_…). Unique so webhook retries stay idempotent.';

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
  existing_plan text;
  existing_status text;
  next_plan text := p_plan;
  next_status text := p_status;
  next_period timestamptz := p_period_end;
  next_cancel timestamptz := p_cancel_at;
begin
  if p_event_id is null or length(p_event_id) = 0 then
    raise exception 'EVENT_ID_REQUIRED';
  end if;

  if p_plan is null or p_plan not in ('free', 'pro_monthly', 'lifetime') then
    raise exception 'INVALID_PLAN';
  end if;

  if p_status is null or p_status not in ('active', 'trialing', 'past_due', 'canceled', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;

  -- Already processed this Creem event — return the current row unchanged.
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

  select p.plan, p.plan_status into existing_plan, existing_status
  from public.profiles p
  where p.id = p_user_id;

  if existing_plan is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  -- Lifetime is sticky: a monthly cancel/expiry/refund must not strip a one-time purchase.
  if existing_plan = 'lifetime'
     and existing_status = 'active'
     and next_plan is distinct from 'lifetime'
     and not p_allow_lifetime_downgrade then
    next_plan := 'lifetime';
    next_status := 'active';
    next_period := null;
    next_cancel := null;
  end if;

  update public.profiles
  set
    plan = next_plan,
    plan_status = next_status,
    plan_source = 'creem',
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
    existing_plan,
    updated.plan,
    existing_status,
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
