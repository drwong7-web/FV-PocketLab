## Objectif

Améliorer la lisibilité et l'intégration visuelle du sélecteur de sport dans `src/pages/Teams.tsx` (dialog "Créer une équipe").

## Changements

### 1. Titres de groupes plus marqués (dans `Teams.tsx`)
Appliquer une classe personnalisée au `SelectLabel` pour chaque groupe :
- Couleur : `text-primary` (vert lime du thème)
- Poids : `font-bold`
- Taille : `text-xs`
- Majuscules + tracking : `uppercase tracking-wider`
- Préfixe visuel : `▸ ` (chevron) directement dans le texte affiché avant `t(GROUP_LABEL_KEYS[...])`
- Séparation : ajouter `mt-1 border-t border-border/50 pt-2` (sauf premier)

Les items de sport gardent leur style normal, donc contraste clair titre/item.

### 2. Sélecteur au couleur du thème (dans `Teams.tsx`)
Sur `<SelectTrigger>` et `<SelectContent>` : passer des classes pour utiliser les tokens sémantiques du thème :
- Trigger : `bg-secondary/50 border-border text-foreground focus:ring-primary focus:border-primary`
- Content : `bg-popover border-border` (déjà par défaut, mais on force au cas où le portail perd le thème dark)
- Items : `focus:bg-primary/15 focus:text-primary-foreground` pour cohérence avec l'accent lime

Aucun changement dans `src/components/ui/select.tsx` (composant shadcn partagé — on ajoute juste via `className`).

### 3. Correction runtime error
`Cannot read properties of null (reading 'useMemo')` : vérifier rapidement `Teams.tsx` — probablement un hook appelé après le early-return `if (!user) return ...`. Déplacer les hooks avant le return, ou l'origine peut être dans un autre fichier. Investigation pendant l'implémentation, correction silencieuse si liée à la page en cours.

## Détails techniques

- Fichier modifié : `src/pages/Teams.tsx` uniquement (plus éventuel fix hook order).
- Aucune modification de tokens CSS ni de `select.tsx` (partagé).
- Aucun impact sur la logique métier / storage / F-V.

## Aperçu du rendu (dropdown)

```
▸ SPORTS COLLECTIFS         ← primary, bold, uppercase
    Football
    Rugby
    Basketball
    ...
▸ ATHLÉTISME
    Sprint (100/200 m)
    400 m
    ...
▸ AUTRES SPORTS
    ...
▸ AUTRE
    Autre
```
