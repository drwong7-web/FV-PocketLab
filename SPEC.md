# SPEC — FV PocketLab

> **Living specification.** Update this file in the SAME turn as any change to architecture, routes, data model, libraries, calculation protocols, or product behavior. If a change doesn't affect any of those, no update needed. Kept so another agent (Cursor, Claude Code, Codex, etc.) can continue the work with the exact same architecture and plan.

**Last updated:** 2026-08-09
**Owner:** local maintainers
**Related docs:** `DESIGN.md` (visual system), `mem://index.md` (agent memory rules when present)

---

## 1. Product

Local-first web app to plan, capture and analyze athletic performance tests (linear sprint, vertical jump) for teams. Force–Velocity (FV) profiling with on-device video analysis.

**Split of responsibilities:** identity and subscription state live in Supabase; all performance data (teams, athletes, tests, videos) stays on the device, with optional native drive sync (Google Drive on Android/desktop, iCloud Drive on iOS/iPadOS, `.slfv` file fallback).

**Plans:** `free` (limited features, ads), `pro_monthly` (recurring, full access, no ads), `lifetime` (one-time purchase, full access, no ads). Payments will be handled by Creem; the schema is already shaped for it (`plan_source`, `creem_customer_id`, `creem_subscription_id`, `plan_events`) but no checkout is wired yet.

Core user flows:
1. Create a team → add athletes (manual or import from PDF/DOCX/image via local OCR).
2. Run a test (Sprint linéaire or Saut vertical) → record video → auto or manual analysis.
3. Consult results (FV profile, quality score, phases, charts) → export PDF/DOCX.

---

## 2. Tech stack

- **Runtime:** Vite 5 + React 18 + TypeScript 5, TailwindCSS v3, shadcn/ui (Radix), lucide-react.
- **Router:** react-router-dom v6. **State/data:** @tanstack/react-query + React context.
- **Persistence:** IndexedDB via **Dexie** (`src/lib/db/kvStore.ts`, DB `slfv`, table `kv`) with a synchronous in-memory cache hydrated at boot (`bootstrapKvStore()` called in `main.tsx` before render). App data (`slfv:users|orgs|teams|players|tests`, `fv:*`) lives in IndexedDB — much larger quota than `localStorage`, no eviction in private mode. **Login session** (`slfv:session`) is stored in **`sessionStorage` only** so closing the PWA / killing it from the app switcher logs the user out; teams and tests remain on device. `src/lib/storage.ts` is a thin façade over the cache and keeps its historical synchronous API. Legacy `localStorage` keys are auto-migrated one-shot on first boot (backup kept in `slfv:__backup-v0`). Falls back to `localStorage` transparently if IndexedDB fails to open. No cloud backend — local-first only. A native SQLite adapter via `@capacitor-community/sqlite` can be plugged into the same façade for Capacitor builds.
- **Sync (drive natif du téléphone) :** `src/lib/sync/` — un seul bouton dans Réglages. `detectPreferredProvider()` choisit iCloud sur iOS/iPadOS, Google Drive sinon (fallback fichier `.slfv`). Google Drive utilise un Client ID managé (`VITE_SLFV_GDRIVE_CLIENT_ID`) + scope `drive.appdata` ; iCloud passe par l'app Fichiers d'iOS (download « Enregistrer dans Fichiers » + `<input type=file>`). Aucun compte FV PocketLab, aucune saisie d'URL/mot de passe. WebDAV supprimé.
- **Video / vision:** `@mediapipe/tasks-vision` for pose (jump apex detection). `requestVideoFrameCallback` / `requestAnimationFrame` for timeline. Custom video filters (`videoFilters.ts`) + stabilizer (`videoStabilizer.ts`) + One-Euro / Butterworth signal smoothing (`signalFilters.ts`).
- **Local document parsing (no API):**
  - PDF text + rasterization: `pdfjs-dist`
  - DOCX unzip + XML parse: `jszip`
  - OCR (images + scanned PDFs): `tesseract.js` (`fra+eng`)
