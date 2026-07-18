## Objectif

Pousser fortement l'utilisateur à installer la PWA dès le premier lancement, puis lui rappeler à chaque session tant qu'elle n'est pas installée. Aucun blocage dur (le web ne permet pas d'empêcher l'usage), mais une forte insistance visuelle.

## Comportement UX

### Premier lancement (app non installée)
Modal plein écran **avant l'onboarding**, avec :
- Logo FV + titre **"Installer Pocket Lab"**
- Sous-titre expliquant que l'installation garantit la sauvegarde des données et l'accès rapide
- Instructions **adaptées à la plateforme détectée** :
  - **iOS Safari** : illustration 3 étapes "Appuyer sur Partager → Faire défiler → Sur l'écran d'accueil"
  - **Android Chrome / Samsung Internet / Edge desktop / Chrome desktop** : gros bouton **"Installer maintenant"** qui déclenche `beforeinstallprompt.prompt()`
  - **Firefox / autre** : message "Ouvre cette page dans Chrome, Edge ou Safari pour installer"
- Un seul lien discret en bas : **"Plus tard"** (ferme le modal, mais le rappel reviendra)

### Sessions suivantes (toujours pas installée)
Bandeau persistant fin en haut de chaque page :
- Icône + texte court "Installe Pocket Lab pour ne rien perdre"
- Bouton "Installer" (ouvre le même modal)
- Croix pour masquer **uniquement pour la session en cours** (`sessionStorage`) — réapparaît au prochain lancement

### Après installation (mode standalone)
- Modal et bandeau ne s'affichent jamais
- Événement `appinstalled` → toast de confirmation

## Fichiers touchés

- **Nouveau** `src/lib/pwa/install.ts` — détection standalone / plateforme, capture `beforeinstallprompt`, helper `promptInstall()`, appel `navigator.storage.persist()` au boot
- **Nouveau** `src/components/pwa/InstallModal.tsx` — modal premier lancement avec instructions par plateforme
- **Nouveau** `src/components/pwa/InstallBanner.tsx` — bandeau persistant sessions suivantes
- **Modifié** `src/App.tsx` — monte `<InstallModal>` et `<InstallBanner>` au niveau racine
- **Modifié** `src/main.tsx` — capture `beforeinstallprompt` très tôt + appel `requestPersistentStorage()`
- **Modifié** `src/lib/settings.tsx` — clés i18n FR/EN (`install.title`, `install.subtitleIos`, `install.subtitleAndroid`, `install.iosStep1/2/3`, `install.androidCta`, `install.firefoxHint`, `install.later`, `install.banner`, `install.bannerCta`, `install.installedToast`)
- **Modifié** `SPEC.md` — documenter le flow d'insistance à l'installation

## Détails techniques

- Guards identiques à `src/pwa/register.ts` : rien ne s'affiche dans la preview Lovable / iframe / dev
- Détection standalone : `window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true`
- Flag "premier lancement" : clé `slfv:install-modal-seen` dans localStorage (survit à une purge partielle IndexedDB)
- Flag "masqué cette session" : `sessionStorage` (jamais persisté)
- `beforeinstallprompt` doit être listené **avant** le render React → mis dans `main.tsx`
- Sur iOS, aucune API JS ne peut déclencher l'installation : uniquement les instructions visuelles
- `navigator.storage.persist()` appelé une fois au boot (silencieusement, sans UI) pour renforcer la persistance même avant installation

## Limites à connaître

- iOS Safari : l'utilisateur doit toujours faire le geste manuel (Partager → Sur l'écran d'accueil), aucune automatisation possible
- Firefox desktop : pas d'installation PWA native, on affiche juste un conseil
- Le modal et le bandeau restent techniquement fermables — c'est une insistance visuelle, pas un blocage dur