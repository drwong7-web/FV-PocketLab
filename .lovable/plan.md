## Goal
Replace the current local-storage prototype auth with real Lovable Cloud authentication: email/password, Google, and Apple sign-in. Keep all `/app/*` routes protected.

## Scope

### 1. Database
- Create `profiles` table (user_id, name, organization_id) with RLS (users read/update their own; insert via trigger).
- Create `organizations` table with RLS (members of an org can read it).
- Create `handle_new_user` trigger on `auth.users` that:
  - creates an organization from signup metadata (`org_name`)
  - creates a profile linking the user to that organization
- Keep existing `teams`, `players`, `tests` data flow in localStorage for now (out of scope unless asked) — only auth/identity moves to Cloud.

### 2. Auth provider rewrite (`src/lib/auth.tsx`)
- Replace local `authenticate` / `createUserAndOrg` calls with Supabase:
  - `supabase.auth.signUp({ email, password, options: { data: { name, org_name }, emailRedirectTo: window.location.origin + '/app' } })`
  - `supabase.auth.signInWithPassword({ email, password })`
  - `supabase.auth.signOut()`
  - `lovable.auth.signInWithOAuth('google' | 'apple', { redirect_uri: window.location.origin + '/app' })` for social
- Set up `onAuthStateChange` listener BEFORE `getSession()` (use the documented pattern).
- Expose `user`, `session`, `profile` (fetched from `profiles` table after sign-in), plus `signInWithGoogle`, `signInWithApple`.

### 3. Auth page (`src/pages/Auth.tsx`)
- Keep the existing email/password form (sign in + sign up tabs).
- Add **Continue with Google** and **Continue with Apple** buttons above the form, with a divider.
- Sign-up form keeps `name` and `organization` fields — passed via signup metadata so the trigger can create the org + profile.
- On success, navigate to `/app`.

### 4. Route protection (`src/components/ProtectedRoute.tsx`)
- Already wraps `/app/*` — keep it, but drive it from the new Supabase session instead of `currentUser()` from local storage. Show null while loading; redirect to `/auth` if no session.

### 5. Cleanup
- Remove `authenticate`, `createUserAndOrg`, `currentUser`, `signOut`, `hashPassword`, `listUsers`, `listOrgs` from `src/lib/storage.ts` (no longer used).
- Helper to read current user's organization id (from profile) — used by the rest of the app where `user.organizationId` is currently read.

## Configuration
- Enable Google + Apple via managed Lovable Cloud OAuth (no credentials needed from user).
- Email auth stays enabled. Email confirmation stays ON by default (user must verify before login). I'll mention this so you can disable it in Cloud → Users → Auth Settings if you want instant sign-in during testing.

## Out of scope
- Migrating existing local teams/players/tests to the database.
- Password reset flow (can add next if you want).
- Email template branding.

Confirm and I'll implement.