- **Exports:** `jspdf` + `html2canvas` (PDF), `docx` + `file-saver` (DOCX).
- **Auth:** Supabase Auth (`@supabase/supabase-js`) — **email + password only**, no OAuth providers. Client in `src/lib/supabase/client.ts`, provider in `src/lib/auth.tsx`. Session persists in `localStorage` (key `slfv:supabase-auth`) so a signed-in user keeps working offline. Password reset goes through Supabase's email link (`/auth/reset`); the old WebAuthn device-unlock reset and `src/lib/webauthn.ts` are removed.
  - **Offline sign-in:** sign-up requires a connection. On each successful online password sign-in, a PBKDF2-SHA256 verifier (210k iterations, random salt) is cached in `src/lib/offlineAuth.ts` under `slfv:offline-auth`, so the same email can sign in again with no network.
  - **Local bridge:** `ensureLocalUserForRemote()` in `storage.ts` mirrors the Supabase identity into the local repo, reusing the `organizationId` already present on the device so existing teams/tests are never orphaned. The local `User` id **is** the Supabase auth user id.
- **Entitlements:** `src/lib/plan.ts` derives `fullAccess` / `adsEnabled` from plan + status + period end, mirroring the `public.has_full_access` SQL function so the rules also work offline. Cached per user under `slfv:entitlements`. `FREE_LIMITS` is declared but **not enforced yet** — it waits on the ad/limit spec.

Explicitly **removed / not used**: any AI-key based feature (Gemini/OpenAI), encryption-at-rest, WebAuthn.

---

## 3. Repository layout

```
src/
  App.tsx                      routes
  main.tsx                     bootstrap
  index.css                    design tokens (semantic HSL, dark theme first)
  components/
    AppLayout.tsx              shell (sidebar + <Outlet/>)
    ProtectedRoute.tsx         gate → /auth if no local user
    NavLink.tsx, MetricCard.tsx, FVChart.tsx
    camera/
      CameraTimer.tsx          jump countdown
      CameraCalibration.tsx    horizontal draggable markers (jump ref height)
      CameraDistance.tsx       horizontal draggable markers (takeoff / apex)
      CameraAIJump.tsx         MediaPipe apex auto-detect
      SprintVideoAnalyzer.tsx  playback + draggable 0m/ref markers + crop range for AI window
    players/
      ImportPlayersDialog.tsx  PDF/DOCX/image → athletes preview → save
    ui/                        shadcn primitives
  lib/
    auth.tsx                   Supabase auth provider (+ offline sign-in, entitlements)
    supabase/
      client.ts                configured Supabase client, isSupabaseConfigured, isOnline
      types.ts                 hand-written DB types (regenerate with supabase gen types)
    plan.ts                    plan model, entitlement derivation, offline cache
    offlineAuth.ts             PBKDF2 verifier cache enabling offline sign-in
    storage.ts                 local repo (orgs, teams, players, tests) + Supabase→local bridge
    types.ts                   User, Organization, Team, Player, TestSession
    settings.tsx               user prefs (units, sync target)
    sprintEngine.ts            Sprint analysis pipeline (splits or position/time → SprintAnalysis)
    fvCalculations.ts          FV profiling: F0, V0, Pmax, RFmax, DRF, RFmean, phases, quality score
    jumpDetection.ts           SJ/CMJ/Loaded FV jump calcs
    poseDetection.ts / poseDetector.ts   MediaPipe wrapper + split heuristics
    signalFilters.ts           One-Euro, Butterworth
    videoFilters.ts            sharpen/exposure/contrast on canvas
    videoStabilizer.ts         optical-flow-lite stabilization
    weather.ts                 geolocation → air density for sprint corrections
    sportColors.ts, sportTargets.ts, unifiedTests.ts
    docxExport.ts, pdfReport.ts, exportTarget.ts
    localHistory.ts            undo/redo for edits
    sync/
      config.ts                sync target selection + secrets
      adapters.ts              Google Drive, iCloud Drive / Files, `.slfv` file fallback
      snapshot.ts              build/restore JSON snapshot of all slfv:* keys
      manager.ts               scheduled push/pull
    import/
      athletes.ts              PDF/DOCX/image → ParsedAthlete[] (100% local)
  pages/
    Auth.tsx                   email/password sign in + sign up, reset-link request
    AuthCallback.tsx           email-confirmation redirect target
    ResetPassword.tsx          password-reset link target
    Dashboard.tsx
    Teams.tsx, TeamDetail.tsx, PlayerDetail.tsx
    NewTest.tsx (chooser) → JumpTest.tsx | SprintTest.tsx
    TestList.tsx, TestResults.tsx
    NotFound.tsx
```

