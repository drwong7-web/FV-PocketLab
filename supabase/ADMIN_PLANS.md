# Managing plans by hand

How to see every account and give someone Pro or Lifetime without a payment. Everything here happens in the [Supabase dashboard](https://supabase.com/dashboard/project/hmeosususvxesdojjtro); nothing in this file touches Creem.

Applies from migration `20260817000000_admin_plan_console.sql`.

## One-time setup

Make your own account an admin. Run in **SQL Editor**:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

This works because the dashboard connects as `postgres`, which the billing guard trigger treats as privileged.

## See everyone

**Table Editor → `admin_user_plans`**, or in the SQL editor:

```sql
select * from public.admin_user_plans order by created_at desc;
```

| Column | Meaning |
| --- | --- |
| `plan` | `free`, `pro_monthly`, `pro_yearly`, `lifetime` |
| `plan_status` | `active`, `trialing`, `past_due`, `canceled`, `expired` |
| `plan_source` | `system` (signup default), `creem` (paid), `manual` (you granted it) |
| `full_access` | What the app actually unlocks — this is the one that matters |
| `current_period_end` | When a recurring plan lapses; null for free and lifetime |
| `has_creem_customer` | Whether they ever paid, so whether **Manage billing** works for them |

The view is **read-only** in the Table Editor. To change something, use the commands below, or edit the row in `profiles` directly.

## Grant a plan

```sql
-- 1 month of Pro
select public.admin_set_plan_by_email('coach@club.com', 'pro_monthly');

-- 3 months of Pro
select public.admin_set_plan_by_email('coach@club.com', 'pro_monthly', 3, 'pilot club');

-- a year
select public.admin_set_plan_by_email('coach@club.com', 'pro_yearly', 12, 'partner');

-- forever
select public.admin_set_plan_by_email('coach@club.com', 'lifetime', null, 'founder');
```

`months` defaults to 1 for `pro_monthly` and 12 for `pro_yearly`. `lifetime` and `free` ignore it.

Errors you may see: `USER_NOT_FOUND` (no profile with that email — they must sign up first), `INVALID_PLAN`, `NOT_AUTHORIZED` (you are not an admin and not on a direct DB connection).

## Take it back

```sql
select public.admin_revoke_plan('coach@club.com', 'trial over');
```

## Grant by uuid instead

```sql
select public.admin_set_plan(
  'USER-UUID'::uuid,
  'pro_yearly',
  'active',
  now() + interval '1 year',
  'comped'
);
```

## Manual grants beat Creem

A manual grant writes `plan_source = 'manual'`. While that is set and the plan is not `free`, an incoming Creem revocation (`subscription.expired`, `canceled`, `past_due`, refund) is **logged but not applied** — a comped account cannot be silently downgraded.

A genuine purchase by that same person still applies and flips `plan_source` back to `creem`, which ends the lock. `admin_revoke_plan` also ends it.

## Audit trail

Every change is recorded, whether it came from you or from Creem:

```sql
select created_at, event_type, source, from_plan, to_plan, from_status, to_status
from public.plan_events
where user_id = (select id from public.profiles where email = 'coach@club.com')
order by created_at desc;
```

Manual changes appear as `event_type = 'admin_override'`, `source = 'manual'`, with your note in `payload`.

## After you change a plan

The user opens **Settings → Refresh** in PocketLab (or signs out and back in). Entitlements are cached on-device under `slfv:entitlements`, so an open app will not notice the change on its own.

Manual grants do not create a Creem subscription, so **Manage billing** stays hidden unless that person has really paid at some point.
