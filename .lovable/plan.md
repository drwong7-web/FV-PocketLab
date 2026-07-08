## Objectif

Remplacer l'icône circulaire verte (div avec `Activity` SVG) dans le header de `src/components/AppLayout.tsx` (ligne 126-128) par le logo FV fourni, adapté au design de l'app.

## Étapes

1. **Adapter le logo au design**
   - Le logo actuel a un "F" gris foncé et un "V" vert lime avec un éclair.
   - L'adapter à la palette de l'app : recolorer le "F" en `foreground` (blanc/noir selon thème) et garder le "V" en `primary` (vert accent de l'app, hue dynamique via `--primary`).
   - Générer une version PNG à fond transparent via `imagegen--edit_image` à partir de `user-uploads://logo_FV.png` avec prompt : "Recolor the F letter to pure white, keep the V + lightning bolt in bright neon green (#5FFF3C), transparent background, clean vector look, no shadow".
   - Sauver dans `src/assets/logo-fv.png`.

2. **Remplacer l'élément sélectionné dans `AppLayout.tsx`**
   - Retirer le `<div className="w-8 h-8 rounded-lg bg-gradient-primary shadow-glow ...">` + `<Activity>` (lignes 126-128).
   - Le remplacer par : `<img src={logoFv} alt="PocketLab" className="w-8 h-8 object-contain" />`.
   - Ajouter l'import : `import logoFv from "@/assets/logo-fv.png";`.
   - Retirer l'import `Activity` du header s'il n'est plus utilisé ailleurs dans le fichier (il l'est encore pour navItems → garder).

3. **Vérification**
   - Aucun changement de logique, SPEC.md non impacté (tweak visuel).
   - Vérifier le rendu dans le preview mobile (390x844).

## Détails techniques

```tsx
// AppLayout.tsx
import logoFv from "@/assets/logo-fv.png";

<Link to="/app" className="flex items-center gap-2">
  <img src={logoFv} alt="PocketLab" className="w-8 h-8 object-contain" />
  <div className="leading-tight">
    <div className="font-bold text-sm tracking-tight">PocketLab</div>
    ...
  </div>
</Link>
```

Aucune modification des tokens de design ni de `SPEC.md`.
