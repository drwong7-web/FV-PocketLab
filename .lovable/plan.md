## Objectif
Rendre les logos "Vertical Jump" et "Linear Sprint" sur la page **Nouveau test** plus nets, avec moins de halo/flou, tout en gardant l'esprit néon gravé.

## Diagnostic
Le flou vient principalement de la classe `.engraved-logo` dans `src/index.css` (lignes 209-223), qui empile 3 `drop-shadow` — dont un glow de 12px — appliqués aux logos des cartes dans `src/pages/NewTest.tsx`. La classe `.logo-themed` ajoute aussi une saturation/hue-rotate qui peut adoucir les bords.

## Changements

### 1. `src/index.css` — resserrer l'effet gravé
- `.engraved-logo` (dark) : remplacer le glow 12px par un glow 4-6px plus discret, garder les 2 drop-shadow d'edge à 1px (haut sombre / bas néon) pour l'effet debossé net.
- `.light .engraved-logo` : réduire pareillement le glow (10px → 4px) et remonter légèrement l'opacité à 1.
- Ajouter `image-rendering: -webkit-optimize-contrast` sur `.engraved-logo` pour un rendu plus piqué sur écrans HiDPI.

### 2. `src/pages/NewTest.tsx` — agrandir la zone d'affichage
- Passer le conteneur logo de `h-28 w-28` à un carré un peu plus grand ou garder la taille mais s'assurer que l'image utilise `h-full w-full object-contain` (le PNG source est déjà HD, donc afficher moins petit = moins de "bavure" perçue).
- Retirer `logo-themed` sur ces 2 cartes (le hue-rotate + saturation adoucit les bords des PNG néon) — ils gardent `engraved-logo` seul.

### 3. Portée
Uniquement la page `/app/tests/new` (cartes Vertical Jump + Linear Sprint). Les logos ailleurs (`JumpTest.tsx`, `SprintTest.tsx`, header) restent inchangés — leur `h-14 w-14` sans `engraved-logo` est déjà net.

## Hors périmètre
- Aucune régénération des assets PNG.
- Aucun changement de tokens de couleur, de layout, ou de logique.
- Pas de touche au thème clair global — seulement le tuning du filtre `.light .engraved-logo`.

## Vérification
Playwright screenshot de `/app/tests/new` en dark + light pour confirmer que les logos apparaissent plus piqués et sans halo diffus.