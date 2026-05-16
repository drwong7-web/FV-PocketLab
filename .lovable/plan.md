## Objectif

Remplacer intégralement le test sprint linéaire (`src/pages/SprintTest.tsx` + section sprint de `src/lib/fvCalculations.ts`) par la version de [Projet ref](/projects/b659e226-503d-404c-b8c8-e65e740a17f6). Ce projet ref est plus riche : protocole (distance 30/40/60 m, type de départ, surface, chaussures), météo géolocalisée, analyse vidéo IA, segmentation en phases, score qualité, interprétation, etc.

## Fichiers créés / remplacés

### Nouveaux
- `src/lib/weather.ts` — copie de `src/lib/weather.ts` du projet ref (Open-Meteo + géoloc navigateur).
- `src/components/camera/SprintVideoAnalyzer.tsx` — copie du composant ref, adapté aux imports actuels (`@/components/ui/...`).

### Remplacés
- `src/lib/fvCalculations.ts` — bloc « SPRINT METHOD » entièrement remplacé par celui du ref :
  - Nouveaux types : `SprintPhase`, `SprintSeriesPoint`, `SprintQualityScore`, `SprintInterpretationType`, `ShoeType`, `SHOE_LABELS`, `FOOTWEAR_SURFACE_FACTORS`.
  - Nouveaux helpers exportés : `getFootwearAdjustment`, `airDensity`, `frontalArea`, `simulateSplitTime`, `defaultSplitsForDistance`, `SPRINT_DEMO`, `segmentSprintPhases`, `computeSprintQualityScore`, `interpretSprintProfile`.
  - `SprintInputs` enrichi (testDistance, startType, surface, shoeType, notes, videoFps).
  - `SprintResults` enrichi (MAC, Sfv, RFpeak, RFmean, modelFitScore, rmse, phases, series, qualityScore, interpretationType, aeroDefaults, testDistance, startType, surface, videoFps, shoeType, footwearAdjustment).
  - Bloc JUMP intact.
- `src/pages/SprintTest.tsx` — réécriture complète depuis `src/routes/test.sprint.tsx` du ref, avec adaptations :
  - Routage : `useNavigate`/`useSearchParams` (react-router-dom) au lieu de tanstack-router.
  - Données athlètes/équipes : `listPlayers`/`listTeams`/`getPlayer` de `@/lib/storage` (pas de Supabase direct).
  - Mapping des champs : `firstName`/`lastName`/`mass`/`height`/`teamId` au lieu de snake_case.
  - Pas d'insertion `tests` Supabase → uniquement `saveLocalTest` + `navigate(\`/app/tests/${local.id}\`)` comme l'actuel.
  - Textes : français en dur (pas de hook `useSettings`/`t()` dans ce projet).
  - Imports `CameraTimer` depuis `@/components/camera/CameraTimer` (chemin existant).

## Adaptations techniques

- `SprintVideoAnalyzer` utilise `@/lib/pose-detection` côté ref → on l'importera depuis `@/lib/poseDetector` existant si l'API correspond, sinon on copie aussi `pose-detection.ts` sous `src/lib/poseDetection.ts`. À valider à l'écriture.
- `weather.ts` est autonome (fetch Open-Meteo), aucune dépendance externe.
- `TestResults.tsx` lit déjà `SprintResults` ; les champs anciens (`tau`, `Vmax`, `F0`, `V0`, `Pmax`, `slopeFV`, `RFmax`, `DRF`, `splits`, `FVprofile`, `velocityProfile`) restent présents → **pas de cassure**. Les nouveaux champs (phases, qualityScore, etc.) ne seront simplement pas affichés dans la page résultats — c'est conforme à la demande (« remplacer ce qui est à l'intérieur du test sprint », pas la page résultats).

## Hors scope

- Page résultats sprint (`TestResults.tsx`) : non modifiée. À demander séparément si l'utilisateur veut aussi importer l'affichage enrichi (phases, score qualité, etc.).
- Base de données : on conserve le stockage local existant.

## Vérification

- `tsc --noEmit` via build auto.
- Charger `/app/tests/new/sprint`, sélectionner athlète, lancer le calcul, vérifier la redirection vers la page résultats.
