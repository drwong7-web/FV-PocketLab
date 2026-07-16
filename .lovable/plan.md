
## Contexte
Le déséquilibre vient du PNG **Vertical Jump** : néon vert avec halo blanc/clair qui se dilue sur fond clair. Le PNG **Linear Sprint** est un trait crayon gris + accents verts, qui tient sur les 2 thèmes. Sans médaillon sombre, il faut soit **normaliser les PNG**, soit **appliquer un traitement CSS unifiant** au rendu.

## Alternatives (sans médaillon)

### Option A — Regénérer le logo Jump dans le même style que Sprint (recommandée)
Refaire `src/assets/logo-jump-neon.png` en style **trait crayon gris + accents lime**, cohérent avec `logo-sprint-neon.png`. Les 2 logos deviennent visuellement une paire, pas besoin de fond spécial, ils rendent identiquement en light et dark.

- Portée : 1 fichier image régénéré via `imagegen--edit_image` (référence = sprint logo).
- Effets de bord : le logo Jump change AUSSI dans le header, `JumpTest.tsx`, et les rapports PDF/DOCX. À valider avec toi.

### Option B — Silhouette monochrome via CSS mask (uniforme, thémé)
Utiliser les PNG comme **masque alpha** et remplir avec `currentColor` / une couleur sémantique. Les deux logos deviennent des silhouettes de la même couleur (ex. `text-primary` ou `text-foreground`), quel que soit leur PNG source.

- Changements : `NewTest.tsx` remplace `<img>` par un `<div>` avec `mask-image: url(...)`, `background-color: hsl(var(--primary))`.
- Résultat : rendu strictement identique en light et dark, mais on **perd les nuances internes** des logos (ils deviennent des aplats de couleur).
- Portée : uniquement les 2 cartes de `/app/tests/new`.

### Option C — Normalisation CSS agressive (garde les PNG tels quels)
Appliquer aux 2 logos un pipeline de filtres qui écrase leurs différences :
```
filter: grayscale(1) contrast(1.4) brightness(0.9);
```
puis un léger `drop-shadow` néon primary. Les deux deviennent gris + halo lime discret.

- Portée : classe `.logo-normalized` dans `src/index.css`, appliquée aux 2 `<img>` de `NewTest.tsx`.
- Simple, aucune régénération, aucun changement de layout.
- Limite : le vert vif du Jump disparaît totalement (devient gris).

### Option D — Cadre clair avec liseré primary (l'inverse du médaillon)
Poser les 2 logos sur un **médaillon clair** unifié (`bg-background` + `ring-primary/30`) au lieu de sombre. Sur thème dark ça crée une "vignette lumineuse", sur thème light ça se fond dans la carte. Rend le Jump lisible car son halo blanc n'a plus à lutter contre le fond.

- Similaire au médaillon sombre mais inversé — même quantité de travail.

## Comparatif rapide

| Option | Fidélité au néon | Effort | Effets ailleurs |
|---|---|---|---|
| A — Régénérer Jump | Perdu (nouveau style) | Moyen | Oui, partout |
| B — Mask silhouette | Perdu (aplat) | Faible | Non, isolé |
| C — Filtre grayscale | Vert perdu | Très faible | Non, isolé |
| D — Médaillon clair | Conservé | Faible | Non, isolé |

## Recommandation
**Option A** si tu veux une vraie cohérence de marque (les 2 cartes forment une paire graphique).
**Option B** si tu veux la solution la plus propre techniquement sans toucher aux assets.

Dis-moi laquelle tu retiens (ou si on garde finalement le médaillon sombre) et je l'implémente.
