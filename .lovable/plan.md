## Plan: extraire le logo vert et l'appliquer gravé sur la carte

1. **Extraire le logo sur fond transparent**
   - Utiliser `imagegen--edit_image` sur `/mnt/user-uploads/1783643485722.png` avec `transparent_background: true` pour isoler le logo vert et supprimer le fond noir.
   - Sortie: `/tmp/jump-logo-transparent.png`.

2. **Publier l'asset CDN**
   - `lovable-assets create --file /tmp/jump-logo-transparent.png --filename jump-logo.png` → écrire dans `src/assets/jump-logo.png.asset.json` (remplace l'asset actuel qui pointe vers l'image à fond noir).
   - Supprimer l'ancien asset via `lovable-assets delete` avant recréation pour éviter un orphelin.

3. **Appliquer l'effet gravé sur la carte Vertical jump** (`src/pages/NewTest.tsx`)
   - Le `<img>` est déjà en place (import inchangé, même URL).
   - Remplacer le `drop-shadow` coloré par un effet gravé cohérent avec la classe `engraved` du reste du design system: double `drop-shadow` (highlight clair en bas, ombre sombre en haut) via tokens HSL, opacité adaptée dark/light. Pas de couleur hardcodée.
   - Conserver la mise en page: logo à gauche, titre "Vertical jump" (classe `engraved`) centré verticalement à côté.

4. **Vérification**
   - `bun run build`.
   - Screenshot Playwright de `/app/tests/new` (session Supabase injectée) pour confirmer le rendu gravé du logo vert transparent.

### Détails techniques
- Aucune modification du business logic, uniquement asset + présentation.
- Pas de mise à jour SPEC.md (changement purement visuel).
