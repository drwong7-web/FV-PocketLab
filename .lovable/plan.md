## Goal

Extend the onboarding so that after the user taps **"Create a team"** on step 3 of the carousel, guided coach marks continue on the Teams page and then on the team detail page, pointing at the key buttons (create team, import players, add player) with short explanations — instead of just dropping the user on an empty page.

## Flow

```text
Carousel step 3 → "Create a team"
        │
        ▼
/app/teams                 ← Coach step A: highlight "New" (create team) button
        │  (user creates a team & opens it)
        ▼
/app/teams/:id             ← Coach step B: highlight "Import players" button
                           ← Coach step C: highlight "Add player" button
                           ← Coach step D: final "You're all set" → mark onboarding done
```

The user can dismiss ("Skip tour") at any point; dismiss = mark onboarding done.

## What to build

### 1. Onboarding state (`src/lib/onboarding.ts`)
- Add a small resume state stored in `localStorage`:
  - `slfv:onboarding:resume` = `"teams-create" | "team-import" | "team-add" | "done"`
- Helpers: `setOnboardingResume(step)`, `getOnboardingResume()`, `clearOnboardingResume()`.
- Keep the existing "onboarding done" flag; clearing resume also fires `markOnboardingDone()` at the end.

### 2. Trigger from carousel (`src/components/onboarding/OnboardingCarousel.tsx`)
- On step 3 CTA ("Create a team"): instead of `markOnboardingDone()`, call `setOnboardingResume("teams-create")` before navigating to `/app/teams`. The full-screen carousel still closes so the user can interact.

### 3. New component: `src/components/onboarding/OnboardingCoach.tsx`
A lightweight coach-mark overlay:
- Props: `targetSelector`, `title`, `description`, `placement` ("top" | "bottom"), `onSkip`, `onNext`, `nextLabel`.
- Finds the target element via `querySelector`, reads its bounding rect, and renders:
  - A dimmed backdrop with a "cut-out" rectangle (SVG mask or 4 absolutely-positioned divs) around the target so it visually pops.
  - A small floating card (`glass-card`, primary gradient) anchored below/above the target with a title, description, "Skip" ghost button and a primary "Next" / "Got it" button.
- Repositions on `resize` and `scroll` (throttled).
- Falls back to a centered modal if the target isn't found within ~1s (e.g. list empty, layout not ready).

### 4. Wire coach marks on the two pages

**`src/pages/Teams.tsx`**
- Tag the "New" button with `data-onb="teams-create"`.
- If `getOnboardingResume() === "teams-create"`, mount `<OnboardingCoach targetSelector='[data-onb="teams-create"]' ... />`.
- Detect team creation: after `createTeam(...)` succeeds in `onCreate`, call `setOnboardingResume("team-import")` so the next page picks it up.
- Also: when user clicks a team row while state is still `"teams-create"`, advance to `"team-import"` too (covers the case where a team already existed).

**`src/pages/TeamDetail.tsx`**
- Tag the "Import players" trigger and the "Add player" trigger with `data-onb="team-import"` and `data-onb="team-add"`.
- On mount, read `getOnboardingResume()`:
  - `"team-import"` → show coach on Import button; **Next** → advance state to `"team-add"`.
  - `"team-add"` → show coach on Add player button; **Next** → show final centered coach: "You're all set — ready to run your first test" with a **"New test"** button that navigates to `/app/tests/new`, plus a **"Later"** button. Both call `clearOnboardingResume()` + `markOnboardingDone()`.

### 5. Translations (`src/lib/settings.tsx`)
Add keys used by the coach marks (FR / EN / AR):
- `onbCoachSkip` — "Skip tour" / "Passer" / "تخطي"
- `onbCoachNext` — "Next" / "Suivant" / "التالي"
- `onbCoachGotIt` — "Got it" / "Compris" / "حسناً"
- `onbTeamsCreateTitle`, `onbTeamsCreateDesc` — explaining the "New" button on Teams
- `onbTeamImportTitle`, `onbTeamImportDesc` — explaining the Import Players button (mentions PDF/CSV/roster import)
- `onbTeamAddTitle`, `onbTeamAddDesc` — explaining the Add Player button (manual entry)
- `onbTeamDoneTitle`, `onbTeamDoneDesc`, `onbTeamDoneRunTest`, `onbTeamDoneLater`

### 6. Replay
- The existing "Revoir l'introduction" button already resets the onboarding done flag; also clear `slfv:onboarding:resume` there so re-running the carousel starts clean.

## Non-goals
- No changes to the Tests page onboarding (already handled by carousel step 4 CTA "New test").
- No changes to the actual create-team / import / add-player logic — only visual overlays and state transitions.
- No new dependencies (no react-joyride etc.); the coach mark is a ~120-line local component using Tailwind + semantic tokens.

## Files touched
- `src/lib/onboarding.ts` (extend)
- `src/lib/settings.tsx` (add ~10 translation keys)
- `src/components/onboarding/OnboardingCarousel.tsx` (change step 3 CTA behavior)
- `src/components/onboarding/OnboardingCoach.tsx` (new)
- `src/pages/Teams.tsx` (data attr + mount coach + advance state on create)
- `src/pages/TeamDetail.tsx` (data attrs + mount coach + final step)
- `src/components/AppLayout.tsx` (clear resume in "Replay onboarding")
