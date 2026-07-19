## Objectif
Rendre l'haltère qui traverse la lettre **F** du logo `fv-logo.png` en **blanc**, tout en gardant le reste du logo identique. Le nouveau logo remplacera l'actuel partout dans l'application (page d'authentification, header, splash screens PWA, favicons).

## Étapes

1. **Édition IA du logo** — utiliser `imagegen--edit_image` sur le logo actuel avec un prompt du type : *"Change only the barbell/dumbbell crossing the letter F to pure white (#FFFFFF), keep everything else — the F, the V, colors, background, proportions — strictly identical."* Sortie sauvegardée en `src/assets/fv-logo-white-bar.png` (PNG, fond transparent conservé).

2. **Preview** — je te montrerai l'image générée avant tout remplacement. Tu valides ou tu demandes une nouvelle itération (couleur, contours, contraste).

3. **Après validation seulement** — upload via `lovable-assets` pour remplacer le pointeur `src/assets/fv-logo.png.asset.json`. Aucun autre fichier à modifier : tous les usages (`Auth.tsx`, `AppLayout.tsx`, `InstallModal.tsx`, docx export, PWA icons) référencent le même pointeur.

## Note
Les icônes iOS et splash screens PWA générées précédemment (`public/icons/*`, `public/splash/*`) sont des fichiers statiques déjà déployés — si tu veux que **l'altère blanche** apparaisse aussi sur l'icône home-screen iOS et les splash screens, il faudra les régénérer depuis le nouveau logo. Dis-moi si je dois inclure cette régénération dans la même passe.
