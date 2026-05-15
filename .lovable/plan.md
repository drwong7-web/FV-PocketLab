## Objectif
Ajouter sous la valeur "R² = …" affichée sous chaque graphique F-V une courte phrase qui explique ce qu'est le R² et comment l'interpréter, pour aider l'utilisateur à lire le résultat.

## Emplacements concernés
Fichier : `src/pages/TestResults.tsx`
- **JumpReport** (ligne ~600) : sous le graphique saut vertical, après `R² = {results.r2.toFixed(3)}`.
- **SprintReport** (ligne ~654) : sous le graphique sprint, après `R² = {results.r2.toFixed(3)} · τ = …`.

## Contenu proposé
Sous le R², ajouter un petit paragraphe en deux parties :

1. **Définition** (toujours affichée) :
   « Le R² mesure la qualité de l'ajustement linéaire entre force et vitesse (1 = parfait). »

2. **Interprétation dynamique** selon la valeur :
   - R² ≥ 0,95 → « Excellent ajustement : F0, V0 et Pmax sont fiables. » (vert/success)
   - 0,85 ≤ R² < 0,95 → « Ajustement correct : interpréter avec une certaine prudence. » (warning)
   - R² < 0,85 → « Ajustement faible : vérifier la qualité des essais avant d'exploiter F0/V0/Pmax. » (warning/destructive)

Ces seuils sont alignés avec la recommandation Samozino & Morin (R² ≥ 0,95) déjà utilisée dans `ModelQualityCard`.

## Détails techniques
- Créer un petit composant local `R2Explanation({ r2 }: { r2: number })` réutilisé dans les deux rapports, pour éviter la duplication.
- Style : `text-xs text-muted-foreground text-center mt-1`, avec la phrase d'interprétation colorée (`text-success` / `text-warning` / `text-destructive`) selon le seuil.
- Aucune logique métier modifiée, uniquement de la présentation.

## Question ouverte
Souhaitez-vous :
- (a) ces seuils 0,95 / 0,85 (cohérents avec la littérature Samozino), ou
- (b) une seule phrase générique sans variation selon la valeur ?