## Plan : cartes visuelles pour les rubriques des paramètres

### Objectif
Transformer la page (dialogue) des paramètres pour que chaque rubrique — **Langue**, **Thème**, **Synchronisation** — soit regroupée dans sa propre carte visuelle, séparée des autres rubriques.

### État actuel
Dans `src/components/AppLayout.tsx`, les trois `<section>` du dialogue des paramètres sont empilées verticalement sans contour : `space-y-6 py-2`. Les titres de rubrique sont déjà traduits via `t(...)`.

### Changements prévus
1. **Dans `src/components/AppLayout.tsx`**
   - Remplacer le conteneur global `space-y-6 py-2` par une grille verticale de cartes (`space-y-4` ou `grid gap-4`).
   - Envelopper chaque `<section>` (Langue, Thème, Synchronisation) dans une carte utilisant les tokens du design system :
     - `bg-card`
     - `border border-border`
     - `rounded-2xl`
     - `shadow-card` (ou `glass-card` si la classe existe et est cohérente)
     - `p-4` ou `p-5`
   - Conserver le titre de rubrique en haut de chaque carte (`<h3 className="uppercase">{t(...)}</h3>`).
   - Garder le contenu interne de chaque rubrique inchangé (sélecteurs de langue, boutons thème/clair-sombre, nuancier de couleur, slider de teinte, section synchronisation).
   - S'assurer que les espacements internes (`space-y-3`, `space-y-4`) restent cohérents à l'intérieur de chaque carte.

2. **Ajustements de style mineurs**
   - Réduire légèrement l'espacement entre les cartes pour garder un rendu compact dans le dialogue.
   - Vérifier que les titres de rubrique restent alignés et lisibles (pas de changement de taille prévu).

### Fichiers modifiés
- `src/components/AppLayout.tsx` : structuration des rubriques en cartes.

### Non inclus dans ce plan
- Aucun changement de wording/traduction.
- Aucun changement de comportement (synchronisation, sélection de langue, etc.).
- Aucun ajout de nouvelle fonctionnalité.

### Validation
- Vérifier visuellement le rendu dans l'aperçu (dialogue des paramètres).
- S'assurer que `bunx tsc --noEmit` passe sans erreur.