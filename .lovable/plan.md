## Objectif
Retirer la section « Dossier d'export » des Paramètres et déplacer le choix du dossier vers une popup qui s'affiche au moment d'exporter un rapport (PDF/DOCX) depuis la page de résultats de test.

## Changements

### 1. `src/components/AppLayout.tsx`
- Supprimer entièrement la `<section>` « Dossier d'export des rapports » (bloc contenant `pickExportDirectory`, `clearExportDirectory`, `getExportDirectoryLabel`, l'avertissement iframe et le lien "Ouvrir dans un nouvel onglet").
- Retirer les imports/états devenus inutilisés : `clearExportDirectory`, `getExportDirectoryLabel`, `isDirectoryPickerSupported`, `isInIframe`, `pickExportDirectory`, `Folder`, `exportDir`, `handlePickFolder`, `handleResetFolder`, `pickerSupported`, `inIframe`.
- Conserver toutes les autres sections (Langue, Thème, Cloud backup) inchangées.

### 2. `src/pages/TestResults.tsx`
- Intercepter le clic sur les items d'export (PDF / DOCX) : au lieu d'appeler `doExport` directement, ouvrir un nouveau `Dialog` d'export.
- Le Dialog affiche :
  - Le dossier actuellement sélectionné (via `getExportDirectoryLabel()`) ou « Téléchargements par défaut ».
  - Bouton « Choisir un dossier » (appelle `pickExportDirectory`, met à jour l'état local, toast succès/erreur avec les mêmes messages que la version Paramètres).
  - Bouton « Réinitialiser » si un dossier est déjà choisi (appelle `clearExportDirectory`).
  - Message d'avertissement iframe + lien « Ouvrir dans un nouvel onglet » quand `pickerSupported && inIframe`.
  - Message `folderNotSupported` quand le picker n'est pas supporté.
  - Bouton principal « Exporter » qui lance `doExport(format)` puis ferme le dialog.
  - Bouton « Annuler ».
- Stocker le format cible (`"pdf" | "docx"`) dans l'état pour savoir quel export lancer à la confirmation.
- Réutiliser toutes les clés de traduction existantes (`exportFolder`, `chooseFolder`, `resetFolder`, `defaultDownloads`, `folderNotSupported`, `iframeBlocked`, `openInNewTab`, `export`, `exporting`, `savedTo`, `pickerCancelled`, `browserUnsupported`). Aucune nouvelle clé i18n nécessaire.

### 3. Aucune modification
- `src/lib/exportTarget.ts` reste tel quel (API réutilisée par la popup).
- `src/lib/settings.tsx` inchangé (dictionnaire déjà complet).
- Aucun changement de logique métier ni de calculs.

## Hors périmètre
Pas de changement visuel des autres cartes, pas de suppression de clés de traduction, pas de refonte du flux d'export au-delà de la popup.
