## Objectif
Remplacer le logo actuel de l'application par le nouveau logo joint (FV bleu/vert avec haltère et éclair), partout où il apparaît : in-app, favicon, icônes home-screen iOS, et splash screens PWA.

## Étapes

1. **Upload du nouveau logo comme asset CDN**
   - Source : `/mnt/user-uploads/03_logo_in_app_mini_transparent_1x1.png`
   - `lovable-assets create --file <source> --filename fv-logo.png > src/assets/fv-logo.png.asset.json` (overwrite du pointeur existant)
   - Résultat : tous les usages in-app (`Auth.tsx`, `AppLayout.tsx`, `InstallModal.tsx`, `NewTest.tsx`, `docxExport.ts`, etc.) pointent automatiquement vers le nouveau logo — aucun changement de code nécessaire.

2. **Favicon**
   - Remplacer `public/favicon.png` (et supprimer `public/favicon.ico` s'il existe encore) par le nouveau logo.
   - Vérifier `index.html` pour s'assurer que le `<link rel="icon">` pointe bien vers `/favicon.png`.

3. **Icônes home-screen iOS** (`public/icons/*`)
   - Régénérer toutes les tailles PNG (typiquement 120, 152, 167, 180, 192, 512, maskable) depuis le nouveau logo, avec padding et fond adaptés pour iOS.
   - Écraser les fichiers existants aux mêmes noms pour que `manifest.webmanifest` et les `<link rel="apple-touch-icon">` continuent de fonctionner sans modification.

4. **Splash screens PWA iOS** (`public/splash/*`)
   - Régénérer les 30+ splash screens iOS (toutes les résolutions device × orientation) avec le nouveau logo centré sur le fond de marque.
   - Écraser les fichiers existants aux mêmes noms — les media queries `<link rel="apple-touch-startup-image">` dans `index.html` continueront de matcher.

5. **Vérification**
   - Build vert (`bun run build`).
   - Le manifeste et les meta tags PWA restent inchangés.

## Note importante — utilisateurs déjà installés
iOS et Android **mettent en cache l'icône et le splash au moment de l'installation**. Les utilisateurs qui ont déjà installé la PWA continueront à voir l'ancien logo sur leur écran d'accueil jusqu'à ce qu'ils **désinstallent puis réinstallent** l'app. Les nouvelles installations verront directement le nouveau logo. Rien à faire côté code pour ça, mais bon à savoir pour communiquer aux utilisateurs si besoin.
