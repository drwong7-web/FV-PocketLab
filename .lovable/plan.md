## Goal
After a fresh signup, walk the user through creating their first team and adding their first player before they reach the dashboard or any test flow.

## Flow

```text
Signup ──▶ /app/onboarding ──▶ Step 1: Create team ──▶ Step 2: Add first player ──▶ /app
                  │
                  └─ Skip allowed only on step 2 (team is required)
```

The onboarding screen shows when the authenticated user has zero teams (and zero players). Once they create one team + one player, they never see it again. Existing users with data are unaffected.

## Changes

### 1. New page `src/pages/Onboarding.tsx`
- Two-step wizard inside the existing `AppLayout` (full screen, centered card).
- Step 1 — Team: name (required), sport (optional). Reuses `createTeam(orgId, name, sport)`.
- Step 2 — Player: first name, last name, mass (kg, required), height (cm, optional), position (optional). Reuses `createPlayer({...})` with the just-created `teamId`.
- Progress dots at top ("1 of 2", "2 of 2"), back button on step 2.
- On finish: `navigate("/app", { replace: true })` + success toast.
- Optional "Skip for now" link on step 2 that still navigates to `/app` (team already saved). No skip on step 1.

### 2. Routing `src/App.tsx`
- Add `<Route path="onboarding" element={<Onboarding />} />` inside the `/app` protected layout.

### 3. Gate in `src/components/ProtectedRoute.tsx` (or a small new `OnboardingGate` wrapper)
- After auth resolves, if `listTeams(user.organizationId).length === 0` and current path is not `/app/onboarding`, redirect to `/app/onboarding`.
- Conversely, if user already has at least one team and lands on `/app/onboarding`, redirect to `/app`.
- Implement as a tiny wrapper component used inside the `/app` layout so the check runs on every protected navigation, not just initial load.

### 4. Dashboard empty state
- Remove the duplicate "Get started / Create a team" card in `src/pages/Dashboard.tsx` since onboarding now guarantees at least one team. (Keep the rest of the dashboard intact.)

## Out of scope
- Persisting teams/players to the database (still localStorage, per current architecture).
- Editing or re-running onboarding from settings.
- Importing players in bulk.

## Technical notes
- Teams/players still come from `src/lib/storage.ts` (localStorage), so the gate check is synchronous and cheap.
- Onboarding only triggers when `user.organizationId` is set; the existing auth flow already ensures that via the `handle_new_user` trigger.
