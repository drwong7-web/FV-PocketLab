## Objectif
Retirer entièrement la carte « Qualité du modèle » de la page de résultats du test (interface + code mort).

## Modifications dans `src/pages/TestResults.tsx`

1. **Supprimer le composant `ModelQualityCard`** (lignes 482-507) ainsi que l'import devenu inutile `CheckCircle2` / `AlertTriangle` s'ils ne sont plus utilisés ailleurs (à vérifier au moment de l'édition).
2. **Retirer l'usage dans `JumpReport`** (ligne 623) :
   `<ModelQualityCard r2={...} points={...} label="Régression F = F0 − Sfv·V" />`
3. **Retirer l'usage dans `SprintReport`** (lignes 679-684) :
   `<ModelQualityCard r2={...} points={...} rmse={...} label="..." />`

## Conservé
- Le `R²` affiché sous le graphique F-V et le composant `R2Explanation` (définition + interprétation) restent en place — ils fournissent déjà l'info essentielle au coach.
