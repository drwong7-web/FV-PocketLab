## Objectif

Ajouter une détection automatique et précise du **décollage** et de l'**atterrissage** lors du test de saut vertical, à partir de la vidéo enregistrée par la caméra. Calcul automatique de la **hauteur de saut** via le temps de vol, plus suivi du maximum de **landmarks des membres inférieurs** disponibles.

## Choix du modèle IA

**Recommandation : MediaPipe Pose Landmarker (modèle `pose_landmarker_heavy.task`) via `@mediapipe/tasks-vision`.**

Comparaison rapide :

| Option | Avantages | Inconvénients |
|---|---|---|
| **MediaPipe Pose Landmarker (heavy)** ✅ | 33 landmarks corps entier, dont **12 landmarks bas du corps** (hanches, genoux, chevilles, talons, pointes de pieds, gros orteils), GPU WebGL, 100 % navigateur, gratuit, pas de backend, latence ~30 ms/frame | Modèle ~12 Mo à télécharger (mis en cache) |
| TensorFlow.js MoveNet Thunder | Très rapide | Seulement 17 landmarks, pas de talon ni pointe de pied → moins précis pour détecter contact sol |
| BlazePose (ancien) | — | Déprécié, remplacé par Pose Landmarker |
| YOLOv8-Pose ONNX | Multi-personnes | Plus lourd, latence plus haute en navigateur |
| API serveur (cloud) | Modèles plus gros | Nécessite backend, coût, latence réseau, vidéo à uploader |

**Pose Landmarker heavy** est le meilleur compromis précision/latence/coût en 100 % client. Les **landmarks bas du corps utilisés** : `LEFT_HIP (23)`, `RIGHT_HIP (24)`, `LEFT_KNEE (25)`, `RIGHT_KNEE (26)`, `LEFT_ANKLE (27)`, `RIGHT_ANKLE (28)`, `LEFT_HEEL (29)`, `RIGHT_HEEL (30)`, `LEFT_FOOT_INDEX (31)`, `RIGHT_FOOT_INDEX (32)` — soit **10 points** spécifiquement sur les membres inférieurs (auxquels s'ajoutent les hanches comme référence du tronc).

## UX

Dans `JumpTest.tsx`, à côté du bouton caméra de chaque essai, ajouter un mode **"Auto-détection IA"** :

1. L'utilisateur enregistre la vidéo du saut comme aujourd'hui (`CameraDistance` ou un nouveau composant dédié `CameraAIJump`).
2. Au lieu de cliquer manuellement décollage/apex, un bouton **"Analyser avec IA"** :
   - Lit la vidéo image par image (`requestVideoFrameCallback`).
   - Envoie chaque frame à `PoseLandmarker.detectForVideo()`.
   - Suit la position verticale moyenne des **chevilles + talons + pointes de pied** au cours du temps.
3. Détection automatique :
   - **Décollage (t₀)** : frame où la vitesse verticale des pieds dépasse un seuil et où les pieds quittent leur ligne de base (sol).
   - **Atterrissage (t₁)** : frame où les pieds reviennent à la ligne de base après l'apex.
   - **Apex** : minimum de la coordonnée Y des chevilles entre t₀ et t₁.
4. Calcul de la hauteur de saut par **deux méthodes** affichées côte à côte :
   - **Temps de vol** : h = g·(t₁−t₀)² / 8 (méthode standard, pas besoin de calibration cm/px).
   - **Déplacement vertical de la cheville** (pose-based) : différence Y(décollage) − Y(apex), convertie en mètres via `pxPerCm` si calibré.
5. Visualisation :
   - Squelette des membres inférieurs dessiné en overlay sur la vidéo en revue.
   - Courbe Y(cheville) vs temps avec marqueurs t₀, apex, t₁.
   - L'utilisateur peut ajuster manuellement les marqueurs détectés (slider ±1 frame) avant confirmation.
6. Résultat injecté dans le champ `jumpHeight` de l'essai courant.

## Fichiers à créer / modifier

**Nouveaux**
- `src/lib/poseDetector.ts` — singleton qui charge `PoseLandmarker` (lazy + cache), expose `detectVideoFrame(video, timestampMs)` et `dispose()`.
- `src/lib/jumpDetection.ts` — algorithme : prend un tableau `{t, ankleY, heelY, toeY}[]`, retourne `{ takeoffT, apexT, landingT, flightTime, peakDisplacementPx, confidence }`. Filtre Savitzky-Golay léger pour lisser le signal et seuils adaptatifs.
- `src/components/camera/CameraAIJump.tsx` — variante de `CameraDistance` orientée IA : enregistre la vidéo, déclenche l'analyse, affiche overlay squelette + graphe + marqueurs ajustables, retourne `{ jumpHeight, flightTime, method }`.

**Modifiés**
- `src/pages/JumpTest.tsx` : ajouter un bouton "✨ Auto IA" à côté du bouton caméra existant pour chaque essai. Garder l'ancien flux manuel comme repli.
- `src/lib/types.ts` / `src/lib/localHistory.ts` : étendre `JumpTrial` avec champs optionnels `flightTime`, `detectionMethod` (`"manual" | "ai-flight" | "ai-displacement"`), `confidence`.
- `vite.config.ts` : `optimizeDeps.exclude: ["@mediapipe/tasks-vision"]` pour éviter le pré-bundling du WASM, et autoriser le format de fichier `.task`.
- `package.json` : ajouter `@mediapipe/tasks-vision`.

## Détails techniques

- **Chargement modèle** : WASM et `pose_landmarker_heavy.task` servis depuis le CDN officiel `https://storage.googleapis.com/mediapipe-models/...` (configurable, fallback `lite` si réseau lent). Délégué `GPU` activé.
- **Mode VIDEO** : `runningMode: "VIDEO"` + `detectForVideo(video, performance.now())` — synchrone par frame.
- **Frame rate analyse** : on traite chaque frame de la vidéo enregistrée (≥60 fps souhaité) en boucle hors écran ; barre de progression affichée pendant l'analyse (typiquement 1–3 s pour un saut de 800 ms).
- **Robustesse** : ignorer les détections dont `visibility < 0.5` sur cheville+talon+orteil ; utiliser la moyenne pondérée des deux pieds. Si aucun signal exploitable → message d'erreur et fallback marquage manuel.
- **Performance** : modèle chargé une seule fois (singleton), gardé en mémoire entre essais d'une session.
- **Navigateurs** : nécessite WebGL2 + WASM SIMD (Chrome/Edge/Safari récents OK, message d'avertissement sinon).

## Hors périmètre (à confirmer plus tard)

- Détection automatique sur le test sprint (`SprintTest.tsx`).
- Mesure automatique de hPO (push-off) à partir de la pose en position basse / extension complète.
- Analyse cinématique avancée (angles genou/hanche, asymétries G/D) — facile à ajouter ensuite puisque les landmarks seront déjà calculés.