---

## 4. Routes (`src/App.tsx`)

Public: `/auth` (email + password), `/auth/callback` (email-confirmation landing; the Supabase client consumes the code via `detectSessionInUrl`), `/auth/reset` (password-reset link target). Root `/` redirects to `/app` if a session exists, else `/auth` (no marketing landing in this project).
Protected under `/app` (wraps `AppLayout`):
- `` → Dashboard
- `teams` / `teams/:teamId` / `players/:playerId`
- `tests` (list) / `tests/new` / `tests/new/jump` / `tests/new/sprint` / `tests/:testId`
Legacy alias: `/dashboard` → `/app`.

---

## 5. Data model (`src/lib/types.ts`)

- **Organization** `{ id, name }` — 1 per user account (local).
- **User** `{ id, email, name, organizationId }` — local mirror of the Supabase user; `id` is the Supabase auth user id. Passwords are never stored here (only the PBKDF2 offline verifier in `slfv:offline-auth`).
- **Team** `{ id, name, organizationId, sport?, createdAt }`. `sport` is a canonical enum key from `SPORT_GROUPS` in `src/lib/sportTargets.ts` (team sports, athletics sub-disciplines, other F-V sports, or `"other"` balanced fallback). Legacy free-text values are still normalized by `getSportTargets`/`getSportLabel`.
- **Player** `{ id, teamId, organizationId, firstName, lastName, birthDate?, mass, height?, position?, createdAt }`.
- **TestSession** `{ id, playerId, organizationId, createdAt, notes?, conditions?, mass, inputMode: "splits"|"position_time", splits? | positionTime?, analysis: SprintAnalysis }`.
- **Local jump/sprint tests** snapshot the athlete name, body mass and the current team sport at save time. Result pages also resolve the player/team sport as a fallback for older tests whose snapshot has `sport: null`, so sport-specific F-V targets remain available.
- Jump results stored as a variant of TestSession (see `jumpDetection.ts` + `unifiedTests.ts`).

Persistence keys (IndexedDB): `slfv:users | slfv:orgs | slfv:teams | slfv:players | slfv:tests`. Ephemeral session (sessionStorage): `slfv:session`. `uid()` uses `crypto.randomUUID`.

---

## 5b. Supabase schema (`supabase/migrations/`)

Apply with `supabase db push`, or paste each migration into the SQL editor in order. Env vars live in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); both are public by design — the anon key only reaches what RLS allows. **Never** put the service-role key in a `VITE_*` variable.

Migrations:

1. `20260809000000_auth_profiles_plans.sql` — tables, triggers, base own-row RLS, admin RPC.
2. `20260809000001_rls_hardening.sql` — revoke `anon`/`PUBLIC`, `FORCE ROW LEVEL SECURITY`, explicit deny policies for deletes / plan_events mutations.

Operator helpers: `supabase/VERIFY_RLS.sql` (SQL checks), `supabase/AUTH_CHECKLIST.md` (Auth dashboard settings).

