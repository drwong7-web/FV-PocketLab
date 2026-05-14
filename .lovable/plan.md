## Objectif

1. **Upload vidéo** depuis le stockage de l'appareil dans tous les outils caméra (`CameraAIJump`, `CameraDistance`, `CameraCalibration` si pertinent).
2. **Crop temporel** (trim début/fin) avant l'analyse IA, **uniquement dans `CameraAIJump`**.

## 1. Upload vidéo (tous les composants caméra)

Dans chaque composant en phase initiale (avant capture), ajouter un bouton secondaire "Importer une vidéo" à côté du bouton d'enregistrement :

- `<input type="file" accept="video/*" hidden ref={fileInputRef}>` déclenché par le bouton.
- À la sélection :
  - `URL.createObjectURL(file)` → alimente `videoUrl`.
  - Stoppe le flux caméra : `streamRef.current?.getTracks().forEach(t => t.stop())`.
  - Passe directement en phase `review` (skip `idle`/`recording`).
- `restart()` ramène à `idle` sans réouvrir la caméra automatiquement si l'origine était un upload — l'utilisateur choisit à nouveau (caméra ou upload).
- Dans `CameraDistance` et `CameraCalibration`, le flux est identique : on charge le fichier dans le `<video>` de revue, l'utilisateur peut scrubber et placer ses marqueurs comme avec une vidéo enregistrée.

Note : `accept="video/*"` sans `capture` ouvre le sélecteur natif (galerie/fichiers) sur mobile.

## 2. Crop temporel pour l'analyse IA (`CameraAIJump` uniquement)

En phase `review`, avant `Analyze with AI` :

- Mini "trimmer" sous la vidéo dans la `Card` :
  - Deux poignées sur une timeline `[0, duration]` → `trimStart`, `trimEnd`.
  - Boutons `[ Set start ]` / `[ Set end ]` qui reprennent `playRef.current.currentTime` pour précision.
  - Affichage `mm:ss.cs` + durée sélectionnée.
  - Pendant la lecture de prévisualisation, si `currentTime > trimEnd` → revient à `trimStart` (boucle visuelle sur la zone choisie).
- Initialisation : `trimStart = 0`, `trimEnd = duration` au `loadedmetadata`.
- `analyze()` modifié :
  - Boucle de seek de `trimStart` → `trimEnd` au lieu de `0` → `duration`.
  - `progress = (t - trimStart) / (trimEnd - trimStart)`.
  - Les timestamps issus de `detectJump` restent relatifs au premier sample, donc inchangés en aval.
  - `seekToTime(...)` continue de fonctionner sur le timeline absolu de la vidéo.

## Fichiers modifiés

- `src/components/camera/CameraAIJump.tsx` — bouton import + trimmer + analyse bornée.
- `src/components/camera/CameraDistance.tsx` — bouton import + chargement fichier en revue.
- `src/components/camera/CameraCalibration.tsx` — bouton import + chargement fichier en revue.

## Détails techniques

- Trimmer maison léger (2 ranges superposés ou track + 2 poignées custom), sans nouvelle dépendance, stylé avec les tokens existants.
- Les `URL.createObjectURL` créées sont libérées dans le cleanup déjà présent.
- Pas de changement aux moteurs de calcul (`jumpDetection`, `fvCalculations`).
