# Améliorer le design des boules de couleur (Paramètres)

Cible : la grille de 8 pastilles d'accent dans `src/components/AppLayout.tsx` (section Thème du Dialog Paramètres).

## Améliorations visuelles

1. **Pastilles plus riches**
   - Remplacer le fond plat `hsl(H 90% 55%)` par un dégradé radial : centre lumineux (`H 95% 65%`) → bord plus profond (`H 85% 45%`), avec un léger highlight en haut-gauche pour un effet de bille 3D.
   - Ajouter une ombre portée colorée `0 4px 12px hsl(H 90% 55% / 0.35)` pour un halo assorti.
   - Anneau intérieur subtil (`inset 0 0 0 1px hsl(0 0% 100% / 0.15)`) pour délimiter proprement en clair/sombre.

2. **État actif**
   - Halo primaire renforcé avec double bordure : anneau extérieur `ring-2 ring-offset-2 ring-offset-background` de la couleur elle-même + `Check` blanc net centré avec `drop-shadow`.
   - Légère mise à l'échelle (`scale-110`) et glow animé.

3. **Hover / focus**
   - Transition douce (`transition-all duration-300 ease-out`), `hover:scale-110` remplacé par un `hover:-translate-y-0.5` + glow amplifié.
   - `focus-visible` : anneau accessible utilisant `--ring`.

4. **Grille**
   - Passer de `grid-cols-8 gap-2` → `grid-cols-8 gap-2.5` avec pastilles `h-10 w-10` (au lieu de `h-9 w-9`) pour meilleure zone tactile sur mobile.
   - Conteneur légèrement `py-1` pour laisser respirer les ombres colorées.

5. **Slider de teinte (juste en dessous)**
   - Curseur (thumb) stylé : petit disque blanc avec bordure de la teinte courante, ombre douce, pour cohérence avec les pastilles.
   - Piste (`h-2` → `h-2.5`) avec `rounded-full` et `shadow-inner` léger.

## Portée

- **Fichiers modifiés** : `src/components/AppLayout.tsx` uniquement (markup des pastilles + slider).
- Éventuellement quelques styles pour le thumb du slider dans `src/index.css` (règles `::-webkit-slider-thumb` / `::-moz-range-thumb` scopées via une classe dédiée type `.hue-slider`).
- Aucune logique modifiée : mêmes 8 teintes, même state `accent`, même setter.
