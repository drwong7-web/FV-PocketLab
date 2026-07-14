## Problème
Sur la page **Nouveau test de saut** (`/app/tests/new/jump`), l'en-tête de colonne **"Jump height (cm)"** (et probablement **"Load (kg)"**) n'est pas aligné avec le bord gauche des `<Input>` situés en dessous.

## Diagnostic
Dans `src/pages/JumpTest.tsx` :
- La ligne d'en-tête utilise `grid-cols-[1fr_1fr_auto]` (3 colonnes).
- Les lignes de saisie utilisent `grid-cols-[1fr_1fr_auto_auto_auto]` (5 colonnes).
- Les `<Input>` ont un padding horizontal `px-3`, mais les `<span>` d'en-tête n'ont aucun padding.

Résultat : le texte de l'en-tête démarre au bord de la colonne, alors que le contenu de l'input est décalé de `px-3`.

## Plan de correction
1. **Uniformiser la grille d'en-tête** dans `src/pages/JumpTest.tsx` :
   - Remplacer `grid-cols-[1fr_1fr_auto]` par `grid-cols-[1fr_1fr_auto_auto_auto]`.
   - Placer les labels dans les deux premières colonnes.
   - Ajouter trois `<span></span>` vides pour occuper les colonnes des boutons d'action (IA, caméra, suppression).

2. **Aligner visuellement les labels avec les inputs** :
   - Ajouter `px-3` aux `<span>` de labels `loadKg` et `jumpHeightCm` pour correspondre au padding intérieur des `<Input>`.

3. **Vérification** :
   - Vérifier le rendu desktop et mobile (viewport 768 px et 1280 px) pour s'assurer que les titres sont désormais alignés avec le début des cases.
   - Ne pas toucher à la logique de calcul, aux types, ni au backend.

## Fichier concerné
- `src/pages/JumpTest.tsx`

Aucune mise à jour de `SPEC.md` n'est nécessaire car il s'agit d'un ajustement visuel local sans impact sur l'architecture ou les comportements publics.