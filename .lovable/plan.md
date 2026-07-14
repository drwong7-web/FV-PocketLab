
## Diagnostic
Deux fichiers génèrent les exports avec des libellés en dur (anglais pour le PDF, français pour le DOCX) et sans logo :
- `src/pages/TestResults.tsx` → `generateStructuredPDF()` (lignes ~71-240)
- `src/lib/docxExport.ts` → `generateDOCX()`

Le logo `src/assets/fv-logo.png` est déjà disponible via `fv-logo.png.asset.json` (CDN).

## Plan

### 1. Traduction des exports
Passer la fonction `t` (de `useSettings()`) et la langue courante aux deux générateurs :

**PDF (`generateStructuredPDF`)** — remplacer toutes les chaînes littérales par `t(...)` :
- Bandeau titre : « F-V PROFILE — VERTICAL JUMP » / « LINEAR SPRINT »
- Sections : « Main indicators », « Test conditions », « Trials », « Splits », « Force-Velocity curve »
- Libellés métriques : F0, V0, Pmax, F-V slope, Optimal slope, FVimb, R², h max, Profile, RFmax, DRF, Tau, F0 horiz., V0/Vmax
- Unités descriptives : « % (imbalance) », « fit quality », « cm (BW) »
- Entêtes de tableaux : « # », « Add. load », « Height », « F », « V », « Distance », « Measured », « Model », « Exercise », « Sets × Reps », « Intensity »
- Phrases : « Body mass », « Push-off (hPO) », « Mass », « Height », « Wind »
- Pied de page : « SprintLab FV Pro · … · page X/Y » → utiliser `t("page")`
- Recommandations : `getJumpRecommendations` / `getSprintRecommendations` reçoivent déjà `lang` (fait au tour précédent) → passer la langue courante.
- Date : `toLocaleDateString(lang)` selon la langue (fr-FR, en-US, ar).

**DOCX (`generateDOCX`)** — même traitement :
- Titres : « Profil F-V — Saut vertical / Sprint linéaire »
- Sections : « Indicateurs principaux », « Conditions de test », « Essais », « Splits », « Courbe Force-Vitesse »
- Entêtes de colonnes des tableaux
- Nom de fichier : garder ASCII (déjà OK).

Passer `t` et `lang` en paramètres à `generateDOCX(...)` et `generateStructuredPDF(...)`.

### 2. Nouvelles clés de traduction
Ajouter dans `src/lib/settings.tsx` (FR/EN/AR) les clés spécifiques à l'export non déjà présentes, notamment :
- `exportTitleJump`, `exportTitleSprint`
- `mainIndicators`, `testConditions`, `trials`, `splits`, `fvCurve`
- `colNum`, `colAddLoad`, `colHeight`, `colForceRel`, `colVelocity`, `colDistance`, `colMeasured`, `colModel`, `colExercise`, `colSetsReps`, `colIntensity`
- `bodyMass`, `pushOffShort`, `wind`, `page`
- Libellés d'unités descriptives (`imbalance`, `fitQuality`, `cmBW`)

Réutiliser au maximum les clés créées au tour précédent pour la page Résultats.

### 3. Logo dans l'entête
Charger `src/assets/fv-logo.png` comme dataURL (import + fetch → base64) au chargement de la page, ou importer directement le fichier via l'URL du `.asset.json`.

**PDF** — dans la bande sombre du header (y=0..28) :
```ts
pdf.addImage(logoDataUrl, "PNG", pageW - margin - 22, 4, 20, 20);
```
Positionné à droite (le titre reste à gauche), 20×20 mm.

**DOCX** — ajouter un `ImageRun` en tête de document (avant le titre) ou dans un `Header` de section :
```ts
new Header({ children: [new Paragraph({
  alignment: AlignmentType.RIGHT,
  children: [new ImageRun({ type: "png", data: logoBytes, transformation: { width: 60, height: 60 }, altText: {...} })]
})]})
```
Le logo sera récupéré via `fetch(logoUrl).then(r => r.arrayBuffer())` côté client avant d'appeler `generateDOCX`.

### 4. Vérification
- Exporter PDF et DOCX en FR, EN, AR pour un test saut et un test sprint.
- Vérifier la présence du logo dans le header sur les deux formats.
- Vérifier qu'aucune chaîne en dur ne subsiste (`rg` sur "Main indicators", "Trials", "Indicateurs principaux", etc.).

## Fichiers modifiés
- `src/pages/TestResults.tsx` — traduction PDF + chargement logo + passage `t`/`lang` aux exports.
- `src/lib/docxExport.ts` — signature acceptant `t`, `lang`, `logoBytes` ; toutes chaînes remplacées ; `Header` avec logo.
- `src/lib/settings.tsx` — clés de traduction manquantes (FR/EN/AR).

## Hors scope
- Pas de refonte visuelle du rapport (layout, couleurs conservés).
- Pas de changement du fichier `src/lib/pdfReport.ts` (utilisé pour un autre flux SprintLab, non appelé depuis TestResults).
- Le logo actuel `fv-logo.png` est utilisé tel quel ; pas de génération d'un nouveau visuel.
