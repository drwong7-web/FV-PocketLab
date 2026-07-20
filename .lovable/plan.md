# Plan — Add `DESIGN.md` design reference

Create a new root-level `DESIGN.md` file that documents the complete visual/UX design system of the app, so another code editor (Cursor, Claude Code, Codex…) can continue the work with the exact same design language. It complements `SPEC.md` (which covers architecture) — no code changes, no dependency changes.

## File location
- `DESIGN.md` at the repo root, next to `SPEC.md` and `README.md`.

## Sections included

1. **Purpose & scope** — living document, update rules (mirror SPEC.md policy), links to `SPEC.md` and `mem://index.md`.
2. **Design principles** — dark-first sport-science cockpit; local-first privacy; mobile-first PWA (iOS safe areas); no generic AI aesthetics; no hardcoded colors in components.
3. **Brand** — logo (`src/assets/fv-logo.png`), `.logo-well` medallion treatment, `.engraved-logo` neon deboss, iOS icons + splash screens under `public/icons/`, `public/splash/`.
4. **Color system** — full list of semantic HSL tokens from `src/index.css` (dark + `.light` overrides): background/foreground, card, popover, primary (electric lime `84 92% 55%`) + primary-glow, secondary, muted, accent (cyan `198 92% 58%`), destructive, warning, success, border/input/ring, phase-accel/max/decel, force/velocity, sidebar tokens. Rule: never use `text-white`, `bg-black`, `bg-[#...]` — always tokens.
5. **Gradients & shadows** — `--gradient-primary`, `--gradient-accent`, `--gradient-surface`, `--gradient-hero`, `--shadow-glow`, `--shadow-card`, `--shadow-elevated`.
6. **Typography** — Inter stack, `.font-display` (700, -0.01em), `.page-title` / `.page-subtitle` / `.section-label` / `.metric-value` / `.mono-num`, tabular numerics for metrics, feature settings.
7. **Radius & spacing** — `--radius: 0.85rem`, Tailwind spacing conventions, safe-area padding on `#root`.
8. **Motion** — `--transition-smooth` easing, no `<Outlet/>` remount, no flash on route change.
9. **Components & patterns**
   - `glass-card` (surface + border + shadow).
   - `engraved` / `engraved-surface` (dark + light variants).
   - `logo-well` medallion.
   - shadcn/ui primitives via variants only; tabs use glass-card active state.
   - MetricCard, FVChart usage conventions.
   - Accent color swatches (3D radial gradient) in Settings.
10. **Forms & inputs** — hidden number spinners on desktop, mobile numeric keyboard preserved; no default blue tap highlight (`-webkit-tap-highlight-color: transparent`); hover/active states use `primary/10`.
11. **Camera & video markers** — 1 px lines, left-anchored 20 px handles, 48×64 invisible hit-box for touch.
12. **Charts (Recharts)** — sport-target overlay via `sportColors.ts`, phase colors, F/V semantic tokens, tabular numerics on axes.
13. **Navigation & layout** — `AppLayout` shell, sidebar tokens, back links (ArrowLeft) on test pages, section titles without numbering.
14. **Onboarding** — 3-slide carousel, `CoachMark` highlight pattern for guided tour (Teams → add athlete/import).
15. **PWA presentation** — install modal/banner style, splash background `#0f1419`, iOS standalone safe-area handling in `src/index.css`.
16. **i18n** — every user-facing string lives in `src/lib/settings.tsx` translations, not hardcoded in components.
17. **Update policy** — same rule as SPEC.md: any change to tokens, gradients, shadows, typography classes, component patterns, or brand assets must bump `Last updated` in `DESIGN.md` in the same turn.

## Format
- Markdown, ~250–400 lines, tables for tokens, fenced `css` blocks for canonical snippets copied from `src/index.css`.
- No emojis. Under the 500-line ceiling used for SPEC.md.

## Out of scope
- No code, config, or asset changes.
- No update to `SPEC.md` (architecture unchanged).
- No new dependencies.
