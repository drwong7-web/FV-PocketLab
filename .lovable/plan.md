## Context
The user wants the tabs on `/app/tests` to look like the cards on the Teams page and to be more visually emphasized.

## Current state
- `src/pages/TestList.tsx` uses the default `TabsList` / `TabsTrigger` from `src/components/ui/tabs.tsx`.
- The default tabs have a compact `bg-muted` pill-bar style with a small active background change.
- The Teams page cards use `glass-card p-5 ... bg-gradient-to-br from-primary/10 to-transparent` with a hover border highlight.

## Plan
1. Update `src/components/ui/tabs.tsx` so `TabsList` and `TabsTrigger` adopt a card-like design inspired by the Teams page cards:
   - `TabsList`: remove the compact muted bar; use a transparent or minimal container with a small gap between triggers.
   - `TabsTrigger`: give each trigger `glass-card` styling, padding, rounded corners, and the `bg-gradient-to-br from-primary/10 to-transparent` treatment.
   - Active trigger: add a `border-primary/50` (or stronger) highlight and a subtle glow/shadow so the selected tab stands out.
   - Inactive trigger: keep a muted glass surface with hover state.
   - Preserve focus rings and accessibility attributes.
2. Verify `src/pages/TestList.tsx` still renders the three tabs (`all`, `jump`, `sprint`) correctly; adjust spacing if needed.
3. Test visually on mobile viewport (the user is currently on 390×844) to ensure the 3-column tab layout remains readable and the emphasized active state is visible.

## Outcome
The tabs on `/app/tests` will look like the team cards, with the active tab clearly highlighted.