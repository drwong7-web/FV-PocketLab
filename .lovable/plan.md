## Modification des libellés d'essais — Saut vertical

**Objectif** : Ajouter un libellé à gauche de chaque ligne de charge indiquant le pourcentage du poids du corps, et spécifier " 00 kg" pour la première case.

### Changements

1. **Fichier** : `src/pages/JumpTest.tsx`
  - Ajouter une colonne de label en début de la grid des trials
  - Label ligne 1 :  `00 kg`
  - Label ligne 2 : `~ 20%`
  - Label ligne 3 : `~ 50%`
  - Label ligne 4 : `~ 70%`
  - Adapter le `grid-cols` de la ligne pour inclure cette nouvelle colonne

### Détail technique

- Les pourcentages correspondent aux ratios déjà calculés dans `defaultTrials()` : 0%, 20%, 50%, 70% du poids de l'athlète
- Le label sera affiché dans une `<span>` ou `<Label>` alignée à gauche de l'input `Load (kg)`
- Pas de changement de logique, uniquement présentation