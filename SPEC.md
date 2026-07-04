# SPEC — SprintLab FV Pro

> **Living specification.** Update this file in the SAME turn as any change to architecture, routes, data model, libraries, calculation protocols, or product behavior. If a change doesn't affect any of those, no update needed. Kept so another agent (Cursor, Claude Code, Codex, etc.) can continue the work with the exact same architecture and plan.

**Last updated:** 2026-07-04
**Owner:** Lovable agent (auto-maintained)
**Related docs:** `.lovable/plan.md` (ephemeral per-task plans), `mem://index.md` (agent memory rules)

---

## 1. Product

Local-first web app to plan, capture and analyze athletic performance tests (linear sprint, vertical jump) for teams. Force–Velocity (FV) profiling with on-device video analysis. No account, no server: everything stays on the device with optional **Bring-Your-Own-Cloud** sync (Google Drive, WebDAV).

Core user flows:
1. Create a team → add athletes (manual or import from PDF/DOCX/image via local OCR).
2. Run a test (Sprint linéaire or Saut vertical) → record video → auto or manual analysis.
3. Consult results (FV profile, quality score, phases, charts) → export PDF/DOCX.

---

## 2. Tech stack

- **Runtime:** Vite 5 + React 18 + TypeScript 5, TailwindCSS v3, shadcn/ui (Radix), lucide-react.
- **Router:** react-router-dom v6. **State/data:** @tanstack/react-query + React context.
- **Persistence:** `localStorage` via `src/lib/storage.ts` (namespaced `slfv:*` keys). No Supabase, no server. (Legacy `supabase/config.toml` is a placeholder, unused.)
- **Sync (drive natif du téléphone) :** `src/lib/sync/` — un seul bouton dans Réglages. `detectPreferredProvider()` choisit iCloud sur iOS/iPadOS, Google Drive sinon (fallback fichier `.slfv`). Google Drive utilise un Client ID managé (`VITE_SLFV_GDRIVE_CLIENT_ID`) + scope `drive.appdata` ; iCloud passe par l'app Fichiers d'iOS (download « Enregistrer dans Fichiers » + `<input type=file>`). Aucun compte SprintLab, aucune saisie d'URL/mot de passe. WebDAV supprimé.
- **Video / vision:** `@mediapipe/tasks-vision` for pose (jump apex detection). `requestVideoFrameCallback` / `requestAnimationFrame` for timeline. Custom video filters (`videoFilters.ts`) + stabilizer (`videoStabilizer.ts`) + One-Euro / Butterworth signal smoothing (`signalFilters.ts`).
- **Local document parsing (no API):**
  - PDF text + rasterization: `pdfjs-dist`
  - DOCX unzip + XML parse: `jszip`
  - OCR (images + scanned PDFs): `tesseract.js` (`fra+eng`)
- **Exports:** `jspdf` + `html2canvas` (PDF), `docx` + `file-saver` (DOCX).
- **Charts:** `recharts`. **Tests:** `vitest`. **Auth:** local only (`src/lib/auth.tsx`, prototype hash in `storage.ts`).

Explicitly **removed / not used**: Supabase client, any AI-key based feature (Gemini/OpenAI), device biometrics/PIN layer, encryption-at-rest.

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
    auth.tsx                   local sign in/up context
    storage.ts                 localStorage repo (users, orgs, teams, players, tests, session)
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
      adapters.ts              GoogleDrive, WebDAV
      snapshot.ts              build/restore JSON snapshot of all slfv:* keys
      manager.ts               scheduled push/pull
    import/
      athletes.ts              PDF/DOCX/image → ParsedAthlete[] (100% local)
  pages/
    Landing.tsx, Auth.tsx
    Dashboard.tsx
    Teams.tsx, TeamDetail.tsx, PlayerDetail.tsx
    NewTest.tsx (chooser) → JumpTest.tsx | SprintTest.tsx
    TestList.tsx, TestResults.tsx
    Index.tsx, NotFound.tsx
```

---

## 4. Routes (`src/App.tsx`)

Public: `/`, `/auth`.
Protected under `/app` (wraps `AppLayout`):
- `` → Dashboard
- `teams` / `teams/:teamId` / `players/:playerId`
- `tests` (list) / `tests/new` / `tests/new/jump` / `tests/new/sprint` / `tests/:testId`
Legacy alias: `/dashboard` → `/app`.

---

## 5. Data model (`src/lib/types.ts`)

- **Organization** `{ id, name }` — 1 per user account (local).
- **User** `{ id, email, name, passwordHash, organizationId }` — prototype-only hash.
- **Team** `{ id, name, organizationId, sport?, createdAt }`.
- **Player** `{ id, teamId, organizationId, firstName, lastName, birthDate?, mass, height?, position?, createdAt }`.
- **TestSession** `{ id, playerId, organizationId, createdAt, notes?, conditions?, mass, inputMode: "splits"|"position_time", splits? | positionTime?, analysis: SprintAnalysis }`.
- Jump results stored as a variant of TestSession (see `jumpDetection.ts` + `unifiedTests.ts`).

Persistence keys: `slfv:users | slfv:orgs | slfv:teams | slfv:players | slfv:tests | slfv:session`. `uid()` uses `crypto.randomUUID`.

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

Source of truth: `src/lib/jumpDetection.ts`.

Trials auto-populated from athlete mass: **0 %, 20 %, 50 %, 70 %** of body mass, rounded to nearest multiple of 5 kg. Height from either:
- Manual: `CameraCalibration.tsx` (reference height, horizontal sliding markers) + `CameraDistance.tsx` (takeoff + apex, tap-to-place, hidden until touched).
- Auto: `CameraAIJump.tsx` (MediaPipe pose → hip Y peak).

FV jump profile computed and stored via `unifiedTests.ts`.

---

## 8. Athlete import (`src/lib/import/athletes.ts`)

Entry: `parseAthletesFile(file) → ParsedAthlete[]`.
- **DOCX** — JSZip → parse `<w:tbl>/<w:tr>/<w:tc>` directly.
- **PDF (text layer)** — pdfjs → items grouped into y-bands, columns detected via x-histogram, cells snapped to columns.
- **PDF (scanned)** — page rasterized then routed through image path.
- **Image** — tesseract.js (`fra+eng`) → words + bboxes → y-cluster into lines → x-histogram into columns → snap.
- **Text/CSV** — split on tabs / 2+ spaces / `;|,`.
- Header detection (`Nom/Prénom/Taille/Poids/…`) maps columns to fields; heuristic fallback otherwise. Title rows + continuation rows (multi-line names) handled. Dedup on `lastName|firstName|birthDate`.

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

Ephemeral per-task plans live in `.lovable/plan.md` and are safe to overwrite.
