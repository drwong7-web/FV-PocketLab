# Auth dashboard security checklist

Manual settings in the Supabase project dashboard. These are not applied by SQL migrations.

## Providers

- [x] **Email** enabled (Authentication → Providers → Email).
- [x] **Google / Apple / other OAuth** disabled (pushed via `supabase config push`, 2026-08-09).
- [x] **Confirm email** off for local/dev speed (`enable_confirmations = false` in `config.toml`). Turn on for production when ready.
- [ ] Enable **Leaked password protection** (HaveIBeenPwned) if the project plan supports it (dashboard-only).
- [x] Minimum password length ≥ 6 (matches the app validation).

## URLs

Authentication → URL Configuration (pushed via `supabase config push`):

- [x] **Site URL** = `https://localhost:8081` while developing.
- [x] **Redirect URLs** include localhost `/auth/callback` and `/auth/reset` (8080/8081, http/https).
- [ ] Add production equivalents of both paths before launch.

Without these, email confirmation and password-reset links bounce.

## API keys

- [x] Only the **anon** key is in the app (local `.env` → `VITE_SUPABASE_ANON_KEY`).
- [x] **service_role** key is not in any `VITE_*` variable or git commit.
- [x] `.env` removed from git tracking (`git rm --cached .env`).

## Database policies

- [x] [`migrations/20260809000000_auth_profiles_plans.sql`](migrations/20260809000000_auth_profiles_plans.sql) applied (`supabase db push`).
- [x] [`migrations/20260809000001_rls_hardening.sql`](migrations/20260809000001_rls_hardening.sql) applied (`supabase db push`).
- [x] Verified with remote queries (RLS enabled+forced, own-row policies, anon has no table privileges).

## Quick smoke tests

1. Signed-out REST call: `GET /rest/v1/profiles` with the anon key → `[]` (not a dump of all rows).
2. Anon `POST /rest/v1/profiles` → RLS / permission error.
3. Signed-in user A can read/update only their own profile row.
4. User A cannot change `plan` / `plan_status` (trigger → `PLAN_CHANGE_NOT_ALLOWED`).
