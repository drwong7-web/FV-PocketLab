## Problem

Dans l'étape 2 du test Sprint, le sélecteur "Type de chaussures" affiche trois options codées en dur en français (`Pointes (sprint spikes)`, `Crampons (foot / rugby)`, `Chaussures de sprint / training`). Elles proviennent de la constante `SHOE_LABELS` dans `src/lib/fvCalculations.ts` et ne passent pas par le système i18n (`t(...)` alimenté par `src/lib/settings.tsx`), donc elles ne changent pas quand on bascule en EN ou AR.

## Solution

Traduire ces trois libellés via le même mécanisme `t(key)` que le reste de la page.

### Étapes

1. **Ajouter 3 clés i18n** dans `src/lib/settings.tsx` (FR / EN / AR) :
   - `shoeSpikes` → « Pointes (sprint) » / « Sprint spikes » / « أشواك العدو »
   - `shoeCleats` → « Crampons (foot / rugby) » / « Cleats (football / rugby) » / « أحذية بمسامير (كرة قدم/ركبي) »
   - `shoeSprint` → « Chaussures de sprint / training » / « Sprint / training shoes » / « أحذية سبرينت / تدريب »

2. **Modifier le rendu du `<select>`** dans `src/pages/SprintTest.tsx` (ligne 316-318) pour utiliser un mapping local `shoeType → clé i18n` au lieu de `SHOE_LABELS[k]`, afin de laisser `SHOE_LABELS` intact (encore utilisé côté calcul dans `fvCalculations.ts` pour le champ `shoeLabel` retourné).

### Détails techniques

- `SHOE_LABELS` reste utilisé par `computeSprint` pour retourner `shoeLabel` dans les résultats ; on ne le touche pas pour éviter des régressions sur `TestResults`. Seul l'affichage du dropdown passe par `t()`.
- Aucun autre appelant du dropdown ; le changement est purement UI/i18n.