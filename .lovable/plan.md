## Objectif
Réaligner la carte d'équipe dans `src/pages/Teams.tsx` (ligne 70-99) sur le design system des cartes du tableau de bord (`Dashboard.tsx`).

## Problème constaté
La carte actuelle utilise `glass-card flex items-center group` sans :
- padding uniforme sur la carte
- effet `hover:border-primary/40`
- `transition-colors`
- fond dégradé `bg-gradient-to-br from-primary/10 to-transparent`

Les cartes du tableau de bord utilisent ce pattern (ex. lignes 38, 44, 59, 77).

## Plan de modification

### 1. Restructurer la carte équipe
Remplacer la structure actuelle :
```tsx
<div className="glass-card flex items-center group">
  <Link to={`/app/teams/${tm.id}`} className="flex-1 p-4 flex items-center justify-between">
    ...
  </Link>
  <button className="p-3 ...">...</button>
</div>
```

Par une structure cohérente avec les cartes du dashboard :
```tsx
<Link
  to={`/app/teams/${tm.id}`}
  className="glass-card p-5 flex items-center justify-between group hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent"
>
  <div>
    <div className="font-semibold">{tm.name}</div>
    <div className="text-xs text-muted-foreground mt-0.5">
      {tm.sport ? tm.sport + " · " : ""}{count} {count === 1 ? t("player").toLowerCase() : t("players").toLowerCase()}
    </div>
  </div>
  <div className="flex items-center gap-1">
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
    <button
      onClick={(e) => {
        e.preventDefault();
        if (confirm(...)) { ... }
      }}
      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
      aria-label={t("deleteTeam")}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</Link>
```

### 2. Gérer la suppression
Le bouton de suppression doit être à l'intérieur du `<Link>` pour rester dans la carte, avec `e.preventDefault()` pour éviter la navigation lors du clic sur la corbeille.

### 3. Vérification
- Build pass
- Vérifier visuellement que la carte suit le même style que les cartes du dashboard (padding, hover, dégradé)

## Fichier concerné
- `src/pages/Teams.tsx`

## Non-concerné (hors scope demandé)
- Les autres cartes de liste similaires (`TeamDetail.tsx`, `PlayerDetail.tsx`) ne seront pas modifiées sauf si l'utilisateur le demande.