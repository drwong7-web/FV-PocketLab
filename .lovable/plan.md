## Problème

Les tests "locaux" (Jump + Sprint récents) sont stockés sous une clé globale `fv:local-tests:v1` dans `src/lib/localHistory.ts`, sans aucune notion de profil. Résultat : tous les profils qui se connectent sur le même appareil voient et modifient la même liste. Les tests "legacy" (`slfv:tests` dans `storage.ts`) sont eux déjà filtrés par `organizationId`, donc corrects.

## Objectif

Cloisonner les tests locaux par profil, comme le sont déjà les équipes/joueurs/tests legacy, sans perdre les données existantes.

## Changements

1. **`src/lib/localHistory.ts`** — passer d'une clé unique à une clé par utilisateur :
   - Nouvelle fonction interne `currentKey()` qui retourne `fv:local-tests:v1:<userId>` en lisant `currentUser()` depuis `storage.ts`.
   - `read()` / `write()` / `saveLocalTest` / `getAllLocalTests` / `getLocalTests` / `getLocalTestsForAthlete` / `getLocalTest` / `markLocalTestSaved` / `deleteLocalTest` utilisent tous cette clé dynamique.
   - Si aucun utilisateur n'est connecté → retourner `[]` (aucun test visible, aucune écriture) au lieu d'écrire dans un bucket partagé.

2. **Migration douce (one-shot)** — au premier appel après signIn/signUp :
   - Si `fv:local-tests:v1:<userId>` est vide **et** que l'ancienne clé `fv:local-tests:v1` contient des entrées, copier ces entrées vers la clé du profil courant (attribution au profil actif), puis supprimer l'ancienne clé.
   - Empêche la perte des tests enregistrés avant le correctif pour l'utilisateur qui les a réellement créés (le premier à se reconnecter les récupère ; s'il y a plusieurs profils, on peut décider de simplement supprimer l'ancienne clé au lieu de la migrer — à confirmer).

3. **`src/lib/auth.tsx`** — au `signOut`, ne rien toucher aux clés `fv:local-tests:v1:*` (elles restent, propres à chaque profil, comme déjà le cas pour équipes/joueurs).

4. **`src/lib/unifiedTests.ts`** — aucun changement de code nécessaire, il consomme `getLocalTests()` qui devient automatiquement scoped.

## Question ouverte

Pour les tests locaux déjà présents sur l'appareil avant ce correctif :
- **Option A** : les attribuer au premier profil qui se connecte après la mise à jour (migration).
- **Option B** : les supprimer (repart propre, aucun risque de fuite entre profils existants).

Je pars sur **Option A** par défaut, dis-moi si tu préfères B.
