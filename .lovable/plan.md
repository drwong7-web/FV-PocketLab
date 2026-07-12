Les boutons de direction du vent (Propulsion / Neutre / Résistance) dans la section Conditions du test Sprint utilisent actuellement le style par défaut du composant `ToggleGroupItem` (`bg-accent` à l'état actif). Les boutons de distance du protocole (30 m / 40 m / 60 m) ont un style distinct : bordure `border-primary` et fond `bg-primary/10` à l'état actif, bordure `border-input` au repos.

Plan :
1. Modifier les `ToggleGroupItem` de la direction du vent dans `src/pages/SprintTest.tsx` (lignes ~371-379) pour appliquer le même style visuel que les boutons de distance.
2. Utiliser des classes conditionnelles ou une nouvelle variante `protocol` dans `src/components/ui/toggle.tsx` afin que l'état sélectionné (`data-[state=on]`) corresponde à `border-primary bg-primary/10 text-primary`, et l'état non sélectionné à `border border-input hover:border-primary/50`.
3. Vérifier que le rendu visuel est cohérent avec les boutons de distance et que le comportement de sélection unique reste fonctionnel.

Fichiers concernés :
- `src/components/ui/toggle.tsx`
- `src/pages/SprintTest.tsx`