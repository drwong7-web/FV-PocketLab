## Objective
Reorder the sprint test results page so the **Splits** card appears immediately after the **Quality score** card.

## Current state (verified)
In `src/pages/TestResults.tsx`, the `SprintReport` component currently renders cards in this order:
1. Header card
2. Protocol conditions
3. Quality score card
4. Metrics grids
5. Distance-time chart
6. Velocity-time phases chart
7. Acceleration-time chart
8. Force-velocity relation chart
9. Power-velocity chart
10. RF-velocity chart
11. **Splits card**
12. Interpretation card
13. Notes card (if any)
14. Recommendation card
15. References card

## Proposed change
Move the `<Card>` containing the splits table from position 11 to position 4 — directly after the quality score card and before the metrics grids.

## Implementation
- Edit `src/pages/TestResults.tsx` only.
- Cut the splits `<Card>` block (currently after the RF-velocity chart) and paste it immediately after the quality score `<Card>` block.
- No logic, data, or translation changes required.

## Acceptance criteria
- On a sprint test result page, the **Quality score** card is followed immediately by the **Splits** card.
- All existing cards remain present and functional.
- Jump test results are unaffected.