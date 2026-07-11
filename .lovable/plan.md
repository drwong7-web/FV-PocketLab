## Uniformiser les cartes de la page "Nouveau test"

**Contexte:** Les cartes "Vertical Jump" et "Linear Sprint" sur `/app/tests/new` utilisent `glass-card` mais sans le fond dégradé ni le style visuel du reste de l'app (Dashboard, TestList). Elles paraissent plates comparées aux cartes du Dashboard.

**Cartes de référence (Dashboard):**
```
glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent
hover:border-primary/40 transition-colors
```

### Changements dans `src/pages/NewTest.tsx`

Aligner les 2 cartes `<Link>` "Vertical Jump" et "Linear Sprint" sur le même langage visuel que les cartes du Dashboard:

1. Ajouter `bg-gradient-to-br from-primary/10 to-transparent` pour retrouver le halo vert néon des autres cartes.
2. Conserver `hover:border-primary/40 transition-colors` (déjà présent).
3. Ajouter `engraved-surface` pour que le relief matche les MetricCard et le reste du "cockpit" sombre.
4. Garder la structure interne (logo à gauche, titre centré) — pas de changement de contenu.
5. Titres: garder `font-display uppercase`, mais ajouter la classe `engraved` pour le rendu gravé cohérent avec les MetricCard.

Rien d'autre ne change: pas de modif logo, pas de modif texte, pas de nouveaux tokens CSS, pas de SPEC.md (pur styling).
