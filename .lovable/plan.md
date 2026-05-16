## Objectif

1. Garder `RFmean` et l'afficher dans le rapport sprint (avec calcul précis).
2. Rendre `modelFitScore` consommé par l'UI.
3. Mesurer un vrai `videoFps` côté appareil utilisateur et le propager jusqu'au score qualité.

---

## 1. RFmean — calcul précis + affichage

**`src/lib/fvCalculations.ts`**
- Conserver le champ `RFmean?: number` dans `SprintResults` et la sortie de `calculateSprintProfile`.
- Améliorer le calcul actuel (moyenne uniforme sur tous les pas de temps) en une **moyenne pondérée par dt sur la phase d'accélération uniquement** (jusqu'à atteindre ~95 % de Vmax), ce qui est la définition usuelle du RFmean en sprint (Morin/Samozino) :
  ```
  RFmean = Σ(RF_i · dt_i) / Σ(dt_i)  pour v_i ≤ 0.95·Vmax
  ```
  Comme `dt` est constant, ça revient à une moyenne sur la fenêtre [t0, t@0.95·Vmax]. Fallback : si moins de 3 points dans la fenêtre, on garde la moyenne globale.

**`src/pages/TestResults.tsx`**
- Ajouter une `MetricCard` (ou ligne) « RFmean (%) » à côté de `RFpeak` et `DRF` dans la section sprint, avec 1 décimale.

---

## 2. Activer modelFitScore

**`src/pages/TestResults.tsx`** — carte « Score qualité » du sprint
- Lire `results.modelFitScore` (au lieu de ré-utiliser `results.r2` à cet endroit) et l'afficher comme sous-score explicite « Ajustement du modèle » en %, aux côtés de « Cohérence des splits » et « FPS vidéo ». Le champ devient ainsi réellement consommé.

---

## 3. Brancher le FPS vidéo réel

Le FPS doit refléter ce que l'appareil de l'utilisateur produit (webcam, téléphone, ou vidéo importée).

### 3a. Mesure dans `src/components/camera/SprintVideoAnalyzer.tsx`

Deux sources selon le mode :
- **Mode enregistrement** : après `getUserMedia`, lire `stream.getVideoTracks()[0].getSettings().frameRate`.
- **Mode import / après enregistrement** : sur l'élément `<video>` chargé, utiliser `video.requestVideoFrameCallback` pendant ~1 s de lecture muette pour compter les frames et déduire les FPS. Fallback : 30 fps si l'API n'est pas dispo.

Stocker dans un state `measuredFps` (arrondi à l'entier).

### 3b. Remonter au parent

Changer la signature de `onConfirm` :
```ts
onConfirm: (payload: { splits: AnalyzerSplitResult[]; videoFps?: number }) => void;
```

### 3c. `src/pages/SprintTest.tsx`
- Nouveau state `videoFps`.
- Adapter la callback `onConfirm` du `SprintVideoAnalyzer` pour la nouvelle forme et faire `setVideoFps(...)`.
- Dans `submit()`, ajouter `videoFps` à l'objet `inputs` passé à `calculateSprintProfile`.

### 3d. Aval — rien à changer
`calculateSprintProfile` transmet déjà `inputs.videoFps` à `computeSprintQualityScore` et au champ `results.videoFps`. `TestResults.tsx` affiche déjà `quality.fpsScore` et `results.videoFps` → la valeur deviendra non-nulle automatiquement.

---

## Détails techniques

- `requestVideoFrameCallback` n'est pas typé sur `HTMLVideoElement` ; déclarer un type local minimal dans l'analyzer pour éviter `any`.
- Arrondir le FPS mesuré à l'entier le plus proche (24, 30, 60…).
- Pas d'UI supplémentaire pour le FPS dans l'analyzer (info bas niveau) — la valeur apparaît dans le rapport.

---

## Fichiers modifiés

- `src/lib/fvCalculations.ts` — calcul RFmean affiné sur la phase d'accélération.
- `src/components/camera/SprintVideoAnalyzer.tsx` — mesure FPS + nouvelle signature `onConfirm`.
- `src/pages/SprintTest.tsx` — state `videoFps`, callback adaptée, passage dans `inputs`.
- `src/pages/TestResults.tsx` — affichage de `RFmean` et de `modelFitScore` dans la carte qualité.

## Hors-scope

- Aucune autre modification de la logique F-V.
- Aucun changement de schéma de stockage (tests anciens : `videoFps`/`RFmean` affichent « — » si absents).
