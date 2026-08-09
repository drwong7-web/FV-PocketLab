# Auth dashboard security checklist

Manual settings in the Supabase project dashboard. These are not applied by SQL migrations.

## Providers

- [ ] **Email** enabled (Authentication → Providers → Email).
- [ ] **Google / Apple / other OAuth** disabled (the app is email + password only).
- [ ] Prefer **Confirm email** on for production; off is fine for local testing.
- [ ] Enable **Leaked password protection** (HaveIBeenPwned) if the project plan supports it.
- [ ] Minimum password length ≥ 6 (matches the app validation).

## URLs

Authentication → URL Configuration:

- [ ] **Site URL** = production origin (or `https://localhost:8081` while developing).
- [ ] **Redirect URLs** include:
  - `https://localhost:8081/auth/callback`
  - `https://localhost:8081/auth/reset`
  - production equivalents of both paths

Without these, email confirmation and password-reset links bounce.

## API keys

- [ ] Only the **anon** key is in the app (`.env` → `VITE_SUPABASE_ANON_KEY`).
- [ ] **service_role** key never appears in any `VITE_*` variable, client bundle, or git commit.
- [ ] Prefer `git rm --cached .env` if `.env` was ever committed while tracked.

## Database policies

- [ ] Run [`migrations/20260809000000_auth_profiles_plans.sql`](migrations/20260809000000_auth_profiles_plans.sql) once.
- [ ] Run [`migrations/20260809000001_rls_hardening.sql`](migrations/20260809000001_rls_hardening.sql) once.
- [ ] Confirm with [`VERIFY_RLS.sql`](VERIFY_RLS.sql).

## Quick smoke tests

1. Signed-out REST call: `GET /rest/v1/profiles` with the anon key → `[]` (not a dump of all rows).
2. Anon `POST /rest/v1/profiles` → RLS / permission error.
3. Signed-in user A can read/update only their own profile row.
4. User A cannot change `plan` / `plan_status` (trigger → `PLAN_CHANGE_NOT_ALLOWED`).
