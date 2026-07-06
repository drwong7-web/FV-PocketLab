## Objectif

Remplacer `localStorage` (limité à ~5–10 MB, synchrone, fragile en navigation privée) par une base structurée, transactionnelle et scalable, sans changer le comportement visible de l'app ni casser les données existantes des utilisateurs.

## Choix technique

- **IndexedDB via [Dexie.js](https://dexie.org/)** comme moteur principal (web + PWA + WebView Capacitor). Asynchrone, transactionnel, index secondaires, quota de plusieurs centaines de Mo, disponible partout (iOS Safari, Chrome Android, desktop).
- **SQLite natif optionnel** via `@capacitor-community/sqlite` uniquement quand l'app tourne en build Capacitor (détection `Capacitor.isNativePlatform()`). Même API côté app, adaptateur différent. Non requis pour la version web/PWA.
- Pas de Lovable Cloud ici — on reste local-first conforme aux règles projet.

Raison du double moteur : IndexedDB suffit pour 99 % des cas, mais SQLite natif offre une meilleure fiabilité si l'utilisateur installe l'app en natif (pas d'éviction navigateur, sauvegardes iOS/Android).

## Schéma de la base `slfv`

Une base Dexie v1 avec les tables (object stores) correspondant 1:1 aux clés `slfv:*` actuelles :

```text
users        (id PK, email idx, organizationId idx)
orgs         (id PK)
teams        (id PK, organizationId idx, createdAt idx)
players      (id PK, teamId idx, organizationId idx, lastName idx)
tests        (id PK, playerId idx, organizationId idx, createdAt idx)
session      (key PK)   -- singleton {key:"current", userId}
meta         (key PK)   -- flags divers (profile-ready, schemaVersion, …)
```

Les index (`organizationId`, `teamId`, `playerId`, `createdAt`) remplacent les `filter()` en mémoire actuels et rendent les requêtes O(log n).

## Architecture code

Nouveau module `src/lib/db/` :

```text
src/lib/db/
  index.ts          exporte `db` (instance Dexie) + type Repo
  schema.ts         définition des tables + migrations Dexie
  repo.ts           API repository (listTeams, createPlayer, saveTest, …) — MÊME signature que src/lib/storage.ts mais 100 % async
  migrateFromLocalStorage.ts   one-shot: lit toutes les clés slfv:* → insert dans Dexie → marque meta.migratedAt → conserve un backup JSON dans slfv:__backup avant suppression
  sqliteAdapter.ts  (optionnel) même interface pour Capacitor SQLite
```

`src/lib/storage.ts` devient une façade fine qui redirige vers `repo.ts`. Toutes les fonctions passent en `async` (`Promise<Team[]>`, etc.).

## Impact appelants

Chaque appel synchrone actuel (`listTeams(orgId)`, `getPlayer(id)`, `saveTest(…)`) devient asynchrone. Adaptation dans :

- `src/lib/auth.tsx` (hydratation initiale via `useEffect` + état `loading`)
- `src/lib/settings.tsx`
- `src/lib/sync/snapshot.ts` (collecte/restore passent par le repo, plus par `localStorage`)
- Pages : `Dashboard`, `Teams`, `TeamDetail`, `PlayerDetail`, `TestList`, `TestResults`, `NewTest`, `JumpTest`, `SprintTest`
- Composants : `ImportPlayersDialog`, `AppLayout`

Migration en utilisant `@tanstack/react-query` (déjà installé) : chaque lecture devient un `useQuery(["teams", orgId], () => repo.listTeams(orgId))`. Cache, invalidation, states loading/error gérés proprement. Mutations via `useMutation` + `queryClient.invalidateQueries`.

## Migration des données utilisateur

Au premier boot post-déploiement :
1. `migrateFromLocalStorage()` détecte les clés `slfv:*` existantes.
2. Copie tout dans Dexie dans une transaction unique.
3. Écrit `meta.schemaVersion = 1` et `meta.migratedAt`.
4. Sauvegarde un backup JSON compressé dans `slfv:__backup-v0` (au cas où) puis supprime les anciennes clés `slfv:users|orgs|teams|players|tests|session|profile-ready`.
5. Si la migration échoue, on garde `localStorage` intact et on log l'erreur (aucune perte).

Idempotent : si `meta.schemaVersion` existe déjà, on skip.

## Sync (Google Drive / iCloud / .slfv)

`src/lib/sync/snapshot.ts` est réécrit pour lire/écrire via le repo au lieu de `localStorage`. Le format du fichier `.slfv` (JSON `SnapshotV1`) ne change pas → compat totale avec les fichiers déjà exportés par les utilisateurs. Les anciens snapshots restent restaurables.

## Dépendances ajoutées

- `dexie` (~25 KB gzip)
- `dexie-react-hooks` (facilite `useLiveQuery` pour la réactivité)
- `@capacitor-community/sqlite` + `jeep-sqlite` seront ajoutés **plus tard**, uniquement si l'utilisateur active le build Capacitor. Pas dans ce lot.

## SPEC.md

Mise à jour section **2. Tech stack** et **5. Data model** :
- Persistance : IndexedDB via Dexie (`db.ts`), fallback SQLite natif Capacitor.
- Nouveau chemin `src/lib/db/`.
- `storage.ts` devient façade async.
- Migration automatique one-shot depuis `localStorage`.

Bump `Last updated`.

## Étapes d'implémentation

1. `bun add dexie dexie-react-hooks`
2. Créer `src/lib/db/{schema,index,repo,migrateFromLocalStorage}.ts`.
3. Réécrire `src/lib/storage.ts` en façade async → repo.
4. Adapter `auth.tsx` + `settings.tsx` (async init).
5. Migrer chaque page/composant appelant vers `useQuery` / `useMutation` (parallélisable).
6. Adapter `sync/snapshot.ts` au repo.
7. Ajouter appel `migrateFromLocalStorage()` au boot dans `main.tsx` (avant `AuthProvider`).
8. Mettre à jour `SPEC.md`.
9. Vérif Playwright : enrollment + création team + création player + import screenshot → tout persiste, tout se recharge après reload, `IndexedDB.databases()` renvoie `[{name:"slfv",…}]`, `localStorage` ne contient plus que `slfv:__backup-v0` + prefs.

## Hors scope (à discuter séparément si voulu)

- Chiffrement local (Web Crypto au repos).
- Ajout effectif du build Capacitor + SQLite natif.
- Migration du sync vers un vrai delta-sync (aujourd'hui: snapshot complet).
