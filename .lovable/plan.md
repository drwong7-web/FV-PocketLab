## Pipeline automatique d'amélioration vidéo pour analyse

Objectif : améliorer automatiquement chaque frame **avant** la détection de pose et lisser le signal **après**, sans réglages utilisateur. Un seul pipeline « best quality » appliqué par défaut sur `SprintVideoAnalyzer`, `CameraAIJump` et les autres composants caméra.

### Filtres appliqués automatiquement

**A. Pré-traitement image (avant MediaPipe), par frame**

1. **Auto-exposition / gamma adaptatif** — calcul de la luminance moyenne sur une frame de référence, correction gamma pour ramener à ~0.5. Compense sur/sous-exposition.
2. **CLAHE (Contrast Limited Adaptive Histogram Equalization)** simplifié sur le canal luminance — rend les articulations visibles en basse lumière et en contre-jour.
3. **Réduction de bruit légère** — blur gaussien 3×3 (σ≈0.6) appliqué seulement si le bruit estimé dépasse un seuil (variance locale).
4. **Netteté (unsharp mask)** — kernel 3×3 avec amount ≈ 0.6, appliqué après le débruitage. Renforce les contours pour MediaPipe.
5. **Upscale conditionnel** — si la frame fait < 720p, upscale bicubique × 1.5 vers ≥ 720p (MediaPipe est plus précis à cette résolution). Désactivé au-dessus pour rester rapide.

Pipeline implémenté en une seule passe sur un OffscreenCanvas → ImageBitmap → MediaPipe. Filtres CSS gratuits (`contrast`, `brightness`) en première passe, convolutions en ImageData en seconde passe.

**B. Stabilisation inter-frames (sprint uniquement, caméra mobile)**

6. **Phase-correlation downscalée** entre frame N et N-1 → vecteur de translation → recadrage compensatoire. Annule le micro-tremblement caméra à main levée. Seuil : ignore les déplacements > 15% (vrai pan de caméra).

**C. Post-traitement du signal pose**

7. **Interpolation des trous** — frames où la pose n'est pas détectée sont comblées par interpolation cubique entre voisins (max 3 frames consécutives).
8. **One Euro Filter** sur chaque landmark (x, y) — lissage adaptatif : très lisse au repos, très réactif en mouvement rapide. Paramètres : `minCutoff=1.0`, `beta=0.05`.
9. **Filtre Butterworth passe-bas ordre 2 à 8 Hz** sur les séries temporelles utilisées pour vitesse/accélération (déplacement bassin pour sprint, hauteur pieds pour jump).
10. **Savitzky-Golay (fenêtre 7, ordre 3)** pour la dérivation propre des courbes vitesse/accélération sans amplifier le bruit.

### Fichiers à créer / modifier

- **`src/lib/videoFilters.ts`** *(nouveau)* — pipeline image : `enhanceFrame(videoOrCanvas) → ImageBitmap` (auto-exposure + CLAHE + denoise + sharpen + upscale conditionnel) + helpers convolution.
- **`src/lib/videoStabilizer.ts`** *(nouveau)* — `stabilize(prevFrame, currFrame) → {dx, dy}` via phase-correlation downscalée 64×64.
- **`src/lib/signalFilters.ts`** *(nouveau)* — `OneEuroFilter`, `butterworthLowpass`, `savitzkyGolay`, `interpolateGaps`.
- **`src/lib/poseDetection.ts`** *(modifié)* — `trackPelvisX` : passe la frame dans `enhanceFrame()` avant `detectForVideo`, applique stabilisation, applique One Euro sur la série X retournée.
- **`src/lib/poseDetector.ts`** *(modifié)* — même intégration pour le pipeline jump.
- **`src/lib/sprintEngine.ts`** *(modifié)* — applique Butterworth + Savitzky-Golay sur la trajectoire avant calcul des splits.
- **`src/lib/jumpDetection.ts`** *(modifié)* — applique Butterworth sur la trajectoire pieds/bassin avant détection des phases.
- **`src/components/camera/SprintVideoAnalyzer.tsx`** *(modifié)* — utilise les pipelines améliorés (aucune UI ajoutée, juste un petit badge « Amélioration auto activée » discret).
- **`src/components/camera/CameraAIJump.tsx`** *(modifié)* — idem.

### Performances

- Tous les filtres image en un seul passage ImageData par frame.
- Convolutions 3×3 → ~5 ms par frame 720p sur CPU moyen.
- Stabilisation downscalée 64×64 → ~2 ms.
- One Euro + Butterworth + S-G → négligeable (< 1 ms total sur 1000 points).
- Upscale uniquement si nécessaire pour éviter la perte de FPS sur vidéos déjà HD.
- Si la frame est déjà ≥ 1080p et bien exposée (détection auto via histogramme), les étapes lourdes sont skippées.

### Comportement

- Pipeline **toujours actif**, **transparent** pour l'utilisateur.
- Aucun réglage exposé. Si plus tard tu veux des toggles, on les ajoutera sans toucher au cœur.
- Tous les filtres ont des seuils auto-adaptatifs (luminance, bruit, résolution) pour ne rien dégrader sur une vidéo déjà propre.

### Validation post-implémentation

Tester sur :
1. Vidéo sprint extérieure plein soleil → vérifier que netteté ne sature pas
2. Vidéo gym basse lumière → vérifier CLAHE améliore détection
3. Vidéo à main levée → vérifier stabilisation
4. Vidéo 480p → vérifier upscale + détection plus fiable
5. Vidéo 1080p propre → vérifier aucune régression et perf OK
