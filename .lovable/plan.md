# Trim range + import a local video for AI analysis

Two improvements to the AI jump analysis flow.

## 1. Trim selection on the recorded video

In `CameraAIJump.tsx`, in the **review** phase, add a custom trim bar above the video controls so the user can choose the **start** and **end** of the segment to analyze.

- Two draggable handles overlaid on a timeline representing the full video duration (`playRef.current.duration`).
- State: `trim = { start: number, end: number }`, initialized to `{0, duration}` on `loadedmetadata`.
- Visual: a thin track (bg `bg-white/15`), an inner highlighted segment (`bg-primary/60`) between the two handles, and two pill handles labeled with `mm:ss.cs`.
- Interaction: pointer drag on each handle (touch + mouse). Clamp `start < end - 0.1s`. Tapping the track sets the nearest handle to that position. A small "Reset" link restores full range.
- The video element keeps its native `controls`; the trim bar lives just below it (still inside the video container) so the bottom review Card is unchanged.
- `analyze()` is updated:
  - Loop `t` from `trim.start` to `trim.end` instead of `0..duration`.
  - `firstT` already normalizes timestamps to 0, so `result.takeoffT/landingT/apexT` stay relative to the trimmed range.
  - When seeking from the review buttons (Takeoff/Apex/Landing), offset by `trim.start` so the playhead lands at the correct absolute position.

## 2. Import a video from local storage

### A. In `CameraAIJump.tsx`
- Add a hidden `<input type="file" accept="video/*">` and a new **"Import video"** button shown in the `idle` phase (next to "Start recording"), and also as a tertiary action in the `review` phase ("Use another file").
- On file selection: revoke any existing `videoUrl`, stop the live camera stream, set `videoUrl = URL.createObjectURL(file)`, set `phase = "review"`, reset `result` and `adjustOffset`. The existing review UI (with the new trim bar) handles the rest.
- `captureFps` falls back to 30 when no camera was opened (file path).

### B. In `JumpTest.tsx`
Each trial row already has three icon buttons (AI ✨, Camera 📷, Delete 🗑). Add a fourth: **Upload 📤** (lucide `Upload` icon) between Camera and Delete. It opens `CameraAIJump` with the file picker auto-triggered.

- New state `uploadIndex: number | null` mirrors `aiIndex`.
- A new prop on `CameraAIJump`: `initialMode?: "camera" | "upload"`. When `"upload"`, the component auto-clicks the hidden file input on mount and skips opening the camera stream until the user cancels.
- The same `onConfirm` writes the detected jump height back to the trial row.

A short helper line under the trials list is updated to mention the three sources: live camera, recorded clip, or imported video file.

## Technical notes

- Files touched: `src/components/camera/CameraAIJump.tsx`, `src/pages/JumpTest.tsx`.
- No backend, no new dependencies. Uses native pointer events + `URL.createObjectURL`.
- All colors via existing semantic tokens (`bg-primary`, `bg-white/15`, etc.).
- Trim range is preserved across re-analyze passes; "Redo" resets it to full duration.
