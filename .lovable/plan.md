Modifier l'alignement vertical du bouton "Nouveau" dans `src/pages/Teams.tsx`.

Le bouton est contenu dans une flexbox utilisant `items-end`, ce qui l'aligne sur le bas. Remplacer par `items-center` pour le centrer verticalement par rapport au titre et sous-titre à gauche.

Changement technique :
- `src/pages/Teams.tsx` ligne 42 : `className="flex items-end justify-between"` → `className="flex items-center justify-between"`