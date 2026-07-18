## Objectif

Remplacer l'écran d'enrôlement actuel (nom + équipe) par un vrai écran d'authentification local avec **Sign up** et **Login**, protégé par mot de passe. Sans identifiants valides, aucun accès à l'application.

## Problème actuel

Dans `src/lib/auth.tsx`, `enroll()` fait :
```ts
let u = currentUser() ?? listUsers()[0] ?? null;
if (!u) { u = createUserAndOrg(...) }
```
→ n'importe quel nouveau nom saisi après une déconnexion réutilise le premier user trouvé, donc ouvre les données de quelqu'un d'autre. Il n'y a **aucune vérification de mot de passe**.

Par ailleurs `createUserAndOrg` et `authenticate` existent déjà dans `src/lib/storage.ts` avec un `passwordHash` — mais l'UI ne les utilise pas.

## Changements

### 1. `src/pages/Auth.tsx` — deux modes: Login / Sign up
- Toggle en haut du formulaire (`Login` par défaut si au moins un user local existe, `Sign up` sinon).
- **Sign up** : champs `Nom`, `Mot de passe`, `Confirmer mot de passe`. Crée profil + org (org = nom par défaut, on supprime le champ "équipe" du formulaire d'auth comme demandé — la 1ère équipe sera créée dans l'onboarding / page Teams).
- **Login** : champs `Nom`, `Mot de passe`. Vérifie contre le hash stocké. Erreur explicite si invalide, **pas** d'accès.
- Validation zod (longueur nom 1–60, mot de passe ≥ 6).
- Retirer le champ "équipe" et le texte associé.

### 2. `src/lib/auth.tsx` — API repensée
Remplacer `enroll({name, org})` par :
- `signUp({ name, password })` → refuse si un user avec ce nom existe déjà ; crée user+org (org = name) ; pose `slfv:session = { userId }` + `PROFILE_FLAG`.
- `login({ name, password })` → cherche le user par nom (case-insensitive), compare `hashPassword(password)` au `passwordHash` stocké ; si ok, pose la session + flag ; sinon throw.
- `signOut()` reste inchangé (ne supprime pas les données, retire session + flag).
- `enrolled` devient : `hasProfile() && session.userId` valide → sinon renvoyer vers `/auth`. Ça bloque l'accès si pas de login réussi, même quand des profils existent déjà en local.

`storage.ts` utilise déjà l'email comme identifiant unique — on va utiliser un pseudo-email dérivé du nom (`${slug(name)}@local`) pour rester compatible sans changer le schéma `User`.

### 3. `src/lib/storage.ts` — petits ajouts
- `authenticateByName(name, password)` (wrapper de `authenticate` avec l'email dérivé) OU exposer `findUserByName`.
- Rien d'autre à toucher — types stables.

### 4. i18n
Ajouter dans `src/lib/settings.tsx` : `login`, `signUp`, `password`, `confirmPassword`, `passwordsDontMatch`, `passwordTooShort`, `invalidCredentials`, `nameAlreadyExists`, `switchToLogin`, `switchToSignup`. Traductions FR/EN/AR.

### 5. Nettoyage
- Supprimer l'ancien state `org` et le label `team` dans `Auth.tsx`.
- Retirer les i18n keys d'auth devenues inutilisées si détectées (`nameTeamRequired` remplacée par une variante mot de passe).

## Vérification

1. Créer profil "Alice" / mdp `abc123` → accès app, ajouter 1 équipe + 1 test.
2. Se déconnecter → écran auth par défaut en mode **Login**.
3. Essayer "Alice" + mauvais mdp → erreur, pas d'accès.
4. "Alice" + bon mdp → retrouve équipes/tests.
5. Basculer en **Sign up** → créer "Bob" / `xyz789` → nouvelle organisation, ne voit pas les données d'Alice.
6. Login "Bob" après logout → ses propres données.

## Détails techniques

- Hash mdp = `hashPassword` existant (prototype local, non cryptographique — cohérent avec l'app local-first, à documenter dans `SPEC.md`).
- Slug email : `name.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '@local'`. Deux users du même nom sont interdits (déjà géré par le check email dans `createUserAndOrg`).
- Pas de reset password (local-only, hors scope).
- `SPEC.md` à mettre à jour : nouveau flow d'auth + champ password local + politique de session.
