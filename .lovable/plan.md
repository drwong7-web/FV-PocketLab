## Objectif

Ajouter une carte "Essais" sur la page de résultat du saut vertical (elle est présente dans l'export Word/PDF mais absente à l'écran, contrairement à la carte "Splits" du sprint).

## Changement

Dans `src/pages/TestResults.tsx`, dans `JumpReport`, insérer une nouvelle `<Card>` intitulée `t("trials")` avant la carte du graphique F-V (juste après la carte "Profil FV Samozino").

Contenu du tableau, une ligne par essai (`results.points` + `raw_data.trials`) :

| # | Charge (kg) | Hauteur (cm) | Force (N/kg) | Vitesse (m/s) |
|---|-------------|--------------|--------------|---------------|

Source des valeurs :
- Charge : `results.points[i].load`
- Hauteur : `raw_data.trials[i].jumpHeight * 100`
- Force : `results.points[i].force`
- Vitesse : `results.points[i].velocity`

Style aligné sur la carte "Splits" existante (mêmes classes tableau/typographie/thead muted).

## Traductions

Réutiliser les clés déjà présentes : `trials`, `loadsKg` (ou `loadKg`), `jumpHeightCm`, `forceNkg`, `velocityMs`. Ajouter uniquement les clés manquantes dans `src/lib/settings.tsx` (FR/EN/AR) si l'audit du fichier montre qu'elles n'existent pas.

## Non concerné

- Sprint (déjà OK)
- Export Word/PDF (déjà OK)
- Aucune logique de calcul modifiée
