## Problème

Dans `src/lib/auth.tsx`, la fonction `signOut()` supprime `slfv:users`, `slfv:orgs` et `slfv:session` du stockage local. Comme l'app est local-first et que toutes les données (équipes, athlètes, tests) sont liées à `organization_id` / `user_id`, effacer ces clés à la déconnexion casse le lien avec les données existantes. À la reconnexion, `enroll()` crée un **nouveau** user + une **nouvelle** organisation avec de nouveaux IDs — les anciennes données existent toujours en base locale mais deviennent orphelines et invisibles.

## Correctif

Modifier `signOut()` dans `src/lib/auth.tsx` pour qu'elle ne détruise plus le profil ni l'organisation :

- Ne plus supprimer `slfv:users` ni `slfv:orgs`.
- Conserver `PROFILE_FLAG` supprimé + éventuellement `slfv:session` afin que l'écran d'accueil de connexion réapparaisse.
- À la reconnexion, `enroll()` réutilise déjà `currentUser() ?? listUsers()[0]` : le profil (et donc l'org, et donc les données) sera automatiquement restauré.

Aucun autre fichier n'a besoin d'être touché. Les données (équipes, athlètes, tests) restent intactes puisqu'elles ne sont jamais effacées.

## Vérification

1. Créer un profil, ajouter une équipe + un athlète + un test.
2. Se déconnecter, puis re-créer le "profil" avec le même nom.
3. Les équipes / athlètes / tests précédents doivent réapparaître.
