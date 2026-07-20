# DESIGN — SprintLab FV Pro / F-V Pocket Lab

> **Living design reference.** Update this file in the SAME turn as any change to design tokens, gradients, shadows, typography classes, component patterns, brand assets, or global UX rules. Companion to `SPEC.md` (architecture) — read both before working on the app.

**Last updated:** 2026-07-20
**Owner:** Lovable agent (auto-maintained)
**Related docs:** `SPEC.md`, `mem://index.md`, `src/index.css` (source of truth for tokens).

---

## 1. Purpose

Give another code editor (Cursor, Claude Code, Codex, another Lovable agent…) everything it needs to keep the visual and interaction language of the app consistent without re-deriving it from source. All values below are mirrored from `src/index.css` and the components they document — if you change one, update the other in the same commit.

---

## 2. Design principles

1. **Dark-first sport-science cockpit.** Deep near-black backgrounds, electric lime primary, cyan accent, tabular numerics for every metric. The light theme exists (`.light` class) but the app defaults to dark.
2. **Local-first, private by default.** No online branding cues (no "cloud" iconography, no account avatars from remote services). Everything reads as an on-device instrument.
3. **Mobile-first PWA.** Layouts must work at 390×844 CSS px first, then scale up. iOS safe-area insets are honored on `#root`. Touch targets ≥ 44×44 px; camera markers use a 48×64 px invisible hit-box.
4. **No generic AI aesthetics.** No default Inter-on-white purple/indigo gradients, no interchangeable hero/nav/footer. Commit to the neon-on-graphite direction.
5. **Never hardcode colors in components.** No `text-white`, `bg-black`, `bg-[#...]`, no raw hex. Always use the semantic tokens below via Tailwind classes (`bg-primary`, `text-muted-foreground`, …) or `hsl(var(--token))` in inline styles / charts.
6. **All user-facing copy goes through `src/lib/settings.tsx` translations.** No hardcoded FR/EN strings in components.

---

## 3. Brand

- **Logo asset:** `src/assets/fv-logo.png` (managed via `.asset.json`). Square, transparent, neon "FV" mark on black.
- **App name (UI):** "Pocket Lab" in the auth title, "F V Pocket Lab" / "SprintLab FV Pro" in metadata.
- **Tagline:** `FORCE VELOCITY PROFILER — IN YOUR POCKET` (multiline, uppercase, muted).
- **Logo treatments:**
  - `.logo-well` — dark radial medallion behind the logo on cards. Adds primary-tinted inner ring + inner shadow. Keeps neon assets on identical backgrounds in both themes.
  - `.engraved-logo` — deboss/neon glow (dark top edge + primary underline glow) used for header logos.
  - `.logo-themed` — hue-rotate/brightness knobs for accent theming.
- **PWA assets:**
  - `public/icon-192.png`, `public/icon-384.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/favicon.ico`.
  - `public/splash/*` — 30+ iOS splash screens, background `#0f1419`, logo centered.
  - `public/manifest.webmanifest` — standalone display, dark theme color.

---

## 4. Color system

All colors are HSL, declared as raw `H S% L%` triplets so Tailwind can compose them via `hsl(var(--token) / <alpha>)`. Source of truth: `src/index.css`.

### 4.1 Dark theme (default, `:root`)

| Token | HSL | Role |
| --- | --- | --- |
| `--background` | `222 24% 7%` | Page background |
| `--foreground` | `210 30% 96%` | Body text |
| `--card` | `222 22% 10%` | Card surface |
| `--card-foreground` | `210 30% 96%` | Text on cards |
| `--popover` | `222 24% 9%` | Popovers / menus |
| `--popover-foreground` | `210 30% 96%` | — |
| `--primary` | `84 92% 55%` | Electric lime — speed / performance CTA |
| `--primary-foreground` | `222 30% 8%` | Text on primary |
| `--primary-glow` | `84 100% 65%` | Primary highlight / gradient stop |
| `--secondary` | `222 18% 16%` | Secondary surface / button |
| `--secondary-foreground` | `210 30% 96%` | — |
| `--muted` | `222 16% 14%` | Muted surface |
| `--muted-foreground` | `215 16% 62%` | Secondary text |
| `--accent` | `198 92% 58%` | Cyan — data / velocity |
| `--accent-foreground` | `222 30% 8%` | — |
| `--destructive` | `0 78% 58%` | Delete / error |
| `--destructive-foreground` | `210 30% 96%` | — |
| `--warning` | `38 95% 58%` | Warning |
| `--warning-foreground` | `222 30% 8%` | — |
| `--success` | `142 70% 48%` | Success |
| `--success-foreground` | `222 30% 8%` | — |
| `--border` | `222 18% 18%` | Borders / dividers |
| `--input` | `222 18% 16%` | Input surface |
| `--ring` | `84 92% 55%` | Focus ring (matches primary) |
| `--radius` | `0.85rem` | Base radius |

**Phase colors** (sprint acceleration/max-velocity/deceleration):
`--phase-accel: 84 92% 55%`, `--phase-max: 198 92% 58%`, `--phase-decel: 12 88% 60%`.

