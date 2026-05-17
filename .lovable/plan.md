## Poignées plus marquées sur tous les marqueurs horizontaux

Augmenter la taille **visuelle** et la **zone tactile** des poignées dans :
- `src/components/camera/CameraCalibration.tsx`
- `src/components/camera/CameraDistance.tsx`

### Changements

**Poignée visible (le rond coloré)**
- Diamètre ≈ 5 mm physiques → `h-5 w-5` (20 px CSS) au lieu de `h-4 w-4`.
- Bordure blanche plus épaisse (`border-2` → `border-[3px]`) et `shadow-lg` conservé pour bien la voir sur n'importe quel fond.
- Toujours alignée à gauche (`left-2`) pour ne pas masquer la zone centrale de la vidéo.

**Zone tactile (le `div` cliquable autour)**
- Passe de `h-8 w-10` (32×40) à `h-12 w-16` (48×64) → couvre largement la poignée et offre une cible tactile confortable >9 mm.
- Toujours invisible (juste un hit-box), `cursor-ns-resize`, `touch-action: none`.
- Le clamp vertical existant est mis à jour : `handleH = 48` au lieu de `32`, pour que la zone reste entièrement dans l'overlay aux extrémités.

**Label**
- Repositionné en fonction de la nouvelle hauteur de poignée (suit `handleTop`).
- Léger agrandissement : `text-[10px]` → `text-[11px]` pour rester lisible à côté d'une poignée plus grosse.

### Hors scope
- Pas de changement de logique de drag, de calibration, ou de calcul `pxPerCm`.
- Pas de modification de la fluidité (déjà gérée par `requestAnimationFrame` + pointer capture sur l'overlay).
- L'épaisseur des lignes reste `h-px` (1 px) pour préserver la précision visuelle.
