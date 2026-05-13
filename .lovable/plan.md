## Objectif

Remplacer le stockage actuel (localStorage) par un **répertoire local choisi par l'utilisateur** sur son système de fichiers, avec une arborescence claire par volet.

## Contrainte technique importante

Une application web ne peut accéder au disque de l'utilisateur que via la **File System Access API** (`window.showDirectoryPicker`). Conséquences :

- Fonctionne sur **Chrome, Edge, Opera, Brave** (desktop). **Non supporté** sur Firefox et Safari, ni sur iOS.
- L'utilisateur doit **choisir le dossier à chaque session** (le navigateur peut mémoriser la permission via IndexedDB, mais redemande une confirmation au prochain lancement).
- Inutilisable hors navigateur compatible → il faut un **fallback localStorage** pour ne pas casser l'app sur les autres navigateurs.

Si vous voulez un vrai accès disque permanent et multi-plateforme, la bonne voie est **packager l'app en Electron** (le navigateur seul ne le permet pas proprement). À confirmer.

## Arborescence proposée dans le dossier choisi

```text
SprintLab-Data/
├── auth/
│   ├── users.json              (comptes, hash mot de passe)
│   └── session.json            (session courante)
├── organizations/
│   └── orgs.json
├── teams/
│   └── teams.json
├── athletes/
│   └── players.json
├── tests/
│   ├── index.json              (liste/métadonnées)
│   └── <testId>.json           (un fichier par test, raw_data inclus)
├── exports/
│   ├── pdf/
│   └── docx/
└── settings/
    └── calibration.json
```

Un fichier `manifest.json` à la racine indique la version du schéma pour migrations futures.

## Travail à faire

### 1. Couche d'accès fichier
- Nouveau module `src/lib/fsStorage.ts` :
  - `pickRootDirectory()` → `showDirectoryPicker()` + persistance du handle dans IndexedDB.
  - `getRootDirectory()` → récupère le handle, vérifie la permission, redemande si besoin.
  - Helpers `readJson(path)`, `writeJson(path, data)`, `ensureDir(path)`, `writeBinary(path, blob)`, `listDir(path)`.
- Détection de support : `'showDirectoryPicker' in window`.

### 2. Refactor du repository
- Transformer `src/lib/storage.ts` en façade **asynchrone** (toutes les fonctions retournent des `Promise`).
- Deux back-ends derrière la même API :
  - `fsBackend` (File System Access API) — par défaut si dispo et dossier choisi.
  - `localStorageBackend` (existant) — fallback automatique.
- Migration one-shot : si on détecte des données dans `localStorage` au premier choix de dossier, proposer de les copier vers le dossier.

### 3. Adaptation de `src/lib/auth.tsx` et de `src/lib/localHistory.ts`
- Passer aux appels asynchrones.
- Les écrans qui consomment ces fonctions (`Dashboard`, `Teams`, `TeamDetail`, `PlayerDetail`, `TestList`, `TestResults`, `JumpTest`, `SprintTest`, `NewTest`, `Auth`) seront ajustés (ajout d'`await`, états de chargement).

### 4. Exports PDF / DOCX
- `pdfReport.ts` et `docxExport.ts` : au lieu de déclencher un download navigateur, écrire directement dans `exports/pdf/` ou `exports/docx/` du dossier choisi. Garder un bouton "Télécharger" en secours.

### 5. UI
- Bandeau dans `AppLayout` : "Dossier de données : <chemin> · Changer · Déconnecter le dossier".
- Au premier lancement (ou si aucun dossier mémorisé) : écran/modal "Choisir un dossier de stockage" avant l'écran d'authentification, avec explication et bouton de fallback "Utiliser le stockage du navigateur".
- Message clair sur Firefox/Safari : "Votre navigateur ne supporte pas le stockage sur disque, les données resteront dans ce navigateur."

### 6. Sécurité
- Les "mots de passe" sont déjà un hash trivial côté client (prototype). On garde le même schéma — préciser dans la doc que ce n'est pas un vrai système d'auth, juste une protection locale.

## Questions avant de coder

1. **Cible principale** : on reste sur une web app (avec la limite Chrome/Edge uniquement) ou on bascule vers **Electron** pour un vrai accès disque universel ?
2. **Multi-utilisateurs** : un seul dossier partagé pour tous les comptes locaux, ou un sous-dossier par utilisateur après login ?
3. **Migration** : copier automatiquement les données existantes du `localStorage` vers le dossier choisi, ou repartir de zéro ?