**F-V semantic tokens:** `--force: 12 88% 60%` (red-orange), `--velocity: 198 92% 58%` (cyan).

**Sidebar tokens:** `--sidebar-background 222 24% 8%`, `--sidebar-foreground 210 30% 96%`, `--sidebar-primary 84 92% 55%`, `--sidebar-primary-foreground 222 30% 8%`, `--sidebar-accent 222 18% 14%`, `--sidebar-accent-foreground 210 30% 96%`, `--sidebar-border 222 18% 16%`, `--sidebar-ring 84 92% 55%`.

### 4.2 Light theme (`.light` class)

Cleaner paper background with darker primary green and cyan accent. Same token names, retuned values:

| Token | HSL |
| --- | --- |
| `--background` | `210 30% 98%` |
| `--foreground` | `222 30% 10%` |
| `--card` | `0 0% 100%` |
| `--primary` | `142 70% 38%` |
| `--primary-foreground` | `0 0% 100%` |
| `--accent` | `198 92% 45%` |
| `--destructive` | `0 78% 50%` |
| `--warning` | `38 95% 48%` |
| `--success` | `142 70% 38%` |
| `--border` / `--input` | `214 20% 88%` |
| `--ring` | `142 70% 38%` |
| `--phase-accel/max/decel` | `142 70% 38%` / `198 92% 45%` / `12 78% 50%` |
| `--force` / `--velocity` | `12 78% 50%` / `198 92% 45%` |

Sidebar tokens retune to white surfaces with the green primary.

---

## 5. Gradients & shadows

```css
--gradient-primary: linear-gradient(135deg, hsl(84 92% 55%) 0%, hsl(160 80% 50%) 100%);
--gradient-accent:  linear-gradient(135deg, hsl(198 92% 58%) 0%, hsl(222 90% 60%) 100%);
--gradient-surface: linear-gradient(160deg, hsl(222 22% 11%) 0%, hsl(222 24% 8%) 100%);
--gradient-hero:    radial-gradient(ellipse at top, hsl(84 92% 55% / 0.18), transparent 60%),
                    radial-gradient(ellipse at bottom right, hsl(198 92% 58% / 0.12), transparent 60%);

--shadow-glow:     0 0 40px hsl(84 92% 55% / 0.25);
--shadow-card:     0 8px 30px -8px hsl(222 50% 2% / 0.6);
--shadow-elevated: 0 20px 50px -20px hsl(222 50% 2% / 0.8);
```

Use `background: var(--gradient-hero)` as fixed-attachment `<body>` background — do not re-declare per page.

Motion easing: `--transition-smooth: cubic-bezier(0.22, 1, 0.36, 1)`.

---

## 6. Typography

