# Affiner les marqueurs glissants du saut vertical

## Changements dans `src/components/camera/CameraDistance.tsx`

1. **Déplacer les poignées à gauche**
   - Remplacer `left-1/2 -translate-x-1/2` par `left-2` (poignée ancrée sur le bord gauche de la vidéo) sur les deux handles.
   - Déplacer l'étiquette de texte du côté droit vers la gauche aussi (`left-10` au lieu de `right-1`) pour rester proche de la poignée.

2. **Affiner les lignes pour plus de précision**
   - Lignes : passer de `h-0.5` (2 px) à `h-px` (1 px).
   - Poignées : réduire de `h-6 w-6` à `h-4 w-4`, garder `border-2 border-white` pour rester visibles et saisissables au doigt.
   - Conserver `touch-action: none` et `cursor-ns-resize`.

Aucune autre logique modifiée — calcul de hauteur, drag, clavier inchangés.
