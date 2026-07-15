
## Analyse du fichier fourni

Nouvelle structure du rapport (ordre exact) :

1. **En-tête** : logo à gauche + titre bleu "Force Velocity profile — Vertical jump" (ou "— Linear sprint") à droite du logo, date au format `M/D/YYYY` alignée à droite en italique.
2. **Bloc athlète** :
   - `NAME: ZINEB REDOUANI` (gras, majuscules)
   - `SPORT: football ·` (italique)
   - `MASSE: 50 kg` (italique)
3. **Test conditions** (titre bleu) — `Body mass: 50 kg ·` puis `Push-off (hPO): 0.62 m` sur deux lignes.
4. **Trials** (titre bleu) — tableau avec entête vert et colonnes : `#`, `Loads (kg)`, `Jump Height (cm)`, `Force (N/kg)`, `Velocity (m/s)`. Pour le sprint : `Distance (m)`, `Measured (s)`, `Model (s)`.
5. **Main indicators** (titre bleu) — tableau `Indicator / Value / Unit`. L'unité de `Profile` reste vide, plus de colonnes descriptives type "% (imbalance)".
6. **Ligne R²** juste sous le tableau : `R² = 0.593` (en bleu) suivi d'un message de qualité de fit (`Weak fit: …` / `Good fit: …`).
7. **Force-Velocity curve** (page 2, titre bleu) — image du graphique.
8. **INTERPRETATION** — `INTERPRETATION:` en bleu suivi du titre de reco en gras noir (`FORCE deficit detected`), puis paragraphe descriptif, puis tableau exercices `Exercise / Sets × Reps / Intensity`.

Différences vs implémentation actuelle :
- Ordre inversé : Trials **avant** Main indicators (actuellement après).
- Ajout colonne `Jump Height (cm)` déjà présente ; à conserver.
- Titres de section passés en bleu (couleur d'accent `#1F7CC7` similaire au visuel).
- En-tête : logo à gauche + titre centré/aligné avec le logo (actuellement logo à droite seul).
- Date en haut à droite, plus dans la ligne italique sous le nom.
- `NAME:` / `SPORT:` / `MASSE:` en préfixe (actuellement une seule ligne italique concaténée).
- Ligne R² dédiée avec code couleur qualité de fit.
- `INTERPRETATION:` préfixe bleu devant le titre de recommandation.
- Suppression du pied de page "SprintLab FV Pro · page X/Y" du PDF (non présent dans le Word).

## Plan d'implémentation

### 1. `src/lib/docxExport.ts`
- Refactor `generateDOCX` :
  - Remplacer le `Header` (répété à chaque page) par une **table d'en-tête** dans le corps (2 colonnes) : logo à gauche, titre bleu (`color: "1F7CC7"`, taille 32, bold) au centre, date à droite (italique). Bordures invisibles.
  - Bloc athlète : 3 paragraphes séparés (`NAME:` bold, `SPORT:` italique, `MASSE:` italique).
  - Ajouter un helper `sectionHeading(t)` qui crée un `Paragraph` bleu (`color: "1F7CC7"`, size 26, bold, spacing before/after).
  - Réordonner : Test conditions → Trials → Main indicators → R² → (saut de page) → FV curve → Interpretation.
  - Test conditions : deux paragraphes séparés (Body mass, Push-off / Height, Wind).
  - Ligne R² : `Paragraph` avec 2 `TextRun` — `"R² = 0.593"` en bleu + espace + message de qualité en noir (helper `fitQualityMessage(r2, t)` retournant Weak/Moderate/Good fit).
  - Interpretation : `Paragraph` avec `"INTERPRETATION: "` bleu bold + `reco.title` noir bold. Puis `reco.description`. Puis tableau exercices.
  - Retirer l'entête `Header` global (la partie qui se répète en haut de chaque page).

### 2. `src/pages/TestResults.tsx` → `generateStructuredPDF`
- Réécrire l'en-tête PDF :
  - Fond blanc (retirer la bande sombre actuelle).
  - Logo à gauche `pdf.addImage(logo, "PNG", margin, 10, 24, 24)`.
  - Titre bleu (`setTextColor(31,124,199)`, bold 18) à droite du logo.
  - Date italique alignée à droite.
- Bloc athlète : `NAME:` gras + prénom/nom, `SPORT:` / `MASSE:` italiques.
- Titres de section bleus (helper `drawSectionTitle(pdf, y, text)`).
- Réordonner sections : Test conditions → Trials → Main indicators → R² → nouvelle page → FV curve → Interpretation.
- Retirer le pied de page "SprintLab FV Pro · page X/Y".
- Utiliser des tableaux avec entête vert (`fillColor(132,204,22)`) et lignes fines gris clair pour reproduire l'apparence Word.
- Ligne R² : `pdf.setTextColor(31,124,199)` pour `R² = xxx`, puis noir pour le message de fit.
- `INTERPRETATION:` bleu + titre reco noir gras.

### 3. `src/lib/settings.tsx`
Ajouter/vérifier les clés :
- `fitQualityWeak`, `fitQualityModerate`, `fitQualityGood` (avec la phrase complète type `"Weak fit: check trial quality before relying on F0/V0/Pmax."`) — FR/EN/AR.
- `interpretationPrefix` = `"INTERPRETATION:"` / `"INTERPRÉTATION :"` / `"التفسير:"`.
- `nameLabel`, `sportLabel`, `massLabel` (préfixes du bloc athlète).

Toutes les autres clés (`testConditions`, `trials`, `mainIndicators`, `fvCurveSection`, colonnes de tableaux, `bodyMass`, `pushOffShort`, etc.) existent déjà.

### 4. Vérification
- Générer PDF et DOCX en FR/EN/AR pour un test saut et un test sprint depuis la route `/app/tests/local-…`.
- Vérifier visuellement l'ordre des sections, la couleur bleue des titres, la présence du logo à gauche + date à droite, la ligne R² colorée, le préfixe `INTERPRETATION:`.
- Vérifier que le tableau des trials contient la colonne `Jump Height (cm)` et que Main indicators n'a plus de suffixes descriptifs dans la colonne Unit.

## Hors scope
- Pas de changement des calculs F-V ni des recommandations.
- Pas de modification du composant `FVChart` ni de la capture du graphique.
- Le fichier `src/lib/pdfReport.ts` (flux legacy SprintLab) reste inchangé.
