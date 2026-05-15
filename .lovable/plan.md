## Problème

Dans le rapport exporté (PDF et DOCX), le graphique Force-Vitesse apparaît comme une image entièrement noire.

## Cause

Dans `src/pages/TestResults.tsx` (`captureChartDataUrl`), on clone le `<svg>` du `FVChart`, on le sérialise en blob `image/svg+xml`, puis on le charge dans une `Image` HTML pour le dessiner sur un `<canvas>`.

Le SVG de `src/components/FVChart.tsx` utilise massivement des couleurs liées au design system :
- `fill="hsl(var(--card))"`
- `stroke={gridColor}` / `fill={axisColor}` où ces valeurs sont elles-mêmes du type `hsl(var(--muted-foreground))`
- couleurs des points, ligne F-V, zone cible, etc.

Une fois sérialisé et chargé dans une `Image` isolée du DOM, **les variables CSS `--card`, `--muted-foreground`, etc. ne sont plus résolues**. Toutes les couleurs deviennent invalides → noir/transparent. En thème sombre, le rectangle de fond `hsl(var(--card))` devient noir et masque tout le contenu (lui aussi noir/invalide).

## Correction

Modifier uniquement `captureChartDataUrl` dans `src/pages/TestResults.tsx` pour **inliner les couleurs calculées** dans le SVG cloné avant la sérialisation :

1. Avant de cloner, parcourir chaque élément du `<svg>` original avec `querySelectorAll("*")`.
2. Pour chaque élément, lire `getComputedStyle(el)` et lire aussi les attributs `fill` / `stroke` directement présents (qui peuvent contenir `hsl(var(--…))`).
3. Calculer les valeurs résolues :
   - Si l'attribut `fill` ou `stroke` contient `var(`, le remplacer par une valeur résolue. Méthode simple : créer un élément temporaire `<span>` dans le DOM, lui appliquer `style.color = attribute`, lire `getComputedStyle(span).color` (le navigateur résout les `var(...)`), puis utiliser cette valeur RGB.
   - Sinon, conserver la valeur d'origine.
4. Appliquer ensuite ces valeurs résolues comme attributs inline sur les éléments du SVG cloné (mêmes index ou via un second `querySelectorAll`).
5. Forcer un fond blanc explicite : remplacer le premier `<rect>` de fond (`fill="hsl(var(--card))"`) par `fill="#ffffff"` pour garantir un rendu lisible dans le rapport quel que soit le thème actif.
6. Conserver le fallback `html2canvas` existant comme filet de sécurité.

Aucun changement nécessaire dans `FVChart.tsx`, `pdfReport.ts`, `docxExport.ts`, ni dans la logique d'export.

## Fichiers modifiés

- `src/pages/TestResults.tsx` — fonction `captureChartDataUrl` uniquement.

## Vérification

- Exporter un test en PDF (thème clair et thème sombre) → le graphique doit apparaître en couleurs lisibles sur fond blanc.
- Exporter le même test en DOCX → image du graphique correctement rendue.
- Vérifier qu'aucune régression visuelle n'apparaît sur la page `TestResults` elle-même (on ne touche que la fonction de capture).
