## Objectif
En affichage smartphone, le titre "Jump height" du tableau des essais passe sur deux lignes. L'objectif est d'élargir légèrement les deux premières colonnes (Load / Jump height) pour que les titres restent sur une seule ligne.

## Contexte actuel
Dans `src/pages/JumpTest.tsx`, la grille des essais utilise actuellement :
```
grid-cols-[1fr_1fr_2.5rem_2.5rem_2.5rem]
```
Les deux premières colonnes sont en `1fr` et partagent l'espace disponible. Les trois colonnes suivantes sont fixes à `2.5rem` (boutons d'action).

## Plan
1. **Augmenter l'espace disponible pour les deux champs**
   - Passer les colonnes d'action de `2.5rem` à une valeur légèrement inférieure (par exemple `2.25rem`) si les icônes restent cliquables, OU
   - Augmenter la largeur minimale des deux premières colonnes en remplaçant `1fr` par `minmax(0, 1fr)` ou en ajoutant une largeur minimale explicite.

2. **Privilégier une solution simple et robuste**
   - Remplacer `grid-cols-[1fr_1fr_2.5rem_2.5rem_2.5rem]` par `grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_2.25rem_2.25rem_2.25rem]` pour donner un peu plus d'espace à la première colonne sans casser l'alignement avec les boutons.
   - Alternative : réduire le `gap` de `gap-2` (0.5rem) à `gap-1` (0.25rem) pour gagner quelques pixels.

3. **Vérifier le rendu mobile**
   - Tester en prévisualisation mobile (390×844) que "Jump height" et "Load" restent sur une ligne.
   - Vérifier que les boutons d'action restent cliquables et bien alignés.

## Fichier concerné
- `src/pages/JumpTest.tsx` (lignes 201 et 209)

## Non concerné
- Aucune modification de logique métier, de traduction, ou de calcul.