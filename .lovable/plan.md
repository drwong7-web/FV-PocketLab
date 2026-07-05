## Plan

1. **Corriger la vraie cause probable**
   - Adapter l'appel Tesseract à la version installée (`tesseract.js@7`) : l'option actuelle `output: { blocks: true }` était pensée pour v5 et peut ne pas produire `words/blocks` comme prévu.
   - Remplacer par une extraction compatible v7 : récupérer `data.text`, `data.tsv` si disponible, et construire les lignes depuis TSV avant d'essayer les blocks.

2. **Ajouter un fallback OCR plus robuste pour screenshots mobiles**
   - Prétraiter les images avant OCR : redimensionnement, fond blanc, contraste, grayscale/sharpen léger pour les screenshots sombres ou compressés.
   - Lancer OCR sur le canvas prétraité au lieu de l'URL brute.
   - Essayer deux modes Tesseract si nécessaire : détection automatique (`PSM.AUTO`) puis tableau/texte sparse (`PSM.SPARSE_TEXT`).

3. **Éviter le “0 athlète” quand les colonnes sont perdues**
   - Ajouter un parseur spécial “liste nominative ASFAR” basé sur lignes texte : détecter les lignes qui commencent par un numéro (`.5.`, `15`, `N°`) puis extraire `Nom`, `Prénom`, `Date`, `Taille`, `Poids` même si les colonnes OCR sont fusionnées.
   - Corriger le bug heuristique actuel : quand une cellule contient `NOM PRENOM DATE TAILLE POIDS` en une seule chaîne, elle n'est pas découpée, donc `nameCells.length < 2` renvoie `null`.

4. **Améliorer le diagnostic visible**
   - Si l'OCR lit du texte mais aucun athlète n'est reconnu, afficher une erreur plus utile avec un extrait court du texte détecté, au lieu de seulement “Aucun athlète détecté”.
   - Garder les logs uniquement en mode développement, sans données sensibles.

5. **Mettre à jour la spec vivante**
   - Mettre à jour `SPEC.md` section import pour documenter le nouveau pipeline image : preprocessing canvas → OCR TSV/text → parseur tableau + fallback liste nominative.
   - Bumper `Last updated`.

6. **Validation**
   - Tester sur le screenshot uploadé et vérifier qu'on obtient une preview d'athlètes au lieu du toast d'échec.
   - Vérifier que Word/DOCX continue de marcher.