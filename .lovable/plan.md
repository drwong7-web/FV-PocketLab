## Objectif

Ajouter dans **Paramètres** une option permettant à l'utilisateur de choisir un dossier de l'appareil où seront enregistrés les rapports PDF et Word. Par défaut → dossier **Téléchargements** du navigateur/OS (comportement actuel).

## Comportement

1. Nouveau bloc dans le dialog Paramètres (`AppLayout.tsx`) : « Dossier d'export des rapports ».
   - Affiche le dossier choisi (ou « Téléchargements par défaut »).
   - Bouton **Choisir un dossier** → ouvre le sélecteur natif.
   - Bouton **Réinitialiser** → revient au comportement par défaut.
2. À l'export d'un rapport (PDF ou DOCX) depuis `TestResults.tsx`, l'app :
   - Si un dossier a été choisi et est encore accessible → écrit le fichier directement dedans (toast « Enregistré dans <dossier> »).
   - Sinon → fallback actuel : `downloadBlob` (téléchargement classique).

## Stratégie technique multi-plateforme

Détection automatique dans un nouvel utilitaire `src/lib/exportTarget.ts` :

| Plateforme | API utilisée |
|---|---|
| Chrome/Edge desktop, Android Chrome | **File System Access API** (`window.showDirectoryPicker`, handle persisté en IndexedDB) |
| App Capacitor (si packagée) | Détection via `(window as any).Capacitor` + import dynamique de `@capacitor/filesystem`. Si absent → fallback. |
| iOS Safari, Firefox, contextes sans support | Pas de sélecteur → option grisée avec note « Non supporté sur ce navigateur, utilise Téléchargements ». Téléchargement classique. |

Le handle File System Access est sérialisable en IndexedDB ; au démarrage on revérifie `queryPermission`/`requestPermission` avant d'écrire.

## Fichiers touchés

- **Nouveau** `src/lib/exportTarget.ts` : `pickExportDirectory()`, `clearExportDirectory()`, `getExportDirectoryLabel()`, `saveBlobToTarget(blob, filename)` avec fallback `downloadBlob`. Persistance handle dans IndexedDB (`fv-exports` DB, nouveau store `handles`).
- **`src/lib/settings.tsx`** : ajout des clés de traduction `exportFolder`, `chooseFolder`, `resetFolder`, `defaultDownloads`, `folderNotSupported`, `savedTo` (FR/EN/AR).
- **`src/components/AppLayout.tsx`** : nouvelle section dans le dialog Paramètres avec label, valeur courante et boutons.
- **`src/pages/TestResults.tsx`** : remplacer `downloadBlob(blob, filename)` par `await saveBlobToTarget(blob, filename)` (qui fait le fallback automatiquement) + toast.

Aucun changement de logique métier ; uniquement présentation et persistance d'un choix utilisateur.

## Hors scope

- Packaging Capacitor (le code détecte sa présence mais n'installe pas le plugin). Si l'utilisateur veut l'app native plus tard, il suffira d'ajouter `@capacitor/filesystem`.
- Synchronisation cloud des rapports.