- **`public.profiles`** — one row per `auth.users` row, created by the `on_auth_user_created` trigger.
  `id, email, full_name, avatar_url, plan, plan_status, plan_source, current_period_end, cancel_at, creem_customer_id, creem_subscription_id, is_admin, created_at, updated_at`.
  `plan ∈ (free, pro_monthly, lifetime)`, `plan_status ∈ (active, trialing, past_due, canceled, expired)`, `plan_source ∈ (system, manual, creem)`.
- **`public.plan_events`** — append-only audit of plan/status transitions, written automatically by the `log_plan_change` trigger and by `admin_set_plan`. This is where Creem webhooks should log their payloads.
- **Functions:** `is_admin()`, `has_full_access(uuid)`, `my_entitlements()` (single RPC the client calls on sign-in), `admin_set_plan(target_user, new_plan, new_status, period_end, note)`.
- **Security model:** RLS lets a signed-in user SELECT/INSERT/UPDATE **their own** profile (`id = auth.uid()`), and SELECT their own `plan_events`. Deletes and plan_events mutations are denied. A `BEFORE UPDATE` trigger (`guard_profile_billing_columns`) raises `PLAN_CHANGE_NOT_ALLOWED` if a non-privileged caller touches billing columns or `is_admin`. Plans change only via the service role (webhook) or `admin_set_plan` called by an admin. Never grant a paid feature on the strength of the client-side check alone. Teams/athletes/tests stay on-device and are outside Postgres RLS.
- **Live verification (2026-08-09):** REST probe with the project anon key — `GET /rest/v1/profiles` and `/plan_events` returned `[]`; anon `POST` to both returned `42501` (“violates row-level security policy”). So base RLS from migration 000 is **already applied** on the project. Still run migration 001 for revoke/`FORCE` hardening, then `VERIFY_RLS.sql`.
- **Editing a user's status by hand:** set `is_admin = true` on your own profile once from the SQL editor, then call `select public.admin_set_plan('<user-uuid>', 'lifetime', 'active', null, 'comped');`.

---

## 6. Sprint linéaire — pipeline

Source of truth: `src/lib/sprintEngine.ts` + `src/lib/fvCalculations.ts`.

Protocols: 30 m / 40 m / 60 m (splits every 5 or 10 m) OR position/time series from video.
1. **Capture** — `SprintVideoAnalyzer.tsx`: record MediaRecorder (WebM), then playback with custom timeline (rAF-driven), draggable 0 m + reference-distance markers (1 px lines, 20 px handles left-anchored, 48×64 hit box), and a crop range to bound the AI analysis window.
2. **Split detection** — piecewise-linear pixel↔meter interpolation between placed markers → time at each split.
3. **Signal smoothing** — One-Euro on position, Butterworth for velocity.
4. **FV model** — exponential v(t) = vmax·(1 − e^(−t/τ)); derive F0, V0, Pmax, RFmax, DRF, RFmean (weighted over acceleration phase), phases (accel / max V / decel), `modelFitScore` (R²), quality score.
5. **Environmental correction** — `weather.ts` geolocates → air density → drag correction.

Outputs → `TestSession.analysis` → `TestResults.tsx` (Recharts: distance-time, velocity, power) with quality score card, protocol recap, athlete interpretation.

---

## 7. Saut vertical — pipeline

Source of truth: `src/lib/jumpDetection.ts` (détection) + `src/lib/fvCalculations.ts` (`calculateJumpProfile`).

Trials auto-populated from athlete mass: **0 %, 20 %, 50 %, 70 %** of body mass, rounded to nearest multiple of 5 kg. Height from either:
- Manual: `CameraCalibration.tsx` (reference height, horizontal sliding markers) + `CameraDistance.tsx` (takeoff + apex, tap-to-place, hidden until touched).
- Auto: `CameraAIJump.tsx` (MediaPipe pose → hip Y peak).

