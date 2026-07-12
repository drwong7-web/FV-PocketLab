# Plan : unifier et rafraîchir le bouton logo FV en haut des pages

## Contexte
Le header actuel n'est pas identique sur toutes les pages :
- Sur `/auth` : icône générique `Activity` (lucide) + texte « F V Pocket Lab »
- Sur les pages `/app/*` (AppLayout) : image `fv-logo.png` + texte « PocketLab »

L'objectif est d'homogénéiser le bouton/logo FV en haut de toutes les pages.

## Changements prévus

### 1. AppLayout (`src/components/AppLayout.tsx`)
- Conserver le `Link to="/app"` et l'image `fvLogo.url`.
- Ajuster le style du bloc logo pour qu'il ressemble davantage à un bouton/identité cohérente :
  - container avec fond subtil (`bg-primary/10` ou `glass-card`) et bordure arrondie,
  - alignement et taille du texte harmonisés avec la page `/auth`.
- Supprimer/ajuster le sous-titre vide (`{"\n"}`) qui crée un espace bizarre.

### 2. Auth (`src/pages/Auth.tsx`)
- Remplacer l'icône `Activity` par l'image `fvLogo.png` (même asset que dans AppLayout).
- Harmoniser le titre avec AppLayout : utiliser « F V Pocket Lab » ou « PocketLab » de manière cohérente.
- Adapter les tailles et espacements pour matcher le header AppLayout.

### 3. Vérification
- Vérifier visuellement que le logo est identique et bien positionné sur `/auth` et sur `/app/*`.
- S'assurer que le lien vers `/app` fonctionne toujours dans AppLayout.

## Fichiers concernés
- `src/components/AppLayout.tsx`
- `src/pages/Auth.tsx`
- `src/assets/fv-logo.png.asset.json` (lecture seule, pas de modification)

## Non concerné
- Pas de changement de fonctionnalité (auth, routing, sync).
- Pas de modification du logo image lui-même (sauf si vous souhaitez uploader un nouveau logo).