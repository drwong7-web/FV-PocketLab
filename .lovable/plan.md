# Plan — Retirer la landing page de l'app

## Objectif
Ce projet devient purement l'application : plus d'écran marketing. L'URL racine mène directement à l'authentification, ou au dashboard si l'utilisateur est déjà enrôlé localement. La landing sera recréée dans un nouveau projet Lovable séparé que tu créeras toi-même (je pourrai y copier `Landing.tsx` depuis ce projet via `@mention` quand tu me le demanderas depuis là-bas).

## Changements dans ce projet

1. **`src/App.tsx`**
   - Retirer les imports et la route `Landing`.
   - Route `/` → petit composant `RootRedirect` qui lit `useAuth()` :
     - `loading` → écran vide (comme `ProtectedRoute`)
     - `enrolled` → `<Navigate to="/app" replace />`
     - sinon → `<Navigate to="/auth" replace />`
   - Garder l'alias `/dashboard` → `/app`.

2. **`src/pages/Landing.tsx`** — supprimer le fichier.

3. **`src/pages/Index.tsx`** — supprimer (ne fait que ré-exporter `Landing`, plus utilisé).

4. **`src/pages/Auth.tsx`** — vérifier et retirer tout lien retour "← accueil / landing" s'il en existe (à confirmer à la lecture).

5. **`index.html`** — mettre à jour `<title>` et `<meta name="description">` pour refléter l'app (plus de pitch marketing landing).

6. **`SPEC.md`** — dans la section Routes, retirer `/` = Landing, documenter `/` = redirection conditionnelle. Bump `Last updated`.

## Hors périmètre
- Création du nouveau projet Lovable "landing page" (à faire par toi côté dashboard).
- Copie de `Landing.tsx` dans ce nouveau projet (je le ferai depuis ce nouveau projet quand tu m'y inviteras via `@mention` de ce projet-ci).
- Aucun changement au flux d'auth, au stockage IndexedDB, ni au reste des pages.

## Vérification
- Build passe.
- Playwright : ouvrir `/` sans données locales → arrive sur `/auth`. Recharger après enrôlement → arrive sur `/app`. `/dashboard` redirige toujours vers `/app`.
