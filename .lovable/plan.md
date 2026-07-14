# Remove load percentage labels and auto-calc logic

In `src/pages/JumpTest.tsx`, on the Jump Test page (Essais section), remove the preset load percentages displayed next to each trial row ("00 kg", "~ 20%", "~ 50%", "~ 70%") along with all the underlying logic that computes them from body mass.

## Changes in `src/pages/JumpTest.tsx`

1. **Delete helpers**
   - Remove `roundTo5(n)` function.
   - Remove `defaultTrials(mass)` function.

2. **Simplify initial trials state**
   - Keep the current initial 4 empty trials (`{ load: 0, jumpHeight: 0 }` × 4) — no change needed there since it's already empty.

3. **Remove auto-population effects**
   - In the effect that reacts to `athleteId`: keep setting `bodyMass` and `pushOff` from athlete data, but remove the `setTrials(defaultTrials(a.mass))` call.
   - Remove the entire effect that watches `bodyMass` and calls `setTrials(defaultTrials(mass))`.

4. **Remove the labels column in the Trials card**
   - Remove the `const labels = ["00 kg", "~ 20%", "~ 50%", "~ 70%"];` line.
   - Remove the `<span className="w-14 ...">{labels[i] ?? ""}</span>` cell inside each trial row.
   - Remove the empty `<span className="w-14"></span>` header spacer.
   - Adjust the grid template columns from `grid-cols-[auto_1fr_1fr_auto]` (header) and `grid-cols-[auto_1fr_1fr_auto_auto_auto]` (rows) to drop the leading `auto` column: `grid-cols-[1fr_1fr_auto]` (header) and `grid-cols-[1fr_1fr_auto_auto_auto]` (rows).

## Out of scope

- No changes to translations, calculations (`calculateJumpProfile`), camera/AI components, or any other page.
- The "+" button to add trials, the load/height inputs, and the AI/Camera/Delete buttons per row remain unchanged.
