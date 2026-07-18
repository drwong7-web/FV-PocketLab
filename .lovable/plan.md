## Ajouter la suppression des tests sur la page des tests

Ajouter une icône poubelle sur chaque ligne de test dans `src/pages/TestList.tsx`, avec le même style que la page Teams (icône `Trash2` de lucide, `text-muted-foreground hover:text-destructive`, confirmation avant suppression, toast de succès).

### Détails techniques

- `src/pages/TestList.tsx` :
  - Restructurer chaque ligne (actuellement un `<Link>` englobant) en `glass-card` contenant le `<Link>` en flex-1 + un bouton poubelle à droite (même pattern que `Teams.tsx` et `PlayerDetail.tsx`).
  - Import : `Trash2` de `lucide-react`, `deleteTest` de `@/lib/storage`, `deleteLocalTest` de `@/lib/localHistory`, `toast` de `sonner`, `useState` pour forcer le re-render.
  - Router selon `tt.source` : `"local"` → `deleteLocalTest(tt.id)`, sinon `deleteTest(tt.id)`.
  - Confirmation via `confirm(t("deleteTestConfirm"))` puis `toast.success(t("testDeleted"))` — clés déjà existantes (utilisées dans `PlayerDetail.tsx`).
  - Le compteur des onglets se met à jour automatiquement via le re-render.

Aucun changement de logique métier, aucune modification i18n, aucun changement dans les autres pages.
