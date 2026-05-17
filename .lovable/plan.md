## Problème

Lors de chaque changement de route dans `/app/*`, on voit un bref flash sombre (<300 ms). Causes identifiées :

1. **`animate-fade-in` sur `<main>`** (`AppLayout.tsx:257`) — la keyframe va de `opacity: 0.6` → `1`. Comme `<main>` est conservé entre les routes, l'animation ne se rejoue pas… mais plusieurs pages remontent un nouvel arbre vide pendant 1 frame, laissant apparaître le **fond `--background` foncé + `--gradient-hero`** du `body`.
2. **Pages qui retournent `null`** pendant le chargement (`Dashboard`, `Teams`, `TestList` : `if (!user) return null`) — pendant ce micro-instant, seul le fond sombre du body est visible.
3. Absence de transition CSS sur le conteneur de l'`Outlet` : le swap est instantané et sans cross-fade.

## Correctif proposé

Tout reste en frontend, aucun changement de logique métier.

### 1. `src/components/AppLayout.tsx`
- Encapsuler `<Outlet />` dans un `<div>` **keyé par `location.pathname`** pour rejouer une transition à chaque changement de route.
- Retirer `animate-fade-in` de `<main>` (qui ne se déclenche jamais réellement) et l'appliquer au div interne avec une variante plus douce.

```tsx
const location = useLocation();
...
<main className="flex-1 container max-w-5xl pb-28 pt-4">
  <div key={location.pathname} className="animate-page-in">
    <Outlet />
  </div>
</main>
```

### 2. `tailwind.config.ts`
Remplacer la keyframe `fade-in` (qui part de `0.6` et crée la sensation d'assombrissement) par une transition `page-in` plus subtile, sans drop d'opacité visible :

```ts
keyframes: {
  "page-in": {
    from: { opacity: "0", transform: "translateY(4px)" },
    to:   { opacity: "1", transform: "translateY(0)" },
  },
},
animation: {
  "page-in": "page-in 180ms ease-out",
}
```

Conserver l'ancienne `fade-in` si elle est utilisée ailleurs (vérification : un seul usage trouvé dans `AppLayout`).

### 3. Éviter le « vide » pendant le chargement (`Dashboard.tsx`, `Teams.tsx`, `TestList.tsx`)
Remplacer `if (!user) return null;` par un placeholder neutre de même hauteur, par ex. :

```tsx
if (!user) return <div className="min-h-[60vh]" aria-hidden />;
```

Cela évite que le `<main>` se retrouve momentanément vide → plus de fond sombre visible.

### 4. (Optionnel) Atténuer le contraste du `body`
Le `body` utilise `--gradient-hero` + `--background` très sombre en thème dark. On peut donner au `<main>` un fond identique à `--background` pour qu'il n'y ait pas de « différence visible » même si l'arbre est vide :

```tsx
<main className="flex-1 container max-w-5xl pb-28 pt-4 bg-background">
```

(à valider visuellement — pourrait masquer le dégradé voulu ; à ne faire que si nécessaire).

## Fichiers modifiés

- `src/components/AppLayout.tsx` — wrap Outlet keyé + classe d'animation
- `tailwind.config.ts` — keyframe `page-in`
- `src/pages/Dashboard.tsx`, `src/pages/Teams.tsx`, `src/pages/TestList.tsx` — placeholder au lieu de `return null`

## Vérification

- Naviguer Dashboard ↔ Teams ↔ Tests ↔ Player detail : la transition doit être un léger fondu vers le haut, sans flash sombre intermédiaire.
- Vérifier sur viewport mobile (393×714) que le placeholder évite tout reflow.