- Stack: `Inter, ui-sans-serif, system-ui, sans-serif`. Feature settings: `"cv02","cv03","cv04","cv11"`.
- Utility classes (defined in `@layer components`):
  - `.font-display` — Inter 700, letter-spacing -0.01em. Used for section titles.
  - `.page-title` — `text-2xl font-display tracking-tight`.
  - `.page-subtitle` — `text-sm text-muted-foreground mt-1`.
  - `.section-label` — `text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground`.
  - `.metric-value` — `text-3xl font-bold tracking-tight`, tabular numerics.
  - `.mono-num` — tabular numerics (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum"`).
- Numeric UI (metrics, table cells, chart tooltips) MUST use tabular numerics.
- `lucide-react` icons use `stroke-width: 1.75` globally.

---

## 7. Radius, spacing, layout

- Base radius `--radius: 0.85rem`. Tailwind's `rounded-lg/xl/2xl` derives from this.
- `#root` receives `env(safe-area-inset-*)` padding on iOS standalone.
- `min-height: 100svh` on `html/body/#root`, `100dvh` on `#root` under `@supports (padding: max(0px))`.
- Sidebar uses `--sidebar-*` tokens; content wrapped by `AppLayout` renders in `<Outlet/>` with **no** `key` prop (prevents remount flash on route change).

---

## 8. Signature component patterns

### 8.1 `glass-card`
```css
.glass-card {
  background: var(--gradient-surface);
  @apply border border-border/60 rounded-2xl;
  box-shadow: var(--shadow-card);
}
```
Primary card container across Teams, TestResults, TestList tabs, InstallModal.

### 8.2 `engraved` / `engraved-surface`
Two-tone shadow trick to make text/surfaces look chiselled into metal (dark) or paper (light). Applied to metric labels and quality-score wells.

### 8.3 `logo-well`
Dark medallion behind card logos. Same rendering in dark and light themes.

### 8.4 `engraved-logo`
Drop-shadow stack giving the neon FV logo a deboss with primary underlight.

### 8.5 shadcn/ui usage
- Variants only — never fork a primitive to hardcode a color.
- Tabs: `src/components/ui/tabs.tsx` uses glass-card active state with primary-tinted background; used for TestList categories.
- Buttons: semantic variants (`default`, `secondary`, `ghost`, `destructive`, `outline`). Hover / active states use `bg-primary/10` (not blue).

### 8.6 Metric cards & FV chart
- `MetricCard` renders `section-label` + `metric-value` + optional delta chip.
- `FVChart` uses `--force` / `--velocity` / `--primary` / sport-target color from `src/lib/sportColors.ts` for the optimal profile overlay. Grid lines at `hsl(var(--border) / 0.4)`.

### 8.7 Accent color swatches (Settings)
3D radial-gradient balls (`radial-gradient(circle at 30% 25%, …)`) with a 2px foreground border and a background-colored outer ring, hue-rotated per preset.

---

## 9. Forms & inputs

- Number inputs hide native spinners on desktop, keep the numeric keyboard on mobile:
  ```css
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
  ```
- Global tap highlight is removed: `-webkit-tap-highlight-color: transparent` on `html`, `button`, `a`, `[role="button"]`. Hover/active feedback must come from `bg-primary/10` (or destructive equivalent), never system blue.
- Hue slider thumb (`.hue-slider`) uses a white radial gradient with a 2px foreground border and 3px background outer ring — reused for accent tuning.

---

## 10. Camera & video markers

- 1 px vertical guide lines.
- Left-anchored 20 px handle chips.
- 48 × 64 px invisible hit-box for touch drag.
- Reference-height calibration and takeoff/apex markers stay hidden until the user taps to place them.
- Sprint analyzer overlays a crop range (semi-transparent muted overlay) to bound AI analysis.

---

## 11. Charts (Recharts)

- Colors sourced only from tokens: `--force`, `--velocity`, `--primary`, `--accent`, `--phase-*`, plus sport-target from `src/lib/sportColors.ts`.
- Axes/gridlines: `hsl(var(--border))`, tick labels `text-muted-foreground` size `text-xs`.
- Tooltip container reuses the glass-card look.
- Numeric labels always tabular.

---

## 12. Navigation & page layout

- `AppLayout` = sidebar (desktop) / bottom-sheet nav (mobile) + `<Outlet/>`.
- Header on test pages shows the FV logo (via `.engraved-logo` + `.logo-well` where relevant), the page title (`.page-title`), and subtitle (`.page-subtitle`).
- **Section titles inside forms are not numbered** ("Athlete", "Protocol", "Conditions", "Splits", "Notes") — remove the numeric prefix if reintroduced.
- Test pages (JumpTest, SprintTest) include a back link at the top: `ArrowLeft` icon + label, preserving the `athleteId` query parameter.
- Trash icon (`lucide-react` `Trash2`) is the standard destructive affordance in list rows (Teams, TestList).

---

## 13. Onboarding

- 3-slide carousel (`src/components/onboarding/OnboardingCarousel.tsx`) — welcome, features, "Create a team" CTA. Do not add more slides.
- Guided tour via `src/components/onboarding/CoachMark.tsx`: dims the page and highlights a target with a primary ring + tooltip. Sequence: add team → add athlete or import from PDF/DOCX/image.

---

## 14. PWA presentation

- Install modal (`src/components/pwa/InstallModal.tsx`) and reminder banner (`src/components/pwa/InstallBanner.tsx`) — glass-card surface, primary CTA, dismissible.
- Splash background `#0f1419` (matches dark `--background`).
- iOS standalone: no browser chrome — respect safe-area padding, never place actionable UI inside `env(safe-area-inset-bottom)`.

---

## 15. Internationalization

- All strings live in `src/lib/settings.tsx` (`translations` map, currently FR + EN).
- Components consume via the `t(key)` helper from `useSettings()`.
- Sport labels, shoe types, protocol names, section titles — everything goes through `t()`. When adding a string, add both language variants in the same edit.

---

## 16. Do / don't cheatsheet

Do:
- Use semantic tokens: `bg-card`, `text-muted-foreground`, `border-border`, `text-primary`.
- Use tabular numerics for anything numeric.
- Reuse `.glass-card`, `.logo-well`, `.engraved*` utilities.
- Keep hover/active feedback on `primary/10`.
- Localize every string through `settings.tsx`.

Don't:
- Don't write `text-white`, `bg-black`, `bg-[#xxxxxx]`, `text-blue-500`, or any raw hex.
- Don't add a `key` to `<Outlet/>` — it causes route-change flash.
- Don't introduce new fonts (Poppins, Roboto, etc.).
- Don't ship purple/indigo gradients on white — they conflict with the neon-on-graphite identity.
- Don't hardcode copy in components — extend `translations` instead.
- Don't number form section titles.

---

## 17. Update policy

Whenever a change touches any of the below, update `DESIGN.md` in the same turn and bump `Last updated`:
- `src/index.css` tokens, gradients, shadows, or utility classes.
- Global typography classes or icon defaults.
- Brand assets (logo, icons, splash screens, manifest).
- Signature component patterns (glass-card, logo-well, engraved*, tabs, MetricCard, FVChart).
- Global UX rules (tap highlight, number inputs, safe-area, back-link pattern, onboarding flow).
- New/removed shadcn variants that change visual language.

Pure architecture changes (routes, storage keys, calculation pipelines) belong in `SPEC.md` instead. Keep this file under ~500 lines; prefer diffs over rewrites.
