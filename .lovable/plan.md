## Problème

Dans `src/components/AppLayout.tsx`, le `<Outlet />` est enveloppé ainsi :

```tsx
<div key={location.pathname} className="animate-page-in">
  <Outlet />
</div>
```

Deux causes au flash de fond entre les pages :

1. **`key={location.pathname}`** force React à démonter complètement l'ancienne page et à remonter la nouvelle à chaque navigation. Pendant ce remount, le conteneur est vide → on voit le background.
2. **`animate-page-in`** part de `opacity: 0` + `translateY(4px)` (défini dans `tailwind.config.ts`). Donc même après le mount, la nouvelle page est invisible pendant ~100 ms → flash supplémentaire.

L'effet combiné = "ça disparaît / réapparaît" comme décrit.

## Solution

Garder une transition douce sans vider l'écran.

### 1. `src/components/AppLayout.tsx`

Remplacer le wrapper par :

```tsx
<main className="flex-1 container max-w-5xl pb-28 pt-4">
  <Outlet />
</main>
```

- Supprimer `key={location.pathname}` → plus de démontage forcé, React Router gère la transition de routes proprement (le layout et son fond restent stables).
- Supprimer `animate-page-in` sur le wrapper.

### 2. `tailwind.config.ts`

Adoucir la keyframe `page-in` pour qu'elle ne parte plus de `opacity: 0` (au cas où elle reste utilisée ailleurs) :

```ts
"page-in": {
  from: { opacity: "0.85", transform: "translateY(2px)" },
  to:   { opacity: "1",    transform: "translateY(0)" },
},
"page-in": "page-in 120ms ease-out",
```

Ainsi, si on souhaite réintroduire une micro-animation par page (par exemple sur un sous-élément spécifique), elle reste subtile et ne crée pas de blackout.

## Hors scope

- Pas de changement de logique métier, pas de modif des pages elles-mêmes.
- Pas d'ajout de librairie d'animations.
- Pas de modif aux composants caméra/calibration.

## Vérification

Naviguer entre Dashboard → Teams → Tests et inversement : plus de flash de fond, le header/bottom nav restent fixes, le contenu se remplace instantanément.
