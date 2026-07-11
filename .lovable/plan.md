Update the sprint test page title so the French and English translations differ:
- French: "SPRINT LINEAIRE"
- English: "LINEAR SPRINT"

The title is currently driven by the `sprintTestTitle` key in `src/lib/settings.tsx` (used via `useSettings().t("sprintTestTitle")` in `src/pages/SprintTest.tsx`). The plan is to edit that translation entry only, leaving the component template and Arabic translation unchanged.

Technical detail:
- File: `src/lib/settings.tsx`
- Change `sprintTestTitle` object so `fr` reads "SPRINT LINEAIRE" and `en` reads "LINEAR SPRINT".