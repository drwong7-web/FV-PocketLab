
## Objectif
Aligner toute la partie « résultats du profil F-V » sur la littérature scientifique de référence (Samozino 2008/2012/2014, Morin & Samozino 2016, Jiménez-Reyes 2017), pour les tests **saut vertical** et **sprint linéaire**. Trois axes : formules, graphique, structure de l'affichage.

## Références scientifiques utilisées
- Samozino P. et al. (2008) — *J. Biomechanics* : méthode simple de calcul F-V en saut chargé.
- Samozino P. et al. (2012, 2014) — *J. Theor. Biol. / Int. J. Sports Med.* : profil F-V optimal théorique pour la performance au saut (Sfv,opt et FVimb).
- Morin J-B. & Samozino P. (2016) — *IJSPP* : profil F-V mécanique horizontal en sprint à partir de splits.
- Jiménez-Reyes P. et al. (2017, 2019) — *Frontiers in Physiology / Sports* : valeurs de référence F0/V0/Pmax par sport et entraînement individualisé.
- Morin et al. (2019) — *Sports Med.* : interprétation de RFmax / DRF et limites du modèle.

## 1. Vérification et correction des formules

### Saut vertical (`calculateJumpProfile`)
- **Force par répétition** : conserver F = (m+ml)·g·(h/hPO + 1)/m exprimée en N/kg ; vérifier que la masse ajoutée `load` est bien intégrée pour l'expression *par kg de masse totale soulevée* (actuellement `force = G * (h/hPO + 1)` ignore le ratio (m+ml)/m). À corriger pour suivre Samozino 2008.
- **Vitesse** : v = √(g·h/2) (OK).
- **Régression linéaire F = F0 − Sfv·V** : F0, V0, Sfv, Pmax = F0·V0/4 (OK).
- **Sfv optimal** : recoder selon Samozino 2012 — Sfv,opt = −(g·√(g/(2·hPO)) + g·hPO·a)/Pmax/m  forme analytique (au lieu du balayage numérique actuel non documenté), avec hPO en argument (qui est aujourd'hui ignoré via `void hPO`).
- **FVimb** : 100·|Sfv/Sfv,opt − 1| (formule normalisée Samozino 2014, plus stable que la version signée actuelle ; on garde le signe pour orienter le déficit).
- **hMax théorique** : recalculer via h = (V0/2)²·(1 − g/F0)/(2g) (Samozino), au lieu de la valeur extraite d'un point unique.
- **R²** : vérifier qu'on rapporte celui de la régression F-V (pas une autre).

### Sprint linéaire (`calculateSprintProfile`)
- Modèle exponentiel position-temps de Samozino 2016 : v(t) = Vmax·(1 − e^(−t/τ)), F_h = m·a + F_aero (OK dans la structure).
- Expliciter ρ_air = 1.293·(P/760)·(273/T) ; aire frontale Af = (0.2025·h^0.725·m^0.425)·0.266 (OK, Atkinson). Documenter Cd = 0.9 (Arsac & Locatelli) et permettre vent.
- Régression F_h = F0 − Sfv·V → F0, V0=Vmax théorique, Pmax = F0·V0/4 ; **renommer V0 = Vmax théorique** (différent de Vmax mesurée).
- RF(t) = F_h/F_total · 100, **prendre RFmax = max sur t > 0.3 s** (Morin) plutôt que l'intercept brut, qui peut diverger.
- DRF = pente de la régression linéaire RF vs V (OK), borner aux phases d'accélération réelles.
- Ajouter Pmax_h_rel et fournir τ et r² du modèle.

### Optimal sport-spécifique (Jiménez-Reyes)
Ajouter un petit module `src/lib/sportTargets.ts` : table de valeurs cibles (médiane + plage) F0, V0, Pmax par sport pour saut et sprint, issues de Jiménez-Reyes 2017/2019 et Cross 2017. Affichées en référence à côté de l'optimal théorique.

## 2. Refonte du graphique F-V (`FVChart.tsx`)
Représentation conforme aux figures publiées :
- Axes : abscisse vitesse (m/s), ordonnée force relative (N/kg). Bornes auto avec marge.
- **Droite mesurée** F = F0 − Sfv·V tracée du point (0, F0) au point (V0, 0), couleur primaire, épaisse.
- **Points expérimentaux** annotés avec leur charge (saut) ou leur split (sprint).
- **Droite optimale théorique** (Sfv,opt) en rouge pointillé, avec marqueurs F0,opt et V0,opt.
- **Cible sport-spécifique** (Jiménez-Reyes) : zone rectangulaire/ellipse semi-transparente autour du couple (F0, V0) cible du sport.
- **Hyperbole iso-puissance** P = F·V·m à la valeur Pmax mesurée, en trait fin gris pour visualiser la frontière de puissance.
- Annotations directes des valeurs F0, V0, Pmax sur la figure.
- Légende compacte (4 entrées : mesuré, optimal, cible sport, iso-Pmax).
- Conserver le rendu SVG existant pour fiabilité de capture PDF/DOCX.

## 3. Restructuration de l'affichage des résultats (`TestResults.tsx`)
Nouvel ordre des cartes, identique en saut et sprint pour cohérence :

1. **En-tête athlète** (existant).
2. **Indicateurs clés** (3–4 metric cards) :
   - Saut : F0 (N/kg), V0 (m/s), Pmax (W/kg), hMax (cm).
   - Sprint : F0 (N/kg), V0/Vmax (m/s), Pmax (W/kg), RFmax (%).
3. **Profil F-V** (carte interprétation) :
   - Barre Force ⇄ Vitesse (existante) avec FVimb signé.
   - Étiquette : « Déficit force / équilibré / déficit vitesse ».
   - Comparaison à la cible sport (Jiménez-Reyes) en sous-ligne.
4. **Représentation graphique F-V** : nouveau `FVChart` enrichi + légende + caption « R² = …, τ = … ».
5. **Qualité du modèle** : R² régression F-V, RMSE des splits (sprint), nombre de points utilisés, alerte si R² < 0.95.
6. **Détails techniques** (collapsible) : conditions de test, splits/essais, formules clés et références bibliographiques courtes.
7. **Recommandations d'entraînement** (existant) ajustées au type de déficit + intensité dérivée du % de déséquilibre (Jiménez-Reyes : programme orienté force / vitesse / mixte).

Tout passe par les tokens sémantiques (`text-force`, `text-velocity`, `text-primary`, `destructive`) déjà présents dans `index.css`.

## Détails techniques
- `src/lib/fvCalculations.ts` : refonte des fonctions `computeOptimalSlope`, `calculateJumpProfile.hMax`, `calculateSprintProfile.RFmax` ; ajout des champs `F0_target`, `V0_target`, `Pmax_target`, `rmse`, `hMaxTheoretical` aux interfaces de résultats.
- `src/lib/sportTargets.ts` (nouveau) : table sport → { jump: {F0, V0, Pmax}, sprint: {F0, V0, Pmax} } avec sources.
- `src/components/FVChart.tsx` : ajout des séries optimal, cible sport, iso-Pmax, annotations.
- `src/pages/TestResults.tsx` : nouvelle structure des sections + carte « Qualité du modèle » + carte « Méthode et références » repliable.
- `src/lib/docxExport.ts` et bloc PDF dans `TestResults.tsx` : intégrer les nouvelles métriques et la nouvelle légende dans l'export.
- Migration douce : aucun changement de schéma de stockage, les anciens tests restent lisibles (champs cibles calculés à la volée si manquants).

## Résultat attendu
- Calculs alignés sur les publications de référence avec formules documentées.
- Graphique F-V lisible montrant simultanément profil mesuré, profil optimal théorique (rouge) et cible du sport.
- Page de résultats restructurée en sections claires et hiérarchisées, identiques entre saut et sprint, avec contexte scientifique et qualité du modèle visibles.
- Export PDF/DOCX reflétant cette nouvelle structure.
