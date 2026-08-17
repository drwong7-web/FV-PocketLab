-- FV PocketLab — add pro_yearly (annual Creem subscription)
--
-- Same entitlements as pro_monthly (full access, no ads, account backup).
-- Lifetime remains sticky over both recurring plans.

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%pro_monthly%'
  limit 1;

  if cname is not null then
    execute format('alter table public.profiles drop constraint %I', cname);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'pro_monthly', 'pro_yearly', 'lifetime'));

comment on column public.profiles.plan is
  'free | pro_monthly | pro_yearly | lifetime. Only the service role or an admin can change it.';

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
          p.plan in ('pro_monthly', 'pro_yearly')
          and p.plan_status in ('active', 'trialing')
          and (p.current_period_end is null or p.current_period_end > now())
        )
      )
  );
$$;

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

  select p.plan, p.plan_status into existing_plan, existing_status
  from public.profiles p
  where p.id = p_user_id;

  if existing_plan is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  -- Lifetime is sticky: a recurring cancel/expiry/refund must not strip a one-time purchase.
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
