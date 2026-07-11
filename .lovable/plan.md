
## Objectif
Remplacer le logo actuel `src/assets/logo-jump-neon.png` par la nouvelle image fournie par l'utilisateur, avec un rendu harmonisé au logo Sprint linéaire (fond transparent, silhouette néon verte nette).

## Étapes
1. Traiter l'image uploadée (`user-uploads://kimi-1783767082987889270429299082386.jpeg`) via `imagegen--edit_image` avec `transparent_background: true` pour retirer le fond noir et conserver uniquement la silhouette néon verte + effets de lumière/particules, en préservant la netteté et l'éclat.
2. Écraser `src/assets/logo-jump-neon.png` avec le résultat PNG transparent.
3. Aucune modification de code nécessaire — `src/pages/NewTest.tsx` importe déjà ce fichier et applique la classe `.engraved-logo`.

## Portée
- Uniquement le fichier image du logo Vertical Jump.
- Pas de changement JSX/CSS.
