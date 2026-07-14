## Plan

**Problème** : depuis l'ajout des profils cibles par sport, le graphique F-V du rapport saut vertical s'est encombré (zone cible rectangulaire + hyperbole iso-Pmax + double droite rouge/verte).

**Objectif** : restaurer exactement la représentation précédente (une droite bleue mesurée + une droite rouge pointillée en optimal), mais la droite rouge s'appuie désormais sur le profil type du sport choisi au lieu de l'optimal Samozino de l'athlète.

### Modification unique — `src/pages/TestResults.tsx` › `JumpReport` (lignes ~652-708)

Dans l'appel `<FVChart>` :
- `optimalF0` ← `target?.F0` (sport)
- `optimalV0` ← `target?.V0` (sport)
- Retirer les props `targetF0`, `targetV0`, `targetF0Range`, `targetV0Range`, `targetLabel` → plus de rectangle cible.
- Retirer la prop `Pmax` → plus d'hyperbole iso-Pmax.
- Supprimer les variables locales `optimalV0` / `optimalF0` calculées via `results.FVoptimal` (devenues inutiles).

Le résumé textuel `TargetSummary` (F0/V0/Pmax cible du sport) sous le profil Samozino reste tel quel.

### Hors périmètre

- `src/components/FVChart.tsx` : inchangé (encore utilisé par le rapport sprint avec ses props actuelles).
- `SprintReport` : inchangé, la demande porte uniquement sur le saut vertical.
- Calculs F0/V0/Pmax, `sportTargets`, moteurs : inchangés.
- SPEC.md : pas de mise à jour (changement purement visuel d'une page).
