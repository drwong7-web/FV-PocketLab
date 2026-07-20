## Add back navigation to test pages

Both `JumpTest.tsx` and `SprintTest.tsx` currently lack a way to return to the previous page (unlike `NewTest.tsx` which has an "← Dashboard" link).

### Changes

1. **`src/pages/JumpTest.tsx`** — Add a back link at the top of the page (above the header row), styled like the one in `NewTest.tsx`:
   ```
   <ArrowLeft/> {t("back")}
   ```
   Navigates to `/app/tests/new` (the test type selection page), preserving the `athleteId` query string if present.

2. **`src/pages/SprintTest.tsx`** — Same treatment: back link at the top pointing to `/app/tests/new` with `athleteId` preserved.

3. **`src/lib/settings.tsx`** — Add a `back` i18n key (`"Back"` / `"Retour"`) if not already present; otherwise reuse existing key.

### Notes
- Uses `Link` from `react-router-dom` (already imported patterns exist).
- No business logic changes — purely presentational.
