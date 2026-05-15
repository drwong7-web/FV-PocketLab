## Problème

Sur la fiche athlète, le bouton "Nouveau test" navigue vers `/app/tests/new?playerId=...`. Mais la page **NewTest** (sélection Jump/Sprint) ne transmet pas ce `playerId` aux liens vers `/app/tests/new/jump` et `/app/tests/new/sprint`. Résultat : l'athlète est perdu et les champs (mass, height, hPO) ne se pré-remplissent pas.

Bonne nouvelle : `JumpTest.tsx` et `SprintTest.tsx` lisent déjà `athleteId`/`playerId` depuis l'URL et auto-remplissent body mass + hauteur. Il suffit donc de **propager le paramètre**.

## Modifications

**`src/pages/NewTest.tsx`**
- Lire `playerId` (et `athleteId` en fallback) via `useSearchParams`.
- Ajouter le query param aux deux `<Link>` :
  - `/app/tests/new/jump?athleteId=<id>`
  - `/app/tests/new/sprint?athleteId=<id>`
- Si pas d'athlète dans l'URL, garder les liens actuels.

Aucun autre fichier à modifier — l'auto-remplissage côté JumpTest/SprintTest existe déjà.
