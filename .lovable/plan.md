Rendre les titres "Manage Teams" et "New Test" plus marqués dans `src/pages/Dashboard.tsx`.

## Changements

Sur les deux `<Link>` de la grille d'actions (lignes 36 et 42) :

- Passer le texte de `font-semibold` (base ~14px) à `text-lg font-bold tracking-tight`
- Ajouter `uppercase` léger via `text-base` → non, préférer : **`text-lg font-bold tracking-tight`** pour un poids visuel net sans casser le style
- Augmenter le padding des cartes de `p-5` à `p-6` pour équilibrer avec le titre plus gros
- Renforcer la flèche : `w-5 h-5` → `w-6 h-6` avec `stroke-[2.5]`

## Détails techniques

```tsx
<Link ... className="group glass-card p-6 ...">
  <div className="font-bold text-lg tracking-tight">Manage Teams</div>
  <ArrowRight className="w-6 h-6 text-primary stroke-[2.5]" />
</Link>
```

Aucun changement de logique, uniquement presentational. Pas de modification de SPEC.md (tweak visuel pur).
