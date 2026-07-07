## Diagnostic

L'app n'utilise **aucune base de données distante** pour les joueuses : tout est stocké localement dans IndexedDB (Dexie) via `src/lib/db/kvStore.ts`. La liste des joueuses est lue de façon **synchrone** depuis un cache en mémoire.

Le délai que tu observes vient de `src/main.tsx` :

```ts
bootstrapKvStore().finally(() => { root.render(<App />); });
```

Tant que `bootstrapKvStore()` n'a pas fini (ouverture Dexie + `db.kv.toArray()` de toutes les clés `slfv:*`), **React ne monte rien** — l'écran reste vide. Sur mobile / première visite / navigation privée, cela peut prendre 200–800 ms et donne l'impression que "les joueuses tardent à charger".

Aucun appel réseau ni serveur n'est en cause.

## Plan (2 changements ciblés, code frontend uniquement)

### 1. Rendu immédiat + splash cohérent (`src/main.tsx`)
- Monter `<App />` **tout de suite**, sans attendre Dexie.
- Exposer la promesse `bootstrapKvStore()` via un petit hook `useKvReady()` (nouveau, dans `src/lib/db/kvStore.ts`) qui renvoie `true` une fois le cache hydraté.
- Injecter dans `index.html` un splash minimal (logo + fond `--background`) affiché avant le premier paint React, retiré au premier render — remplace l'écran blanc actuel.

### 2. Gate d'hydratation dans `AuthProvider` (`src/lib/auth.tsx`)
- Aujourd'hui `AuthProvider` fait `refreshProfile()` dans un `useEffect` et met `loading = false` immédiatement, **même si le cache Dexie n'est pas encore chargé** → `enrolled` peut être `false` à tort → redirection éclair vers `/auth` puis re-render vers `/app` quand les données arrivent (effet "flash" et re-fetch des listes).
- Corriger : `loading` reste `true` tant que `useKvReady()` n'est pas prêt, puis `refreshProfile()` s'exécute une seule fois. Cela supprime le double-render + la latence perçue sur `Dashboard` / `Teams` / `Players`.

### 3. Micro-optimisations Dexie (sans changement d'API)
- Dans `bootstrapKvStore()` : lire uniquement les clés `DATA_PREFIXES` et laisser `Dexie` ouvrir en `autoOpen` sans `await d.open()` explicite (économie ~50–150 ms au cold start).
- Marquer le cache comme "prêt" dès que les collections critiques (`slfv:users`, `slfv:orgs`, `slfv:teams`, `slfv:players`) sont chargées ; laisser le reste (`slfv:tests`, snapshots, etc.) se peupler en tâche de fond via `requestIdleCallback`.

### Hors périmètre
- Pas de changement d'architecture (on reste local-first IndexedDB, aucun backend ajouté).
- Pas de modif du schéma de données, des routes, ni du SPEC (le comportement public de `storage.ts` est inchangé). Donc pas de bump `SPEC.md`.

## Résultat attendu
- Premier paint < 100 ms (splash) au lieu d'un écran blanc.
- Plus de "flash" `/auth` → `/app`.
- Les listes de joueuses apparaissent dès le premier render de `Teams` / `PlayerDetail`, sans latence perceptible.
