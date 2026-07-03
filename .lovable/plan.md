
# Fiabiliser l'import de la liste des athlètes

Le parseur actuel traite chaque ligne indépendamment sans tenir compte de la structure en tableau. Sur l'exemple fourni (colonnes `N° | Nom | Prénom | Date de Naissance | Taille | Poids`, cellules multi-lignes, numéros type `.1.`), cela produit :
- Taille (ex. 154) capturée comme masse (car 154 ≤ 160), puis Poids (50) rejeté → mauvaise masse, taille manquante.
- Noms multi-lignes (`FATIMA ZAHRA`, `PAULMICHE MICHOU`, `MABOUHA NGOMA / FLORE JAURESINE`) coupés en deux athlètes ou fusionnés au suivant.
- L'en-tête `Date de Naissance` (sur 2 lignes) et le titre `Liste nominative…` parfois ingérés comme athlète.

## Ce que je vais changer (fichier `src/lib/import/athletes.ts`)

1. **Extraction en lignes de tableau (pas en lignes de texte)**
   - **PDF** : au lieu de concaténer par `y`, regrouper les items par bandes horizontales et exposer chaque item avec sa position `x` → on obtient des cellules (colonnes) ordonnées.
   - **DOCX** : parser directement `<w:tbl><w:tr><w:tc>` avec JSZip pour produire des lignes = `string[]` (une entrée par cellule), en concaténant les `<w:p>` internes (gère les cellules multi-lignes type `FATIMA ZAHRA`).
   - **Image (OCR)** : utiliser les `words` + `bbox` de tesseract pour clusteriser en lignes (par `y`) puis en colonnes (par `x` moyen), au lieu de `data.text` brut.

2. **Détection d'en-tête et mapping de colonnes**
   - Repérer la ligne dont ≥ 2 cellules matchent `HEADER_WORDS` (`Nom`, `Prénom`, `Taille`, `Poids`, `Date…`, `N°`, `Poste`…).
   - Fusionner les en-têtes multi-lignes (`Date de` + `Naissance`).
   - Construire un mapping `columnIndex → field` (`lastName`, `firstName`, `mass`, `height`, `birthDate`, `bib`, `position`).
   - Fallback heuristique si aucun en-tête détecté (comportement actuel).

3. **Assemblage des lignes de données**
   - Ignorer toute ligne dont toutes les cellules sont des mots d'en-tête, ou qui contient le titre (`Liste nominative`, `pour la saison`, `équipe`, `club`).
   - Détecter les lignes-suite (cellule N° vide **ou** ligne sans dossard/date mais avec des tokens en MAJUSCULES) et les rattacher à la ligne précédente (colle `FATIMA` + `ZAHRA`, `FLORE` + `JAURESINE`).
   - Nettoyer le N° (`.1.` → `1`) et l'utiliser comme dossard/`bib`.

4. **Extraction champ par champ (mapping-aware)**
   - Quand le mapping est connu : lire directement la bonne colonne au lieu de deviner (fini l'inversion Taille/Poids).
   - `Taille` : accepter `1.79 m`, `179`, `179 cm` → normaliser en cm.
   - `Poids` : accepter `66`, `66 kg`, `66,5` → kg.
   - `Date de Naissance` : garder la normalisation actuelle mais forcer JJ/MM/AAAA en priorité (contexte FR).
   - Noms : ne plus rejeter les particules (`AIT`, `EL`, `HAJ`, `NGOMA`) ; conserver l'ordre `Nom` puis `Prénom` du tableau (l'inversion actuelle basée sur MAJUSCULES saute quand tout est en capitales).

5. **Déduplication plus stricte**
   - Clé = `lastName|firstName|birthDate` (au lieu de `firstName|lastName`) pour ne pas fusionner deux `BOUKHAMI` différents (Siham vs Ouahiba).

## Ce que je ne change pas

- L'UI (`ImportPlayersDialog.tsx`) et les autres écrans : le contrat `ParsedAthlete[]` reste identique.
- Les dépendances : toujours `pdfjs-dist`, `jszip`, `tesseract.js`, 100 % local.
- Le reste de l'app.

## Vérification

- Rejouer mentalement le parseur sur les 23 lignes de l'exemple :
  - `.5. DAHMOS / FATIMA ZAHRA / 05/08/1992 / 164 / 51` → nom `DAHMOS`, prénom `FATIMA ZAHRA`, taille 164, poids 51.
  - `.20. MABOUHA NGOMA / FLORE JAURESINE / 15/12/1999 / 176 / 59` → nom `MABOUHA NGOMA`, prénom `FLORE JAURESINE`.
  - Ligne titre + ligne d'en-tête → ignorées.
- Après implémentation, je testerai avec l'image fournie (OCR) et je te demanderai un PDF/DOCX si tu en as un pour valider les 3 chemins.
