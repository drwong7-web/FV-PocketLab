# UI Polish Pass — Refine Current Direction

Goal: sharpen what's already there. Same electric-lime dark cockpit aesthetic, more consistent and considered. No new visual language.

## 1. Icons (Lucide) — consistency

- Standardize sizes: `h-4 w-4` inline, `h-5 w-5` in buttons, `h-6 w-6` in section headers/nav. Ban ad-hoc `h-3.5`, `h-7`.
- Uniform `strokeWidth={1.75}` for a lighter, modern feel (vs default 2).
- Color: always `text-muted-foreground` at rest, `text-primary` on active/hover — never hardcoded colors.
- Wrap common icon usages (nav item, metric badge, section title) in small helper classes so they can't drift.
- Sweep: `NavLink`, `AppLayout`, `TestResults`, `NewTest`, `JumpTest`, `SprintTest`, `TestList`, `Teams`, dialogs.

## 2. Logo treatment

- Single source: `src/assets/fv-logo.png` referenced consistently.
- Header/nav: smaller (28px), engraved-logo effect kept, tighter alignment with app title, subtle primary glow on hover only.
- Auth / landing: larger (72px) with existing glow.
- Report exports (PDF/DOCX): already implemented — verify sizing (70px) and left-align against blue title.
- Favicon: keep as-is (already branded).

## 3. Buttons & cards

- Buttons:
  - Unify height to `h-10` (default) / `h-9` (sm) / `h-11` (lg).
  - Consistent radius `rounded-xl` (matches `--radius`).
  - Icon-left spacing: `gap-2`, icon `h-4 w-4`.
  - Primary: subtle `shadow-glow` on hover, not always-on.
  - Ghost/outline hover uses `bg-secondary/60` instead of full `bg-secondary`.
- Cards (`glass-card` + shadcn `Card`):
  - Consistent inner padding `p-5` (was mixed p-4/p-6).
  - Border `border-border/60` for softer edges.
  - Metric cards: tabular nums, label uppercase tracking-wide muted, value `metric-value`, delta chip with subtle bg.
  - Active/selected state: 1px primary ring instead of thick border.

## 4. Typography & hierarchy

- Page title: `text-2xl font-display` + short muted subtitle underneath — apply uniformly across pages that currently mix h1/h2 sizes.
- Section headings inside pages: `text-sm font-semibold uppercase tracking-wide text-muted-foreground`.
- Numbers everywhere: `.mono-num` (already defined) on all metric values, table cells with numbers, times, forces.
- Body: keep Inter, add `text-[15px] leading-relaxed` for long-form paragraphs (recommendations, interpretations).
- RTL check: keep AR alignment correct after spacing changes.

## Files to touch

- `src/index.css` — small additions: `.icon-nav`, `.icon-inline`, `.section-label`, tweak `glass-card` padding var.
- `src/components/AppLayout.tsx`, `src/components/NavLink.tsx` — nav icon/logo sizing + hover.
- `src/components/MetricCard.tsx` — final metric card spec.
- `src/pages/*.tsx` — apply page title pattern, section labels, icon sizes, button variants. No logic changes.
- `src/components/ui/button.tsx` — verify variant heights/radius match spec (small tweak only if needed).

## Out of scope

- No changes to color tokens, gradient palette, or dark/light theme values.
- No changes to F-V calculations, report content, routing, data model, or SPEC-tracked behavior.
- No new dependencies.

## Verification

- Visual: Playwright screenshots of Dashboard, NewTest, JumpTest, SprintTest, TestResults, TestList, Teams — before/after in FR + AR (RTL sanity).
- Build passes; no TS errors.
- SPEC.md: no update needed (pure UI/presentation).
