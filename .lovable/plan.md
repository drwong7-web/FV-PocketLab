## Problèmes constatés

1. **Barre de progression saccadée / bloquée** : la position du curseur est mise à jour uniquement via `onTimeUpdate` (≈ 4 Hz), donc visuellement haché. Pire : `measureFpsFromVideo()` est déclenché sur `onLoadedMetadata`, ce qui lance une **lecture silencieuse parallèle** de la vidéo (jusqu'à 1 s) puis remet `currentTime` à la position de départ. Cela bloque/saute la lecture utilisateur juste après l'ouverture de la vidéo et perturbe la timeline.
2. **Vidéo partiellement cachée** : `<video className="block w-full" />` sans contrainte verticale. Une vidéo portrait (téléphone) déborde la `Card` (`max-h-[95vh]` avec header, contrôles, panneaux, footer) → le bas de la vidéo est masqué.

---

## Correctifs (`src/components/camera/SprintVideoAnalyzer.tsx`)

### 1. Mesure FPS non bloquante
- Ne plus appeler `measureFpsFromVideo()` dans `onLoadedMetadata`.
- Déclencher la mesure **à la première lecture utilisateur** (`onPlay`), avec un drapeau `fpsMeasuredRef` pour ne le faire qu'une fois. La mesure se fait alors **pendant la lecture réelle** via `requestVideoFrameCallback` (compte les frames sur ~1 s), sans `play()`/`pause()`/seek artificiels.
- Fallback inchangé : si l'API n'existe pas, on ne mesure pas (le score FPS reste à 0).

### 2. Barre de progression fluide
- Remplacer la mise à jour `currentTime` par `onTimeUpdate` par une boucle `requestAnimationFrame` active uniquement pendant la lecture (`playing === true`). Cleanup via `useEffect` retournant `cancelAnimationFrame`.
- Conserver `onTimeUpdate` comme filet de sécurité quand la vidéo est en pause (seek manuel).

### 3. Affichage vidéo adéquat
- Conteneur vidéo : `flex items-center justify-center bg-black` avec hauteur bornée `max-h-[55vh]` (et `max-h-[45vh]` en mobile via responsive ou simplement `max-h-[50vh]`).
- Élément `<video>` : `className="max-h-[50vh] w-auto max-w-full object-contain"` pour gérer correctement portrait **et** paysage sans recadrage ni débordement.
- Les overlays de calibration (lignes 0 m / réf) restent positionnés sur le conteneur en `relative`, mais ils doivent suivre la **largeur réelle** de la vidéo, pas celle du conteneur. Solution simple : limiter le conteneur lui-même à la largeur de la vidéo via `inline-block` + `mx-auto`, ou positionner les overlays via un wrapper interne dont la largeur s'aligne sur la vidéo (`relative` autour du `<video>` lui-même).

### Implémentation des overlays
Structurer comme :
```
<div className="flex justify-center bg-black rounded-md overflow-hidden">
  <div ref={overlayRef} className="relative" onClick={onOverlayClick}>
    <video … className="block max-h-[50vh] w-auto max-w-full" />
    {overlays calib + step}
  </div>
</div>
```
Ainsi `overlayRef.getBoundingClientRect()` correspond bien à la zone vidéo affichée, la calibration reste exacte.

---

## Hors-scope
- Pas de changement de la logique de calibration, IA pose, splits, ou plumbing FPS vers `calculateSprintProfile`.
- Pas de changement aux autres modes (caméra live, choix).

## Fichier modifié
- `src/components/camera/SprintVideoAnalyzer.tsx` uniquement.
