## Problème constaté

Dans `src/pages/JumpTest.tsx`, la ligne d'en-tête des essais (`Load (kg)` / `Jump height (cm)`) et les lignes de saisie utilisent toutes deux `grid-cols-[1fr_1fr_auto_auto_auto]`.

Mais les trois colonnes `auto` de l'en-tête sont **vides** (simples `<span></span>`), tandis que dans les lignes de saisie elles contiennent des boutons d'action (icônes). En CSS Grid, une piste `auto` vide s'effondre à 0, alors que la même piste avec un bouton occupe ~2.5rem. Résultat : les deux premières pistes `1fr` n'ont pas la même largeur entre l'en-tête et les lignes, donc le titre `Load (kg)` déborde au-dessus de la zone de `Jump height (cm)`.

## Plan de correction

1. **Unifier les largeurs de colonnes** dans `src/pages/JumpTest.tsx` :
   - Remplacer `grid-cols-[1fr_1fr_auto_auto_auto]` par `grid-cols-[1fr_1fr_2.5rem_2.5rem_2.5rem]` à la fois sur la ligne d'en-tête et sur les lignes d'essais.
   - `2.5rem` correspond exactement à la largeur des `<Button size="icon">` (`h-10 w-10`).

2. **Conserver l'alignement du texte** :
   - Garder `px-3` sur les `<span>` de l'en-tête pour que leur padding gauche/droit corresponde à celui des `<Input>`.
   - Laisser les trois derniers `<span>` vides ; la grille fixe leur réservera l'espace des boutons.

3. **Vérifier le rendu** :
   - Lancer `bun run build` pour s'assurer qu'il n'y a pas d'erreur.
   - Vérifier visuellement que les titres `Load (kg)` et `Jump height (cm)` s'alignent exactement au-dessus des cases de saisie correspondantes, sur desktop comme sur mobile.

## Fichier concerné

- `src/pages/JumpTest.tsx` (lignes ~201 et ~209)

Aucun autre fichier n'est nécessaire ; c'est un ajustement de grille purement visuel.