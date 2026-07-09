Remplacer les boutons "New" par "Add new" et supprimer l'icône `Plus` sur toutes les occurrences de l'app.

## Fichiers modifiés

- `src/pages/Teams.tsx` (l. 41-43) — bouton "New" → "Add new", suppression `<Plus />`
- `src/pages/TestList.tsx` (l. 20-22) — bouton "New" → "Add new", suppression `<Plus />`
- `src/pages/PlayerDetail.tsx` (l. 61-63) — bouton "New test" → "Add new", suppression `<Plus />`
- `src/pages/Dashboard.tsx` (l. ~85) — bouton "Create a team" reste inchangé (pas un bouton "New")

## Détails

Chaque bouton devient :

```tsx
<Button className="bg-gradient-primary text-primary-foreground font-bold uppercase tracking-wide">
  Add new
</Button>
```

Retrait des imports `Plus` de `lucide-react` dans les fichiers concernés s'ils ne sont plus utilisés ailleurs.

Aucun changement de logique, uniquement libellé et icône.
