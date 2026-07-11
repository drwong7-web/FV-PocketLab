
## Objectif
Améliorer le logo `src/assets/logo-jump-neon.png` (carte Saut Vertical) pour qu'il ait la même netteté et le même éclat néon que le logo Sprint linéaire.

## Étapes
1. Utiliser `imagegen--edit_image` sur `src/assets/logo-jump-neon.png` avec un prompt du type :
   - "Increase sharpness and enhance the neon green glow/light effects on this logo. Make the highlights brighter and crisper while keeping the exact same green color, composition and transparency. Match the polished neon shine of a matching sprint logo."
2. Sauvegarder le résultat en écrasant `src/assets/logo-jump-neon.png` (les dimensions et la référence dans `src/pages/NewTest.tsx` restent inchangées).
3. Vérifier visuellement dans la preview que les deux cartes sont harmonieuses.

## Portée
- Aucune modification de code (JSX, CSS) — uniquement le fichier image.
- Le style `.engraved-logo` déjà appliqué reste inchangé.
