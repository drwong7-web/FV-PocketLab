# Plan — Convert Pocket Lab into a fully iOS-compatible PWA

## Goal
Full PWA: installable on iPhone/iPad, offline-capable after first load, iOS 16.4+ push notifications, and custom splash screens for every iPhone/iPad size. All app icons reuse the existing FV logo.

## 1. Manifest — `public/manifest.webmanifest`
- `name`: "Pocket Lab" · `short_name`: "Pocket Lab"
- `start_url`: `/` · `scope`: `/` · `id`: `/`
- `display`: `standalone` · `orientation`: `portrait`
- `background_color` / `theme_color`: `#0f1419` (matches splash)
- `lang`: `fr`
- `icons`: 192, 384, 512 (`any`) + 512 (`maskable`), all derived from FV logo

## 2. Icons (derived from `src/assets/fv-logo.png`)
Generated into `public/`:
- `icon-192.png`, `icon-384.png`, `icon-512.png`
- `icon-maskable-512.png` (logo centered on a `#0f1419` safe zone)
- `apple-touch-icon.png` (180×180 — iOS uses this, ignores manifest icons)
- `favicon.png` (replaces `favicon.ico`)

## 3. iOS splash screens
iOS shows a white splash unless a matched `apple-touch-startup-image` is provided per device size + orientation. Generated to `public/splash/` for the full current lineup:
- iPhone: SE, 8, 8+, X/XS, XR, 11, 11 Pro Max, 12/13 mini, 12/13/14, 12/13/14 Pro Max, 14 Pro, 14 Pro Max, 15 Pro Max
- iPad: 9.7", 10.2", 10.5", 10.9", 11", 12.9"
- Both portrait and landscape variants

Each = FV logo centered on `#0f1419`. `index.html` will get one `<link rel="apple-touch-startup-image">` per size with the correct `media="(device-width:...) and (device-height:...) and (-webkit-device-pixel-ratio:...)"` query.

## 4. `index.html` head tags
```html
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Pocket Lab">
<!-- plus ~30 apple-touch-startup-image links, one per device -->
```
Keep existing `theme-color=#0f1419` and `viewport-fit=cover`. Delete `public/favicon.ico`.

## 5. Safe-area CSS — `src/index.css`
Add `env(safe-area-inset-*)` padding on the app shell so status bar (notch) and home-indicator don't overlap content in standalone mode. Bottom nav (if any) gets `padding-bottom: env(safe-area-inset-bottom)`.

## 6. Offline support (service worker via `vite-plugin-pwa`)
Following the Lovable PWA skill rules:
- Add `vite-plugin-pwa` with `registerType: "autoUpdate"`, `generateSW`, `devOptions.enabled: false`, `injectRegister: null`.
- Precache the built app shell (JS/CSS/HTML) with revisioned hashed assets → `CacheFirst`.
- HTML navigations → `NetworkFirst` (avoid stale white screens).
- Exclude `/~oauth` from navigation fallback.
- Single registration wrapper (`src/pwa/register.ts`) that refuses to register when:
  - `!import.meta.env.PROD`
  - inside an iframe
  - hostname starts with `id-preview--` / `preview--`
  - hostname is/ends `.lovableproject.com`, `.lovableproject-dev.com`, `.beta.lovable.dev`
  - URL has `?sw=off` (kill switch — also unregisters existing `/sw.js`)
- Wrapper imported once from `src/main.tsx`.
- The app's data (IndexedDB) is already local-first; the SW covers only the app shell so the UI opens offline.

**Preview note to the user**: offline mode only activates on the published `.lovable.app` URL (or custom domain), not in the Lovable editor preview.

## 7. Push notifications (iOS 16.4+)
iOS requires the app to be added to the home screen first, then Notification permission is requested from an in-app user gesture. Scope:
- Add a `Notification.requestPermission()` trigger in Settings (button "Activer les notifications"), only shown when `'Notification' in window`.
- Register a `PushManager` subscription against a **VAPID public key**.
- Store the subscription locally (this app is local-first, no backend to fan-out messages).

**Honest limitation**: without a server, iOS will never actually deliver a push — Apple's push service needs a server that holds the VAPID private key to send messages. To make push actually work end-to-end we'd need a small backend (Lovable Cloud edge function + a `push_subscriptions` table). I'll wire the client side now (permission + subscription + local `showNotification` for foreground reminders), and flag the server piece as a follow-up you can enable when you want real remote pushes. Confirm on approval if you want me to also stand up the backend now.

## 8. SPEC.md
Bump `Last updated`, add a "PWA / offline / iOS install" section describing manifest, SW scope, and iOS caveats.

## Files touched
- New: `public/manifest.webmanifest`, `public/icon-*.png`, `public/apple-touch-icon.png`, `public/favicon.png`, `public/splash/*.png`, `src/pwa/register.ts`, notifications helper
- Edited: `index.html`, `src/index.css`, `src/main.tsx`, `vite.config.ts`, `src/pages/*` (Settings for notifications toggle), `SPEC.md`
- Deleted: `public/favicon.ico`
- Dependency: `vite-plugin-pwa` (dev)

## iOS caveats (unavoidable)
- No install prompt UI — user must open Share → "Sur l'écran d'accueil". I'll add a small first-visit hint on iOS Safari.
- Manifest fields (`name`, `start_url`, `scope`, `display`) cache at install; later changes require reinstall.
- Push works only iOS 16.4+ and only after Add-to-Home-Screen.
