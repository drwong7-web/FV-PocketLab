## Objectif

Teinter les 4 logos (sprint + jump sur `/app/tests/new`, logo titre de `SprintTest`, logo titre de `JumpTest`) avec le dégradé `--gradient-primary` du thème actif, pour qu'ils s'adaptent automatiquement au thème choisi.

## Approche

Utiliser la technique CSS **mask-image** : le PNG devient un masque alpha, et le fond de l'élément affiche le dégradé du thème. Cela recolore intégralement le logo tout en préservant sa silhouette et sa transparence.

## Plan

1. **Nouvelle classe utilitaire `.themed-logo`** dans `src/index.css` :
   ```css
   .themed-logo {
     background: var(--gradient-primary);
     -webkit-mask: var(--logo-src) center / contain no-repeat;
             mask: var(--logo-src) center / contain no-repeat;
   }
   ```
   L'URL du logo est passée via la variable CSS inline `--logo-src`.

2. **Remplacer les `<img>` par `<div>` masqués** dans :
   - `src/pages/NewTest.tsx` (2 logos)
   - `src/pages/SprintTest.tsx` (logo titre)
   - `src/pages/JumpTest.tsx` (logo titre)

   Exemple :
   ```tsx
   <div
     role="img"
     aria-label={t("linearSprint")}
     style={{ ["--logo-src" as string]: `url(${logoSprint})` }}
     className="themed-logo h-14 w-14"
   />
   ```
   Les dimensions et l'`alt`/`aria-label` sont conservés. Les attributs de priorité de chargement ne sont plus nécessaires (le PNG reste préchargé via l'import Vite et l'effet `preload` déjà en place dans `NewTest`).

3. **Conserver le préchargement** existant dans `NewTest.tsx` pour que le masque soit disponible immédiatement.

Aucune modification des couleurs du thème ni du dégradé — on réutilise `--gradient-primary` déjà défini dans `src/index.css`.

## Détails techniques

- Fichiers modifiés : `src/index.css`, `src/pages/NewTest.tsx`, `src/pages/SprintTest.tsx`, `src/pages/JumpTest.tsx`.
- Compatibilité : `mask` + `-webkit-mask` couvre tous les navigateurs cibles (Chrome, Safari, Firefox récents).
- Si le thème change, le dégradé se met à jour instantanément sans recharger les images.
- Le rendu "néon" original est remplacé par une silhouette teintée — c'est une conséquence attendue de la teinte au thème.
