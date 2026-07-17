# Organisation de la page Tests par catégorie

## Objectif

Sur `/app/tests`, regrouper les tests enregistrés par **type** (Saut vertical / Sprint linéaire) via des **onglets** en haut de page.

## Changement — `src/pages/TestList.tsx`

Remplacer la liste unique par un composant `Tabs` (shadcn, déjà présent dans le projet).

Structure :

```
[ Tous ] [ Saut vertical ] [ Sprint linéaire ]

<liste filtrée selon l'onglet actif, ordre chronologique inverse>
```

- **Tous** : comportement actuel, tous les tests confondus.
- **Saut vertical** : `tests.filter(t => t.type === "jump")`.
- **Sprint linéaire** : `tests.filter(t => t.type === "sprint")`.

Chaque onglet affiche à côté de son libellé le nombre de tests correspondants (badge discret).

État vide par onglet : réutiliser le message existant `t("noTests")` quand la catégorie sélectionnée est vide.

## Traductions — `src/lib/settings.tsx`

Ajouter (FR / EN / AR) uniquement si absentes :
- `all` (Tous / All / الكل)
- `verticalJump` / `linearSprint` sont déjà utilisés ailleurs — les réutiliser.

## Non concerné

- Aucune modification du stockage, des calculs, ou de la page de résultat d'un test.
- Aucun changement sur `PlayerDetail` ou `Dashboard`.
- Onglets uniquement sur cette page.
