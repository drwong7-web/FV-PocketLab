## Remplacement de l'icône par le logo uploadé

### Objectif
Sur la page `/app/tests/new` (fichier `src/pages/NewTest.tsx`), remplacer l’icône `Zap` actuelle de la carte **Vertical jump** par l’image uploadée (`user-uploads://1783643485722.png`). L’image doit être intégrée dans le style gravé de la carte, positionnée à gauche, avec le titre **Vertical jump** aligné à ses côtés et centré verticalement.

### Étapes d’implémentation

1. **Externaliser l’image via Lovable Assets**
   - Utiliser `lovable-assets create` depuis `/mnt/user-uploads/1783643485722.png`.
   - Créer le pointeur `src/assets/jump-logo.png.asset.json`.
   - Importer le pointeur dans `src/pages/NewTest.tsx`.

2. **Modifier `src/pages/NewTest.tsx`**
   - Remplacer le bloc icône `Zap` (lignes ~23-25) par une balise `<img>` utilisant l’URL de l’asset.
   - Restructurer le contenu de la carte pour avoir :
     - l’image à gauche (taille contrôlée, ex. `h-12 w-auto` ou `h-14`) ;
     - le titre **Vertical jump** à côté, centré verticalement ;
     - conserver le style `font-display text-lg font-bold uppercase`.
   - Appliquer un effet gravé cohérent avec les MetricCards : ombre portée / lueur subtile via les tokens du design system (pas de couleurs en dur).

3. **Préserver le second lien**
   - La carte **Linear sprint** reste inchangée (icône `TrendingUp` conservée).

4. **Vérification visuelle**
   - Capturer un aperçu de la page `/app/tests/new` pour valider l’alignement et le rendu gravé.

### Fichiers concernés
- `src/pages/NewTest.tsx`
- `src/assets/jump-logo.png.asset.json` (nouveau)

### Non concerné
- Aucune modification de logique métier, de routing ou de données.
- Aucun changement sur la carte Linear sprint.