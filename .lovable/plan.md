## Effet 3D sur la barre de navigation du bas

Ajouter un effet 3D marqué aux onglets (Dashboard, Teams, Tests) de la navigation inférieure dans `src/components/AppLayout.tsx`.

### Comportement visuel

- **Onglet actif** : se soulève avec une légère rotation vers l'arrière (perspective), icône agrandie, halo lumineux coloré (accent primaire) diffusé derrière, ombre portée pour donner de la profondeur.
- **Onglet inactif au survol** : petit soulèvement 3D subtil pour indiquer l'interactivité.
- **Transitions** fluides (~300 ms) sur transform, couleur et ombre.
- **Texte** en gras majuscule pour renforcer la lisibilité 3D.

### Détails techniques

- Ajouter `perspective` sur le conteneur `<div>` de la nav.
- Utiliser `transform-style: preserve-3d`, `translateY` + `rotateX` sur chaque `NavLink`.
- `drop-shadow` en HSL du token `--primary` pour l'effet néon.
- Halo : `<span>` absolu avec `bg-gradient-primary`, `blur-md`, `opacity-20`, positionné derrière l'icône.
- Icône : `strokeWidth={2.5}`, `scale-125` quand active.
- Aucun changement de logique, routes, ou tokens de couleur — uniquement styles Tailwind dans `AppLayout.tsx`.
