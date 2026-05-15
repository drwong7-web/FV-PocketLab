## Issues

### 1. Black video after "Redo" in AI jump page
After tapping Redo, the camera preview goes black.

**Cause:** When `phase === "review"`, the live `<video ref={liveRef}>` is unmounted (`phase !== "review" && phase !== "analyzing"`). On Redo, `restart()` sets phase back to `idle`, so React mounts a **new** `<video>` element. `liveRef.current` now points to that fresh element which has no `srcObject`. The code only calls `openCamera()` when no live tracks exist — when tracks are still alive (camera source), nothing reattaches the stream → black frame.

**Fix:** In `CameraAIJump.tsx`, add a `useEffect([phase])` that, whenever `phase === "idle"` and `streamRef.current` exists, sets `liveRef.current.srcObject = streamRef.current` and calls `play()`. This guarantees the stream is reattached on every (re)mount of the live element. Also simplify `restart()` to just reset state — the effect handles attachment, and falls back to `openCamera()` if no stream is alive.

### 2. Black flicker on every page navigation
Each route change briefly flashes black.

**Cause:** `<main>` in `AppLayout.tsx` uses `animate-fade-in`, defined in `tailwind.config.ts` as `from { opacity: 0; transform: translateY(8px) }`. The animation runs on every `<Outlet />` change because `<main>` is the same node but its content swaps — actually it re-runs because React unmounts/mounts the route subtree. During the opacity-0 frame, the body shows through as a dark color, producing the flicker.

**Fix (smaller of two options, no design change):** Move `animate-fade-in` off the persistent `<main>` and apply a subtler fade only to the route content via a wrapper, OR simply drop the translateY and start from `opacity: 0.6` instead of `0` so there is no perceptible blackout. Concretely, update the `fade-in` keyframe in `tailwind.config.ts`:
```
from { opacity: 0.6; transform: none }
to   { opacity: 1;   transform: none }
```
and shorten duration to `0.2s`. This keeps a soft transition without the blackout flash.

## Files to change
- `src/components/camera/CameraAIJump.tsx` — add reattach effect, simplify `restart()`.
- `src/tailwind.config.ts` — soften `fade-in` keyframe (remove opacity 0 and translateY).

No business logic, no other components touched.