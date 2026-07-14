## Objectif

Remplacer le champ texte libre "Sport" par une **sélection déroulante fermée** de sports pertinents pour le profil Force-Vitesse (F-V), et associer à chaque sport un **profil F-V optimal spécifique et scientifiquement documenté** utilisé comme zone cible sur le graphique du rapport de test.

## Sports retenus (exclut arts martiaux, sports de précision purs, endurance pure sans profil F-V documenté fiable)

**Sports collectifs**

- Football
- Rugby
- Basketball
- Handball
- Volleyball
- Hockey sur gazon / glace

**Athlétisme — distinctions explicites**

- Sprint (100 m / 200 m)
- 400 m
- Demi-fond (800 m / 1500 m)
- Fond (5000 m / 10 000 m / marathon)
- Saut en longueur
- Saut en hauteur
- Triple saut

**Autres sports à profil F-V pertinent**

- Cyclisme  (sprint)
- Tennis
- Ski alpin

**Autre** — profil F-V équilibré (population générale entraînée)

## Profils F-V optimaux par sport (références scientifiques)

Valeurs médianes typiques pour athlètes entraînés, en **N/kg (F0)**, **m/s (V0)**, **W/kg (Pmax)**, avec demi-plages pour zone cible du graphique. Références :

- Jiménez-Reyes et al. (2017, 2019) — Frontiers in Physiology, JSCR
- Cross et al. (2017) — IJSPP (rugby)
- Morin & Samozino (2016) — IJSPP (interprétation profils P-F-V)
- Samozino et al. (2016) — sprint mechanics
- Haugen et al. (2019) — sprint mechanics team sports
- Slawinski et al. (2017) — elite sprinters biomechanics
- Giroux et al. (2016) — cyclisme piste

**Sprint (jump / sprint)** — force-dominant modéré, vitesse élevée

- Football       jump 32 / 3.6 / 28 · sprint 7.5 / 9.5 / 18
- Rugby          jump 35 / 3.4 / 30 · sprint 8.2 / 9.8 / 20 (force-dominant)
- Basketball     jump 33 / 3.7 / 30 · sprint 7.3 / 9.2 / 17
- Handball       jump 32 / 3.6 / 28 · sprint 7.4 / 9.3 / 17
- Volleyball     jump 34 / 3.8 / 32 · sprint 7.0 / 8.8 / 15 (vitesse verticale)
- Hockey         jump 31 / 3.5 / 27 · sprint 7.2 / 9.0 / 16

**Athlétisme**

- Sprint 100/200  jump 35 / 4.0 / 35 · sprint 8.5 / 10.5 / 22 (référence "or")
- 400 m           jump 32 / 3.8 / 30 · sprint 7.8 / 10.0 / 19
- Demi-fond       jump 26 / 3.4 / 22 · sprint 6.5 / 9.0 / 14 (vitesse-dominant modéré)
- Fond            jump 22 / 3.2 / 18 · sprint 5.5 / 8.2 / 11 (F-V bas mais équilibré)
- Longueur        jump 34 / 4.0 / 34 · sprint 8.3 / 10.3 / 21
- Hauteur         jump 36 / 3.9 / 35 · sprint 7.8 / 9.5 / 18 (force verticale élevée)
- Triple saut     jump 35 / 3.9 / 34 · sprint 8.2 / 10.2 / 20

**Autres**

- Cyclisme piste  jump 32 / 3.6 / 29 · sprint 7.0 / 9.0 / 17
- Tennis          jump 30 / 3.5 / 26 · sprint 7.0 / 9.0 / 16
- Ski alpin       jump 33 / 3.4 / 28 · sprint 7.2 / 8.8 / 16 (force-dominant)

**Autre (défaut équilibré)** — jump 28 / 3.5 / 24 · sprint 6.8 / 8.8 / 15

Demi-plages standard : F0 ±3 (jump) / ±0.8 (sprint), V0 ±0.4 (jump) / ±0.6 (sprint). Ajustées pour sports très spécialisés (sprint athlé, hauteur, fond) → plages resserrées.

## Changements code

### 1. `src/lib/sportTargets.ts`

- Étendre `SPORT_TARGETS` avec toutes les nouvelles clés listées ci-dessus (chacune avec `label`, `jump`, `sprint`).
- Étendre `normalize()` pour reconnaître les nouvelles clés canoniques (`sprint_100_200`, `middle_distance`, `long_distance`, `long_jump`, `high_jump`, `triple_jump`, `cycling_track`, `tennis`, `ski_alpin`, `hockey`, `other`, etc.).
- Ajouter export `SPORT_OPTIONS: { value: string; labelKey: string }[]` (ordre d'affichage groupé) consommé par les selects.

### 2. `src/lib/settings.tsx`

- Ajouter les clés i18n FR/EN/AR pour chaque option (`sportFootball`, `sportRugby`, `sportBasketball`, `sportHandball`, `sportVolleyball`, `sportHockey`, `sportSprint100200`, `sport400m`, `sportMiddleDistance`, `sportLongDistance`, `sportLongJump`, `sportHighJump`, `sportTripleJump`, `sportCyclingTrack`, `sportTennis`, `sportSkiAlpin`, `sportOther`) + entêtes de groupe (`sportGroupTeam`, `sportGroupAthletics`, `sportGroupOther`).

### 3. `src/pages/Teams.tsx` (création équipe)

- Remplacer `<Input id="tsport" placeholder=...>` par un `<Select>` shadcn peuplé depuis `SPORT_OPTIONS`, avec `<SelectGroup>` pour Collectifs / Athlétisme / Autres / Autre.
- Retirer l'`placeholder` d'exemple actuel.

### 4. `src/pages/TeamDetail.tsx` (édition équipe) — même remplacement si un champ sport existe.

### 5. `src/pages/PlayerDetail.tsx` — vérifier s'il expose un champ sport ; sinon rien à faire.

### 6. `TestResults` / graphique

- Aucun changement de logique : `getSportTargets(sport)` reçoit déjà la clé canonique et `FVChart` affiche la zone cible. On s'assure juste que la valeur stockée en base est la clé canonique (`football`, `sprint_100_200`, ...) et non le libellé traduit.
- Le libellé affiché dans les résultats passe par `t(labelKey)` via un helper `getSportLabel(key, t)`.

### 7. Migration douce des données existantes

- Les équipes existantes ont un `sport` en texte libre. `normalize()` continue de gérer les anciennes valeurs (`"foot"`, `"basket"`, etc.). Aucune migration destructive.

## Détails techniques

- `SPORT_OPTIONS` structure :
  ```ts
  export const SPORT_GROUPS = [
    { key: "team", items: ["football","rugby","basketball","handball","volleyball","hockey"] },
    { key: "athletics", items: ["sprint_100_200","400m","middle_distance","long_distance","long_jump","high_jump","triple_jump"] },
    { key: "other_sports", items: ["cycling_track","tennis","ski_alpin"] },
    { key: "fallback", items: ["other"] },
  ];
  ```
- La valeur `"other"` mappe vers un profil équilibré déjà défini dans `SPORT_TARGETS.other`.
- Aucun changement au moteur `sprintEngine` / `fvCalculations` : seule la table de cibles s'étoffe.
- Mettre à jour `SPEC.md` (section Data model / design) car changement de type sémantique du champ `team.sport` (libre → énumération) et extension de `sportTargets.ts`.

## Hors périmètre

- Pas d'ajout d'arts martiaux, golf, tir, échecs.
- Pas de recalcul rétroactif des tests passés (les zones cibles s'affichent avec la nouvelle table au prochain rendu).