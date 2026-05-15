## Suppression complète de la cible "Athlète polyvalent"

### Changements

**1. `src/lib/sportTargets.ts`**
- Retirer l'entrée `default` de `SPORT_TARGETS` (label "Athlète polyvalent" + valeurs F0/V0/Pmax pour jump/sprint).
- Modifier `normalize()` pour retourner `null` quand le sport est vide ou non reconnu (au lieu de `"default"`).
- Modifier `getSportTargets()` pour retourner `undefined` (au lieu d'un fallback). Type de retour : `SportTargets | undefined`.
- `getJumpTarget()` / `getSprintTarget()` retournent déjà `undefined` naturellement quand il n'y a pas de cible.

**2. `src/pages/TestResults.tsx`**
- Retirer les gardes devenues inutiles :
  - `TargetSummary` : remplacer le check `label === "Athlète polyvalent"` par un simple check sur l'absence de cible (`if (!target) return null`).
  - `JumpReport` / `SprintReport` : supprimer la variable `hideTarget` et utiliser directement `getSportTargets(...)?.label` ; passer `target` et `targetLabel` directement (ils seront `undefined` automatiquement si le sport n'est pas reconnu).

### Résultat
- Aucune trace de "Athlète polyvalent" dans le code ou l'interface.
- Pour tout athlète sans sport reconnu : aucune cible affichée, ni dans l'app, ni dans les exports PDF/DOCX.
- Les sports listés (football, rugby, basketball, etc.) continuent d'afficher leurs cibles normalement.

### Fichiers
- `src/lib/sportTargets.ts`
- `src/pages/TestResults.tsx`
