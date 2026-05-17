## Corrections calibration (CameraCalibration.tsx)

### 1. Marqueurs cachés tant que l'utilisateur n'a pas touché l'écran

**Problème** : les marqueurs initiaux (yTop=0.3 / yBottom=0.7) peuvent se retrouver hors de la zone tactile utile, et la poignée à `-top-4` peut sortir en haut quand yRatio est très petit, rendant la manipulation impossible.

**Solution** :
- Nouvel état `placed: boolean` (faux au départ après snap/upload).
- Tant que `!placed`, ne rien afficher (lignes + poignées masquées) ; un texte d'aide au centre indique « Touchez l'écran pour placer le repère ».
- Au premier `pointerdown` sur l'overlay : on calcule le Y du clic, on positionne `yTop = y - 0.1` et `yBottom = y + 0.1` (clampés 0..1), on passe `placed = true`, et on démarre immédiatement le drag du marqueur le plus proche.
- `resetMarkers()` remet `placed = false` (au snap, upload, retake).
- La poignée garde sa hit-box 32×40 px mais on clampe `topPx` pour qu'elle ne sorte jamais de l'overlay (translateY ajustée si la poignée déborderait en haut/bas).

### 2. Blackout au "Retake"

**Cause** : `retake()` appelle `openCamera()` mais `liveVideoRef.current` est encore `null` à ce moment-là (le `<video>` n'est monté qu'après `setPhase("idle")`, donc au render suivant). Le stream est attaché à un élément inexistant → écran noir.

**Solution** :
- `retake()` ne fait que nettoyer l'URL photo, reset markers, `setPhase("idle")`.
- Ajouter un `useEffect` qui se déclenche quand `phase === "idle"` : si pas de stream actif, ouvrir la caméra ; quand le stream est prêt, l'attacher au `liveVideoRef.current` (qui existe maintenant) et appeler `.play()`.
- Cleanup adapté pour éviter les doubles streams.

### Fichier modifié
- `src/components/camera/CameraCalibration.tsx`
