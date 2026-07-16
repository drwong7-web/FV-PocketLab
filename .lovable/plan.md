## Constat
En thème clair, les 2 logos ne se comportent pas pareil :
- **Vertical Jump** = néon vert pur avec halo blanc/clair → se dilue sur fond clair, semble flou/pâle.
- **Linear Sprint** = trait crayon gris + accents verts → reste lisible et net sur fond clair.

Le déséquilibre vient des PNG eux-mêmes (styles graphiques différents), pas des filtres CSS. En thème sombre les deux marchent car le halo clair du jump ressort sur fond noir.

## Solution
Donner à **chaque conteneur logo** (sur les 2 cartes de `NewTest.tsx`) un **médaillon interne sombre** — un petit fond arrondi contrasté à l'intérieur de la carte — pour que les 2 logos soient toujours vus sur le même fond, indépendamment du thème global.

Effet : en light theme, la carte reste claire mais l'aire du logo passe sur un fond sombre discret → les 2 logos rendent de façon identique et nette.

### Changements

1. **`src/pages/NewTest.tsx`** (cartes jump + sprint uniquement)
   - Envelopper l'`<img>` dans un médaillon : `rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 ring-1 ring-primary/20 shadow-inner p-2` (via tokens sémantiques, pas de couleurs hardcodées — j'utiliserai `bg-foreground/90` ou un nouveau token `--logo-well`).
   - Ajouter un token CSS `--logo-well` dans `src/index.css` : sombre en light ET en dark, pour un rendu constant.

2. **`src/index.css`**
   - Ajouter classe utilitaire `.logo-well` avec ce fond sombre unifié + ring subtil primary + `overflow-hidden`.
   - Ajuster `.engraved-logo` pour retirer le drop-shadow "haut sombre" quand posé sur un fond déjà sombre (garder juste un léger glow néon).

### Alternative (rejetée)
Régénérer le PNG jump dans le style crayon/gris du sprint — plus lourd, casse l'identité néon actuelle sur toutes les autres pages (header, JumpTest, exports Word/PDF).

## Portée
- Uniquement les 2 cartes de `/app/tests/new`.
- Les logos sur `JumpTest.tsx`, `SprintTest.tsx`, header et rapports exportés restent inchangés.

## Vérification
Playwright screenshot `/app/tests/new` en dark **et** light, confirmation visuelle que les 2 logos ont le même rendu et la même lisibilité.