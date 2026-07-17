## Objective

Consolidate the R² value and its interpretation inside the quality score card on test result pages.

## Current state

- **Sprint results**: a "Score de qualité" card already exists, showing `globalScore`, `modelFitScore`, `splitCoherenceScore`, `fpsScore`, a message and warnings. The actual R² value and its interpretation (`R2Explanation`) are currently displayed under the distance-time chart and again under the F-V relation card.
- **Jump results**: there is no quality card. The R² value and `R2Explanation` are shown under the F-V graph only.

## Proposed change

1. **Sprint report (`SprintReport` in `src/pages/TestResults.tsx`)**
  - Add a dedicated row inside the existing quality score `<Card>` that displays:
    - `R² = {results.r2.toFixed(3)}`
    - `<R2Explanation r2={results.r2} />`
  - Remove the redundant R² line and `<R2Explanation>` from the F-V relation card to avoid duplication.
  - Remove the R²/RMSE caption from the distance-time chart card so the quality card becomes the single source for R² interpretation.
2. **Jump report : pas de changement** 
3. **Translations**
  - No new keys needed. Reuse existing keys: `qualityScore`, `r2Explanation`, `r2Excellent`, `r2Good`, `r2Poor`.

## Acceptance criteria

- On a sprint result page, the quality score card is the only place showing the R² value and its interpretation.
- Existing cards remain present and functional.
- Build passes without errors.