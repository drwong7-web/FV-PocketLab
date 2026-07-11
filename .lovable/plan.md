## Problème

Sur `/app/tests/new` (page `NewTest.tsx`), les deux logos mettent un instant à apparaître après le reste du contenu.

Cause : les fichiers PNG sont volumineux et chargés en tant qu'`<img>` classique sans priorité :
- `src/assets/logo-sprint-neon.png` → **663 KB**
- `src/assets/logo-jump-neon.png` → **250 KB**

Le navigateur les fetch après le rendu du HTML, d'où le décalage visible.

## Plan

1. **Optimiser les images** : recompresser les deux PNG (pngquant/oxipng) sans changer les dimensions, cible ~60–120 KB chacun. Fichiers remplacés au même chemin, aucun import à modifier.
2. **Marquer les `<img>` comme prioritaires** dans `src/pages/NewTest.tsx`, `src/pages/JumpTest.tsx` et `src/pages/SprintTest.tsx` :
   - `loading="eager"`
   - `decoding="async"`
   - `fetchPriority="high"`
3. **Précharger** les deux logos depuis `NewTest.tsx` via des balises `<link rel="preload" as="image" href={logoJump} />` injectées (par ex. avec un petit effet `useEffect` ou directement dans le JSX en tête de page) pour que le navigateur les demande dès que la route est montée.

Aucune modification de la logique métier, uniquement présentation et actifs.

## Détails techniques

- Fichiers touchés : `src/assets/logo-sprint-neon.png`, `src/assets/logo-jump-neon.png`, `src/pages/NewTest.tsx`, `src/pages/JumpTest.tsx`, `src/pages/SprintTest.tsx`.
- Les imports Vite (`import logoSprint from "@/assets/..."`) restent inchangés — Vite régénère le hash automatiquement après compression.
- Pas de changement de dimensions donc pas de régression visuelle attendue.
