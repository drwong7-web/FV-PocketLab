
## Objectif

Réduire le carrousel d'onboarding à 3 slides (au lieu de 5), et enchaîner avec un mini-tour interactif qui met en surbrillance les boutons clés :
1. Bouton **"Nouvelle équipe"** sur `/app/teams` (avec explication).
2. Après création de l'équipe → bouton **"Ajouter athlète"** et **"Importer"** (PDF / Word / image) sur `/app/teams/:id`.

## Changements

### 1. Carrousel — arrêt à l'étape 3
Fichier : `src/components/onboarding/OnboardingCarousel.tsx`
- `total = 3` au lieu de 5.
- Supprimer `SlideTests` (step 3) et `SlideBackup` (step 4) + imports `Timer`, `Upload`, `Zap`, `Activity`.
- Sur la dernière slide (step 2, "Équipes & athlètes"), le CTA principal devient **"Créer une équipe"** :
  - marque `onboarding:done`
  - active un flag transient `slfv:onboarding:tour = "team-create"` dans `localStorage`
  - navigue vers `/app/teams`
- Le bouton "Commencer" reste disponible pour finir sans tour.

### 2. Nouveau helper — état du tour guidé
Fichier créé : `src/lib/onboardingTour.ts`
- Clé `slfv:onboarding:tour` (valeurs : `"team-create" | "player-add" | null`).
- Helpers : `getTourStep()`, `setTourStep(step)`, `clearTour()`.
- Sur création d'équipe (dans `Teams.tsx`), si tour == `team-create` → passe à `player-add` et navigue vers la nouvelle équipe.
- Sur création/import d'athlète (dans `TeamDetail.tsx`), si tour == `player-add` → `clearTour()`.

### 3. Coach-mark — composant réutilisable
Fichier créé : `src/components/onboarding/CoachMark.tsx`
- Props : `targetRef`, `title`, `description`, `onDismiss`, `placement?`.
- Rendu : overlay `fixed inset-0` avec fond `bg-background/70 backdrop-blur-sm`, "trou" autour du bouton cible via un anneau lumineux `ring-4 ring-primary shadow-glow` appliqué en positionnant une div absolue calculée depuis `targetRef.getBoundingClientRect()`.
- Bulle glass-card à côté du bouton avec titre, description, bouton "OK" (dismiss).
- Anneau + bulle repositionnés sur `resize` / `scroll`.
- Fermeture : clic sur "OK", clic hors bulle, ou touche `Échap`.

### 4. Intégration `Teams.tsx`
- `useRef` sur le bouton "New" (DialogTrigger).
- Au montage : si `getTourStep() === "team-create"` → afficher `<CoachMark>` pointant vers le bouton, avec titre `onbTourTeamTitle` et texte `onbTourTeamDesc`.
- Dismiss = simplement cacher le coach-mark (le tour reste actif jusqu'à création réelle).
- Après `createTeam` : si tour actif, `setTourStep("player-add")` puis `navigate("/app/teams/"+id)`.

### 5. Intégration `TeamDetail.tsx`
- `useRef` sur les boutons "Ajouter joueur" et "Importer".
- Au montage : si `getTourStep() === "player-add"` → `<CoachMark>` pointant vers le groupe (ou séquentiellement : d'abord "Ajouter", puis "Importer").
- Simplification : un seul coach-mark qui encadre les deux boutons, avec titre `onbTourPlayerTitle` et description mentionnant les deux options (saisie manuelle OU import PDF/Word/image).
- Dismiss = `clearTour()`.

### 6. i18n — nouvelles clés
Fichier : `src/lib/settings.tsx`
- Retirer/marquer inutilisées : `onb4Title`, `onb4Sub`, `onb4Cta`, `onb5Title`, `onb5Sub` (peuvent rester pour rétro-compat mais non référencées).
- Ajouter :
  - `onbTourTeamTitle` — "Créer votre première équipe" / "Create your first team" / "أنشئ فريقك الأول"
  - `onbTourTeamDesc` — "Cliquez sur ce bouton pour ajouter une équipe et choisir son sport." / …
  - `onbTourPlayerTitle` — "Ajoutez vos athlètes" / …
  - `onbTourPlayerDesc` — "Saisissez un athlète manuellement, ou importez une liste depuis un PDF, Word ou une image." / …
  - `onbTourGotIt` — "OK" / "Got it" / "حسناً"

## Fichiers touchés

**Créés**
- `src/lib/onboardingTour.ts`
- `src/components/onboarding/CoachMark.tsx`

**Modifiés**
- `src/components/onboarding/OnboardingCarousel.tsx` (total=3, suppression slides 4-5, CTA final)
- `src/pages/Teams.tsx` (ref + coach-mark + progression du tour)
- `src/pages/TeamDetail.tsx` (refs + coach-mark + fin du tour)
- `src/lib/settings.tsx` (clés i18n FR/EN/AR)

## Hors périmètre
- Pas de modification du flux de test/backup (les slides sont juste retirées).
- Pas de refonte des dialogues existants "Créer équipe" / "Ajouter joueur" / "Importer".
- Pas de tour persistant si l'utilisateur skip : `clearTour()` est appelé à tout dismiss final.
