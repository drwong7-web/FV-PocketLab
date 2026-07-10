## Remplacer l'icône du Vertical Jump par le logo gravé

### Étapes

1. **Préparer le logo**
   - Prendre `user-uploads://logo_jump_svg.png` (silhouette verte sur fond noir)
   - Retirer le fond noir → PNG transparent via `imagegen--edit_image` avec `transparent_background: true`
   - Enregistrer sous `src/assets/logo-jump.png` + pointer `.asset.json` via `lovable-assets`

2. **Ajouter un style « logo gravé »** dans `src/index.css`
   - Nouvelle classe `.engraved-logo` : combine `filter: drop-shadow(...)` clair en bas + `drop-shadow(...)` sombre en haut pour donner l'effet debossé, plus légère baisse d'opacité, cohérente avec `.engraved` existante (variantes dark/light).

3. **Modifier `src/pages/NewTest.tsx`** (carte Vertical jump, lignes 22-26)
   - Remplacer le bloc `<div className="flex h-12 w-12 ... gradient-primary ..."><Zap /></div>` par un `<img>` du logo avec la classe `engraved-logo`, mêmes dimensions (h-12 w-12), sans fond dégradé (l'effet gravé se lit sur la surface de la carte).
   - Retirer l'import `Zap` s'il n'est plus utilisé.

### Portée
- Seule la carte « Vertical jump » est modifiée. La carte « Linear sprint » garde son icône `TrendingUp`.
- Aucun changement de logique métier.
