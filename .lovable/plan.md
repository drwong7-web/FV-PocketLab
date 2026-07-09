## Effet gravé sur les MetricCard du Dashboard

Appliquer un style « letterpress / gravé dans le métal » aux cartes de métriques (Teams, Players, Tests) via `src/components/MetricCard.tsx`.

### Rendu visuel

- **Fond** : dégradé plus sombre et mat, façon plaque de métal brossé.
- **Texte du label et de la valeur** : effet gravé — couleur légèrement plus sombre que le fond + ombre claire subtile en bas (`text-shadow` inset-like) et ombre foncée en haut, donnant l'impression d'être creusé dans la surface.
- **Bordure intérieure** : liseré sombre en haut + liseré clair en bas (`inset` box-shadow) pour renforcer la profondeur.
- **Icône** : même traitement gravé, opacité réduite.

### Détails techniques

- Ajouter une classe utilitaire `.engraved` dans `src/index.css` (layer components) :
  - `text-shadow: 0 1px 0 hsl(var(--foreground) / 0.08), 0 -1px 1px hsl(var(--background) / 0.6);`
  - Couleur de texte : `hsl(var(--foreground) / 0.55)`.
- Ajouter `.engraved-surface` avec `box-shadow: inset 0 1px 0 hsl(var(--background)/0.5), inset 0 -1px 0 hsl(var(--foreground)/0.1);`
- Dans `MetricCard.tsx` :
  - Ajouter `engraved-surface` sur le conteneur.
  - Ajouter `engraved` sur `<span>` label et `<span>` value.
- Aucun changement d'API du composant, aucune modification des données.
