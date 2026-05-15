## Goal

In `CameraAIJump`, remove the separate "Crop for AI analysis" panel (Start/End sliders + buttons) and put the trim markers directly on the video's playback bar.

## Changes (only `src/components/camera/CameraAIJump.tsx`)

1. **Drop the native `<video controls>`** in `review` phase — native controls can't host custom marks.
2. **Build a custom timeline bar** placed just under the video, replacing both the native controls and the existing trim panel:
   - Full-width track representing `0 → duration`.
   - A highlighted segment between `trimStart` and `trimEnd` (primary color, lower opacity).
   - Two draggable handles (start / end) rendered as vertical marker lines with grab targets, positioned on the track.
   - A playhead indicator that follows `currentTime`.
   - Click anywhere on the track → seek to that time.
   - A small play/pause button on the left, and `mm:ss.cs / mm:ss.cs` time readout on the right.
3. **Hide the entire "Crop for AI analysis" box** (lines ~367–419): the start/end sliders, the "Set start/end = current" buttons, the reset button, and the helper text are removed. Trim state (`trimStart`, `trimEnd`) is kept and now driven exclusively by the new in-bar handles.
4. **Loop logic** in `onTimeUpdate` stays as is (loops between `trimStart` and `trimEnd` when no result yet).
5. After analysis (when `result` is set), the trim handles are hidden and the bar acts as a regular scrubber so the user can review takeoff/apex/landing.

## Technical details

- Implement the bar with a single `div` track using `position: relative`. Handles and playhead are absolutely positioned at `left: ${(time / duration) * 100}%`.
- Drag handling: `onPointerDown` on each handle → `setPointerCapture` → `pointermove` updates `trimStart`/`trimEnd` clamped to `[0, other-0.05]`; `pointerup` releases.
- Clicking the track (not on a handle) seeks the video; dragging a handle does not seek.
- Use existing semantic tokens (`bg-primary`, `bg-primary/30`, `bg-white/20`, `text-muted-foreground`).
- No changes to `analyze()`, detection logic, or other camera components.
