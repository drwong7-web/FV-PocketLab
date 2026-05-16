## Objectifs

1. Repères de calibration (0 m et `refMeters` m) **déplaçables au pixel près** sur la vidéo.
2. Sur la timeline vidéo, **deux poignées de crop** (début/fin) qui délimitent la portion analysée par l'IA.

---

## 1. Repères 0 m / X m déplaçables

### Fichier : `src/components/camera/SprintVideoAnalyzer.tsx`

- Chaque ligne de calibration (`calib.x0`, `calib.xRef`) devient une poignée draggable :
  - Ajouter une zone de saisie large (≈ 16 px) centrée sur la ligne, `cursor-ew-resize`, `pointer-events-auto`.
  - Sur `pointerdown` → capture du pointeur, on entre en mode drag (`draggingMarker: "x0" | "xRef" | null`).
  - Sur `pointermove` → calcul `xNorm = (clientX − overlayRect.left) / overlayRect.width`, clamp `[0, 1]`, met à jour `calib.x0` ou `calib.xRef`.
  - Sur `pointerup` / `pointercancel` → fin du drag.
- `onOverlayClick` (mode calibration initial) reste inchangé pour la première pose.
- Quand le drag est actif, désactiver `onOverlayClick` (early return si on vient de drag).
- Affichage : agrandir un peu les étiquettes "0m" / "{refMeters}m" et ajouter un petit handle visuel (cercle 8 px) au milieu vertical pour signaler que c'est manipulable.
- Astuce précision : flèches clavier ←/→ quand un marqueur est focus → déplacement de 1 px (= `1 / overlayRect.width`).

Aucun changement sur la logique de calcul aval (`runAI`, `computeSplitTimesFromSamples`) puisqu'elle lit déjà `calib.x0` / `calib.xRef`.

---

## 2. Crop de la fenêtre d'analyse IA sur la timeline

### `src/components/camera/SprintVideoAnalyzer.tsx`

- Nouveaux états : `cropStart: number`, `cropEnd: number` (en secondes), initialisés à `[0, duration]` quand `duration` change.
- Remplacer l'`<input type="range">` actuel par un composant timeline custom :
  - Piste horizontale `relative h-6`.
  - **Zone grisée** avant `cropStart` et après `cropEnd` (`bg-muted/60`).
  - **Zone active** `[cropStart, cropEnd]` (`bg-primary/15`).
  - **Curseur de lecture** = ligne fine pilotée par `currentTime` (déjà mis à jour par rAF).
  - **Deux poignées draggables** (cropStart, cropEnd) en `cursor-ew-resize`, avec contraintes :
    - `cropStart ≥ 0`, `cropStart ≤ cropEnd − 0.1`.
    - `cropEnd ≤ duration`, `cropEnd ≥ cropStart + 0.1`.
  - Clic sur la zone active (hors poignée) → seek (`videoRef.currentTime = …`).
- Bornes affichées sous la timeline : `cropStart.toFixed(2)s → cropEnd.toFixed(2)s` + bouton "Réinitialiser le crop".
- Le contrôle `startOffset` ("marquer départ") reste indépendant : le crop sert à l'IA, `startOffset` au calcul de t=0.

### `src/lib/poseDetection.ts`

- Étendre `PoseTrackingOptions` :
  ```ts
  startTime?: number; // default 0
  endTime?: number;   // default video.duration
  ```
- Dans `trackPelvisX` :
  - `const start = Math.max(0, opts.startTime ?? 0);`
  - `const end = Math.min(duration, opts.endTime ?? duration);`
  - Boucle : `let t = start; while (t < end) { … }`.
  - Progression : `(t − start) / (end − start)`.

### Branchement `runAI`

```ts
const collected = await trackPelvisX(v, {
  sampleRateHz: 30,
  onProgress: setAiProgress,
  startTime: cropStart,
  endTime: cropEnd,
});
```

`computeSplitTimesFromSamples` reste inchangé (il filtre déjà à partir de `startTimeOffset`).

---

## Hors-scope
- Pas de zoom vidéo / recadrage spatial (seulement temporel sur la timeline).
- Pas de changement à la mesure FPS, au flux d'enregistrement caméra, ni aux modes parents.

## Fichiers modifiés
- `src/components/camera/SprintVideoAnalyzer.tsx`
- `src/lib/poseDetection.ts`
