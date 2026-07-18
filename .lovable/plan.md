## Onboarding — Carrousel plein écran (1er accès Dashboard)

### Objectif
Guider l'utilisateur à sa toute première ouverture du Dashboard via un carrousel plein écran de 5 slides, entièrement traduit (FR/EN/AR), stylisé au thème de l'app, avec possibilité de skipper et de relancer depuis Réglages.

### Déclenchement
- Clé persistante `slfv:onboarding:done` dans `localStorage`.
- Au montage de `src/pages/Dashboard.tsx`: si la clé est absente → afficher l'overlay onboarding.
- Marquée `true` à la fin (bouton "Commencer") **ou** au skip.
- Bouton "Revoir l'onboarding" ajouté dans le dialogue Réglages (`AppLayout.tsx`) qui remet la clé à `false` et re-navigue vers `/app`.

### Structure des 5 slides

1. **Bienvenue** — logo FV, titre "Pocket Lab", pitch court (profil Force-Vitesse local & privé).
2. **Langue & thème** — sélecteurs inline (FR/EN/AR, clair/sombre, 8 pastilles d'accent) réutilisant exactement les composants du dialogue Réglages. Modifications appliquées en temps réel.
3. **Équipe & athlète** — explique la structure Équipes → Athlètes. CTA secondaire "Aller aux équipes" (navigue vers `/app/teams` et ferme l'onboarding).
4. **Premier test** — présente Saut vertical vs Sprint linéaire (2 cartes côte à côte avec icônes). CTA "Nouveau test" → `/app/tests/new`.
5. **Sync & exports** — mentionne sauvegarde cloud (Drive/iCloud/.slfv) et export Word/PDF des rapports. Bouton final "Commencer".

### UX
- Overlay plein écran `fixed inset-0 z-50` avec fond `bg-background/95 backdrop-blur-xl`.
- Slide centrée dans une carte `glass-card` responsive (max-w-lg), gradient primary discret.
- Header: logo + bouton "Passer" (skip) en haut à droite.
- Footer: pastilles de progression (5 dots), boutons "Précédent" / "Suivant" (ou "Commencer" sur la dernière).
- Navigation clavier: ← → Échap.
- Animations douces (fade + translate) entre slides via classes Tailwind.
- Respecte les tokens sémantiques (aucune couleur hardcodée), style aligné avec les cartes de la page Teams et les onglets récemment redesignés.

### i18n
Ajouter dans `src/lib/settings.tsx` un bloc de clés `onboarding*` (welcome, welcomeSub, step2Title, step2Sub, step3Title, step3Sub, step4Title, step4Sub, step5Title, step5Sub, skip, next, prev, start, replayOnboarding, goToTeams, newTestCta, jumpShort, sprintShort, etc.) pour les 3 langues.

### Fichiers touchés

**Créés**
- `src/components/onboarding/OnboardingCarousel.tsx` — composant overlay + logique carrousel + 5 slides internes.
- `src/lib/onboarding.ts` — helpers `isOnboardingDone()`, `markOnboardingDone()`, `resetOnboarding()` autour de `localStorage`.

**Modifiés**
- `src/pages/Dashboard.tsx` — monte `<OnboardingCarousel />` conditionnellement au premier accès.
- `src/components/AppLayout.tsx` — ajoute une entrée "Revoir l'onboarding" dans le dialogue Réglages (section langue/thème ou nouvelle section compacte), qui appelle `resetOnboarding()` puis recharge Dashboard.
- `src/lib/settings.tsx` — nouvelles clés i18n FR/EN/AR.

### Hors périmètre
- Pas de tour de tooltips pointant les vrais éléments (l'utilisateur a choisi le carrousel).
- Pas de checklist persistante sur Dashboard.
- Pas de modification du flux Auth (l'onboarding se joue **après** création du profil, à l'arrivée sur Dashboard).
- Pas de changement de logique métier (F-V, calculs, export) — uniquement présentation.
