## Objectif
Remplacer le logo actuel `fv-logo.png` par le nouveau logo carré fourni (`logo_square_2048x2048.png`) et régénérer toutes les icônes et splash screens PWA/iOS à partir de ce nouveau logo.

## Étapes

1. **Remplacer le pointeur d'asset du logo**
   - Upload de `/mnt/user-uploads/logo_square_2048x2048.png` via `lovable-assets create --filename fv-logo.png`.
   - Écraser `src/assets/fv-logo.png.asset.json` avec le nouveau pointeur.
   - Aucun changement de code nécessaire : tous les usages (`Auth.tsx`, `AppLayout.tsx`, `InstallModal.tsx`, exports docx/pdf, onboarding) référencent déjà ce pointeur.

2. **Régénérer les icônes PWA / home-screen iOS** (dans `public/`)
   - À partir du nouveau logo 2048×2048, générer avec un script Python (Pillow, dans le sandbox) :
     - `public/icon-192.png` (192×192)
     - `public/icon-384.png` (384×384)
     - `public/icon-512.png` (512×512)
     - `public/icon-maskable-512.png` (512×512 avec safe-area padding ~10%)
     - `public/apple-touch-icon.png` (180×180, fond opaque `#0f1419` — iOS n'accepte pas la transparence)
     - `public/favicon.ico` + `public/favicon.png` (32×32)
   - Écraser les fichiers existants dans `public/icons/` si présents.

3. **Régénérer les splash screens iOS** (`public/splash/`)
   - Régénérer les 30+ variantes (portrait + paysage) pour toutes les tailles d'écran iPhone/iPad supportées par les balises `apple-touch-startup-image` déjà présentes dans `index.html`.
   - Format : logo centré sur fond `#0f1419` (theme_color du manifest), logo occupant ~40% de la plus petite dimension.
   - Conserver les noms de fichiers actuels pour ne pas casser `index.html`.

4. **Vérification**
   - `manifest.webmanifest` et `index.html` référencent déjà tous ces chemins — pas de modification requise.
   - Build vérifiée automatiquement.

## Note
Les anciens fichiers d'icônes/splash sur les appareils déjà installés seront rafraîchis à la prochaine réinstallation du PWA (iOS met en cache les icônes home-screen au moment de l'ajout).
