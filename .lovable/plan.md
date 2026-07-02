# Suppression de la clé IA — passage en local

Objectif : remplacer les deux seuls usages de Google Gemini par des solutions locales/gratuites (comme MediaPipe pour la pose), puis retirer complètement la section « Clé IA » de l'écran Paramètres.

## 1. Détection des repères de sprint (SprintVideoAnalyzer)

Actuellement, un appel Gemini analyse une frame et devine la position x normalisée de chaque cône/marque au sol.

**Remplacement : placement manuel assisté par clic sur la frame.**

- Retirer le bouton « Détection IA » et l'état `aiMarkersBusy` / `aiMarkersError` / `aiMarkersNotes`.
- Ajouter un mini-panneau « Placer les repères » qui liste les distances attendues (0 m, distances intermédiaires, distance de référence).
- L'utilisateur sélectionne une distance dans la liste, clique sur la vidéo/frame courante, et le point est stocké dans `extraMarkers[distance] = xNorm` (même state qu'aujourd'hui, mêmes downstream `calib.x0` / `calib.xRef`).
- Aide automatique : après avoir placé 0 m et la distance de référence, proposer un bouton « Interpoler linéairement » qui remplit les distances restantes par interpolation entre `x0` et `xRef` (rapide, sans modèle).

Pourquoi pas un modèle embarqué (YOLO ONNX / TF.js) : détecter des cônes génériques dans une vidéo terrain sans entraînement dédié est peu fiable et pèse 10–40 Mo. Le clic manuel est instantané, précis, gratuit, et cohérent avec les autres calibrations manuelles déjà présentes.

## 2. Import de la liste d'athlètes (ImportPlayersDialog)

Actuellement, Gemini reçoit le PDF/DOCX/image et renvoie du JSON.

**Remplacement : extraction locale du texte + parseur heuristique local.**

- **DOCX** : réutiliser le code JSZip déjà présent dans `ai/client.ts` (aucune dépendance externe supplémentaire).
- **PDF** : ajouter `pdfjs-dist` (ESM, moteur PDF de Mozilla, gratuit) → extraction du texte page par page côté navigateur.
- **Image (PNG/JPG)** : ajouter `tesseract.js` (OCR WASM, gratuit, chargé à la demande depuis CDN comme MediaPipe) → texte brut.
- Puis un **parseur local** `parseAthleteText(text)` :
  - Split par lignes, ignore les en-têtes courants (`Nom`, `Prénom`, `Poids`, `Taille`, `Position`, `Date`, totaux, moyennes).
  - Sur chaque ligne, regex pour extraire :
    - `firstName` / `lastName` : tokens alphabétiques (support tirets, apostrophes, accents), les tokens en MAJUSCULES traités comme nom de famille.
    - `mass` : nombre suivi de `kg` ou colonne numérique 40–160.
    - `height` : nombre suivi de `cm` (ou `m` converti), plage 100–230.
    - `birthDate` : formats `DD/MM/YYYY`, `YYYY-MM-DD`, `DD.MM.YYYY`.
    - `position` : mot restant non numérique de la ligne (optionnel).
  - Retour au même type `ParsedAthlete[]` → l'UI de vérification/édition existante (`ImportPlayersDialog`) reste inchangée.

L'utilisateur peut toujours corriger chaque ligne avant validation, ce qui compense les erreurs OCR / parsing.

## 3. Nettoyage du code IA

- Supprimer `src/lib/ai/client.ts` (Gemini, clé, modèle).
- Créer deux petits modules à la place :
  - `src/lib/import/athletes.ts` — `parseAthletesFile(file)` local (pdfjs + tesseract + docx + parseur).
  - Le placement de repères sprint reste géré dans le composant, pas de module dédié.
- Retirer de `AppLayout.tsx` :
  - Imports `getAIKey / setAIKey / getAIModel / setAIModel` et l'icône `Key`.
  - États `aiKey`, `aiModel`, `showKey`, handler `saveAISettings`.
  - Toute la `<section>` « Clé IA (Google Gemini) ».
- Retirer de `SprintVideoAnalyzer.tsx` : import `detectSprintMarkers / hasAIKey / AIKeyMissingError`, fonction `detectMarkersAI`, bouton associé.
- Retirer de `ImportPlayersDialog.tsx` : import `hasAIKey / AIKeyMissingError`, garde `if (!hasAIKey())`. Appel à `parseAthletesFile` désormais résolu par le module local.
- `package.json` : ajouter `pdfjs-dist` et `tesseract.js`. `jszip` reste (déjà utilisé pour l'export snapshot et DOCX).

## Vérification

- `tsgo` doit passer (plus aucune référence à `ai/client`).
- Paramètres : plus de section « Clé IA », plus d'icône clé.
- Sprint : le bouton « Détection IA » disparaît, remplacé par la liste de placement manuel + « Interpoler ».
- Import athlètes : un PDF simple / DOCX / image de test doit produire au moins une ligne pré-remplie éditable, sans jamais demander de clé.
