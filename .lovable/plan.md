## Plan

Remplacer le bloc logo actuel sur la page d'authentification (`src/pages/Auth.tsx`) par le même logo image utilisé dans le header de l'application (`src/components/AppLayout.tsx`).

### Changements prévus

1. **Importer le logo** dans `src/pages/Auth.tsx` :
   ```tsx
   import fvLogo from "@/assets/fv-logo.png.asset.json";
   ```

2. **Remplacer le bloc logo** (lignes 41-43) :
   - Supprimer le `<div>` avec le gradient `bg-gradient-primary` et l'icône `<Activity>`.
   - Insérer une balise `<img>` utilisant `fvLogo.url`, avec les mêmes dimensions que dans le header (`w-8 h-8 object-contain`).

3. **Nettoyer l'import** `Activity` de `lucide-react` s'il n'est plus utilisé ailleurs dans le fichier.

### Résultat attendu

Le logo affiché sur `/auth` sera identique à celui du header (`PocketLab`), assurant une cohérence visuelle entre l'écran de connexion et le reste de l'application.