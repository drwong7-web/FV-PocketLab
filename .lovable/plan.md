## Supprimer la cible "Athlète polyvalent" des rapports de test

### Contexte
Le fichier `src/lib/sportTargets.ts` définit une cible par défaut nommée **"Athlète polyvalent"** (clé `default`). Cette cible s'affiche dans les rapports de test (`TestResults.tsx`) via le composant `TargetSummary` et est transmise au graphique `FVChart` lorsqu'aucun sport spécifique n'est renseigné pour l'athlète.

### Changements
1. **Dans `src/pages/TestResults.tsx`** :
   - Modifier le composant `TargetSummary` pour retourner `null` quand le sport normalisé est `"default"` (cible polyvalent).
   - Dans `JumpReport` et `SprintReport`, ne pas transmettre les `target*` au `FVChart` quand `sportLabel === "Athlète polyvalent"` afin que le graphique n'affiche pas la zone cible bleue et le libellé "Athlète polyvalent".

2. **Pas de changement dans `src/lib/sportTargets.ts`** : on conserve la cible par défaut dans la base de données / logique métier au cas où elle serait utilisée ailleurs ; on la masque simplement dans l'affichage des rapports.

### Fichiers concernés
- `src/pages/TestResults.tsx`
