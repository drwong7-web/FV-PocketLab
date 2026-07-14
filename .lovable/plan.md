## Problème

Sur mobile, quand on tape sur un bouton (ex: les 2 boutons icônes du header), un flash **bleu ciel** apparaît. Ce n'est pas la couleur du thème mais le **highlight tactile par défaut du navigateur mobile** (`-webkit-tap-highlight-color`), qui est bleu translucide sur iOS/Android WebView, indépendamment du thème CSS.

## Solution

Neutraliser ce highlight globalement dans `src/index.css` afin que tous les éléments interactifs (boutons, liens, etc.) suivent uniquement les styles du thème (hover/active/focus déjà définis par shadcn + tokens HSL).

## Changement

Dans `src/index.css`, dans la couche `@layer base`, ajouter sur `html` (ou `*`) :

```css
html {
  -webkit-tap-highlight-color: transparent;
}
```

Aucune modification de composants, de tokens de couleur, ou de logique métier. Les états `hover`, `active` et `focus-visible` du thème restent intacts et continueront de rendre le retour visuel correct (variant `ghost` = `hover:bg-accent`).

## Vérification

- Rebuild ok.
- Sur viewport mobile (390×844), taper sur les 2 boutons icônes du header → plus de flash bleu, seulement le `hover:bg-accent` du thème.
- Vérifier aussi un bouton `default` et un lien pour confirmer la cohérence globale.
