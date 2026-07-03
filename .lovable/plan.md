# Corriger l'import PDF et image (fichier `src/lib/import/athletes.ts`)

Le parsing DOCX marche parce qu'on lit directement les `<w:tr>/<w:tc>` : on connaît les cellules. Pour le PDF et l'image, on reconstruit les cellules à partir de positions (x, y) et l'heuristique actuelle est trop fragile :

- **PDF** : le seuil de gap (`> 12`) est en unités PDF, indépendant de la taille de police. Sur un tableau serré, deux colonnes fusionnent ; sur un tableau large, un prénom composé se coupe en deux colonnes. Résultat : `Taille` finit dans la colonne `Poids`, ou le prénom mange la date.
- **PDF scanné** : `getTextContent()` renvoie zéro item, on ne tente jamais l'OCR → aucune ligne extraite.
- **Image** : le seuil de gap est global à la page (médiane × 3). Une page avec beaucoup de mots collés (noms) écrase la médiane et la détection de colonnes s'effondre. Aucun alignement vertical n'est vérifié, donc `176` d'une ligne peut être classé avec le prénom d'une autre.

## Ce que je vais changer

### 1) PDF avec texte : détection de colonnes par histogramme, pas par gap local
- Regrouper les items en bandes y (comme aujourd'hui).
- Sur toutes les bandes, construire un **histogramme des positions x de début d'item**. Les pics = bords de colonnes du tableau.
- Snap chaque item à sa colonne la plus proche → chaque ligne devient `Row = string[]` aligné (même longueur pour toutes les lignes).
- Concaténer les items d'une même colonne avec un espace (gère "FATIMA ZAHRA" dans une seule cellule).

Bénéfice : plus de dépendance à un seuil magique ; les colonnes `Nom / Prénom / Date / Taille / Poids` restent séparées même quand elles sont proches.

### 2) PDF scanné : fallback OCR automatique
- Si une page renvoie < 5 items texte, la rasteriser via `page.render()` sur un `<canvas>` (déjà dispo via pdfjs, aucune dépendance ajoutée) puis passer le canvas à **tesseract.js** avec la même logique que l'image (voir §3).
- On garde 100 % local, aucune API.

### 3) Image (OCR) : clustering 2D au lieu d'un seuil de gap global
- Extraire `words` + `bbox` de tesseract (déjà fait).
- **Étape lignes** : clusteriser par centre y avec tolérance = 0.6 × hauteur médiane des mots (au lieu d'utiliser `data.lines` de tesseract, qui coupe mal les lignes serrées).
- **Étape colonnes** : construire un histogramme des `bbox.x0` sur toute la page ; les pics = colonnes. Attribuer chaque mot à sa colonne la plus proche. Concaténer par colonne.
- Résultat : chaque `Row` a la même longueur que l'en-tête, donc `parseWithMap` lit la bonne colonne.

### 4) Filtres partagés (déjà en place mais renforcés)
- Ignorer les lignes où **toutes** les cellules non vides matchent des mots d'en-tête (évite d'ingérer `Nom Prénom Taille Poids` sur la 2ᵉ page d'un PDF paginé).
- Ignorer les lignes titre (`Liste nominative…`, `Saison…`, `Équipe…`).
- Ligne "suite" (nom multi-lignes) : détectée quand la cellule N°/dossard est vide et qu'il n'y a ni date ni ≥ 2 nombres → fusion avec la ligne précédente cellule par cellule.

## Ce que je ne touche pas

- L'UI `ImportPlayersDialog.tsx` et le contrat `ParsedAthlete[]` restent identiques.
- Pas de nouvelle dépendance : `pdfjs-dist`, `jszip`, `tesseract.js` déjà présents.
- Le chemin DOCX qui fonctionne aujourd'hui n'est pas modifié.

## Vérification

- Envoie-moi un PDF **texte** et une image (ou un PDF scanné) qui échouent aujourd'hui : je rejoue l'extraction avant/après et je te montre les `Row[]` produits pour valider que les colonnes sont bien alignées.
- Si tu n'as qu'un exemple sous la main, je commence par lui et j'itère.