FV jump profile (Samozino et al. 2008 / 2012), pour chaque essai i avec M = masse corporelle, Lᵢ = charge externe, hᵢ = hauteur de saut, hPO = distance de poussée, g = 9.81 :
- `mᵢ = M + Lᵢ` ; `F̄ᵢ = mᵢ·g·(1 + hᵢ/hPO)` (N) ; `v̄ᵢ = √(g·hᵢ/2)` (m/s) ; `P̄ᵢ = F̄ᵢ·v̄ᵢ` (W).
- Normalisation par la **masse corporelle M** : `F_rel = F̄ᵢ/M` (N/kg), `P_rel = P̄ᵢ/M` (W/kg).
- Régression linéaire moindres carrés sur `(v̄ᵢ, F_rel,ᵢ)` → `F0` (N/kg) et pente `SFV`. Puis `V0 = −F0/SFV`, `Pmax = F0·V0/4`, `R²` reporté.
- Pente optimale par forme fermée : avec `p = Pmax_rel`, `d = hPO`, `Δ = (pd/4)² + (gd/6)³`, `u = ∛(pd/4 + √Δ) + ∛(pd/4 − √Δ)` → `V0_opt = 2u`, `F0_opt = 2p/u`, `SFV_opt = −p/u²`, `h_opt = 2u²/g`.
- `FVimbalance = 100·(SFV/SFV_opt − 1)` — négatif = déficit de force, positif = déficit de vitesse. Classification par bandes (95–105 % équilibré parfait, 90–110 % équilibré, sinon force/vitesse).

Résultats stockés via `unifiedTests.ts`.


---

## 8. Athlete import (`src/lib/import/athletes.ts`)

Entry: `parseAthletesFile(file) → ParsedAthlete[]`.
- **DOCX** — JSZip → parse `<w:tbl>/<w:tr>/<w:tc>` directly.
- **PDF (text layer)** — pdfjs → items grouped into y-bands, columns detected via x-histogram, cells snapped to columns.
- **PDF (scanned)** — page rasterized then routed through image path.
- **Image** — canvas preprocessing (white background, upscale, grayscale/contrast) → tesseract.js (`fra+eng`) using TSV/blocks/text outputs with `PSM.AUTO` then `PSM.SPARSE_TEXT` fallback → words + bboxes → y-cluster into lines → x-histogram into columns → snap.
- **Text/CSV** — split on tabs / 2+ spaces / `;|,`.
- Header detection (`Nom/Prénom/Taille/Poids/…`) maps columns to fields; heuristic fallback otherwise. Title rows + continuation rows (multi-line names) handled. If OCR collapses a table into single lines, a compact “liste nominative” parser extracts numbered rows like `.15. NOM PRENOM DATE TAILLE POIDS`. Dedup on `lastName|firstName|birthDate`.

UI: `components/players/ImportPlayersDialog.tsx` (dropzone + editable preview table before save).

---

## 9. Design system rules

- Colors, gradients, shadows are **semantic tokens in `src/index.css`** (HSL). Never hardcode `text-white`, `bg-black`, `bg-[#...]` in components.
- Dark-first theme. shadcn variants only.
- Video markers: 1 px lines, left-anchored 20 px handles, 48×64 px invisible hit-box for touch.
- Page transitions: no `key` on `<Outlet/>`; no full remount (fixes flash).

---

## 10. Update policy (self-maintenance)

Whenever a change touches any of the below, update SPEC.md in the same turn:
- Routes / navigation
- `types.ts` shapes or persistence keys
- Any file inside `src/lib/` that alters public behavior
- Camera / video / analysis pipeline
- Import parser behavior
- Added, removed or replaced dependencies
- Design system rules

Bump the `Last updated` date. Prefer diffs over rewrites. Keep this file under ~500 lines.

Ephemeral per-task plans may live in agent tooling outside the repo and are safe to overwrite.
