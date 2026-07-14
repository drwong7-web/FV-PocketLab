
## Objectif
Remplacer entièrement la méthode de calcul du profil force-vitesse du saut vertical dans `src/lib/fvCalculations.ts` par la méthode Samozino telle que décrite dans le document joint, en conservant la même API publique (`calculateJumpProfile`, `JumpResults`) pour ne rien casser dans le reste de l'app.

## Formules à implémenter (par saut)

Pour chaque essai i avec masse corporelle M, charge externe Lᵢ, hauteur hᵢ, distance de poussée hPO, g = 9.81 :

- masse système : `mᵢ = M + Lᵢ`
- force moyenne absolue : `F̄ᵢ = mᵢ · g · (1 + hᵢ / hPO)` (N)
- vitesse moyenne : `v̄ᵢ = √(g · hᵢ / 2)` (m/s)
- puissance moyenne : `P̄ᵢ = F̄ᵢ · v̄ᵢ` (W)
- **normalisation par la masse corporelle M** (et non par mᵢ) :
  - `F̄_rel,ᵢ = F̄ᵢ / M` (N/kg)
  - `P̄_rel,ᵢ = P̄ᵢ / M` (W/kg)

Différence clé avec le code actuel : le code actuel divise par `bodyMass` en faisant un ratio `totalMass/bodyMass` appliqué à `g·(h/hPO+1)`, ce qui est équivalent mathématiquement pour la force mais mérite d'être réécrit tel quel pour rester fidèle et lisible.

## Régression et paramètres du profil

- Régression linéaire moindres carrés sur les points `(v̄ᵢ, F̄_rel,ᵢ)` :
  - `F_rel = a + b · v` → `F0_rel = a`, `SFV = b`
- `V0 = −F0_rel / SFV`
- `Pmax_rel = F0_rel · V0 / 4` (W/kg), `Pmax_abs = Pmax_rel · M` (W)
- `F0_abs = F0_rel · M` (N)
- `R² = 1 − SSres / SStot`

## Pente optimale (forme algébrique compacte du doc, section 14)

Avec `p = Pmax_rel`, `d = hPO` :
```
Δ = (p·d/4)² + (g·d/6)³
u = ∛((p·d/4) + √Δ) + ∛((p·d/4) − √Δ)   // Math.cbrt pour racine cubique
V0_opt = 2u
F0_opt_rel = 2p / u
SFV_opt = −p / u²
h_opt = 2u² / g
```
Remplace la recherche numérique actuelle par cette formule fermée. Test de validation intégré (assertion en dev) : pour Pmax_rel = 25 W/kg et hPO = 0.40 m, on doit obtenir SFV_opt ≈ −14.02, V0_opt ≈ 2.67, F0_opt ≈ 37.45, h_opt ≈ 0.363.

## Déséquilibre F-V

- signé : `FVimb_signed = 100 · (SFV / SFV_opt − 1)` → négatif = déficit de force, positif = déficit de vitesse
- Ce champ remplit le `FVimbalance` existant (déjà signé dans le type actuel), donc **aucun renommage** côté consommateurs.

## Classification (seuils du doc section 16)

Basée sur `profilePercent = 100 · SFV / SFV_opt` :
- < 60 % : `force_deficit` (haut)
- 60–90 % : `force_deficit`
- 90–110 % : `balanced` (ou `well_balanced` si 95–105)
- 110–140 % : `velocity_deficit`
- > 140 % : `velocity_deficit` (haut)

Pour rester compatible avec le type existant (`"force_deficit" | "velocity_deficit" | "balanced" | "well_balanced"`), on mappe : <60/>140 → même valeur que 60–90/110–140, on garde `well_balanced` pour 95–105 %.

## Hauteur théorique atteinte (profil actuel)

Conserver la formule Samozino déjà en place :
`hMax = ((V0/2)² · (1 − g/F0_rel)) / (2g)` si `F0_rel > g`, sinon 0.

## Fichiers modifiés

- `src/lib/fvCalculations.ts` : réécrire `calculateJumpProfile` + `computeOptimalSlope` (remplacer par `computeOptimalFVProfile` fermée). Conserver la signature de `JumpResults` (mêmes champs : F0, V0, Pmax, slopeFV, FVoptimal, FVimbalance, profile, r2, hMax, hMaxOptimal, pushOffDistance, points) pour éviter tout impact sur `TestResults.tsx`, `docxExport.ts`, `unifiedTests.ts`, `FVChart.tsx`.
- `SPEC.md` : mettre à jour la section pipeline saut vertical avec les nouvelles formules et la référence à la méthode compacte de la pente optimale. Bumper `Last updated`.

## Ce qui NE change pas

- L'API et les noms de champs de `JumpResults`.
- Le graphique F-V (tracé mesuré + tracé rouge du profil type sport) — pas de modification visuelle.
- La collecte des essais dans `JumpTest.tsx`.
- Le calcul sprint.

## Résultat attendu

Les valeurs F0, V0, Pmax restent très proches (les formules force/vitesse sont identiques à celles déjà en place). La pente optimale et le FVimbalance peuvent légèrement bouger car on passe d'une recherche numérique à la formule fermée validée du doc, plus rapide et exacte.
