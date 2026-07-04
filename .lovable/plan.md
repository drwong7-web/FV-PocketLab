
## 1. Screenshot → « Aucun athlète détecté »

Cause identifiée en relisant `src/lib/import/athletes.ts` et le screenshot fourni : `ocrWords()` demande à tesseract.js v5 les champs `data.words` / `data.lines`, mais dans cette version ils sont **vides par défaut**. Il faut activer explicitement la sortie mot-à-mot ; sinon `wordsToRows()` reçoit `[]` et l'import renvoie 0 athlète — exactement le symptôme.

### Correctifs `src/lib/import/athletes.ts`

1. **`ocrWords()`** : appeler `recognize(source, "fra+eng", { … })` avec `output: { blocks: true, text: true }` **et** parcourir `data.blocks → paragraphs → lines → words` pour construire `TWord[]`. Filtrer les mots à confiance `< 30`.
2. **Fallback texte** si `words` reste vide : utiliser `data.text`, découper par lignes, puis chaque ligne par tabulations / `\s{2,}` (Tesseract insère des espaces multiples entre colonnes) → passer à `buildAthletes()` via `extractPlainRows()`.
3. **Détection d'en-tête** plus tolérante aux erreurs OCR fréquentes :
   - `N°` mal lu en `Ne`, `N.`, `Nº`, `No.` → élargir la regex.
   - `Date de Naissance` scindé sur 2 lignes → fusionner la ligne « Naissance » seule (déjà un cas de continuation) **avant** `detectHeader`, pas seulement après.
4. **Ligne titre multi-lignes** (« Liste nominative … / L'ASFAR / pour la saison 2025/2026 ») : renforcer `isHeaderOrTitle` pour matcher aussi `l'?asfar`, `pour la saison`, `saison`.
5. **Robustesse colonnes** : quand `cols.length < 2`, tenter un second passage en découpant chaque ligne du texte OCR par `\s{2,}` avant d'abandonner.

### Validation

Exécuter `parseAthletesFile()` sur le screenshot joint et vérifier que les 23 athlètes ressortent avec Nom/Prénom/Date/Taille/Poids corrects (y compris `.5.` DAHMOS / FATIMA ZAHRA et `.15.` MAHOUNA / PAULMICHE MICHOU multi-ligne).

---

## 2. Refonte de la synchronisation (remplace « BYOC »)

Objectif produit : **un bouton « Synchroniser »**. L'app détecte le téléphone, ouvre le drive natif via l'auth du système, sans créer de compte SprintLab, sans coller de mot de passe.

### UX
- Écran Réglages → section **Sauvegarde cloud** avec un seul bouton :
  - iOS / iPadOS → « Sauvegarder sur iCloud Drive »
  - Android / autres → « Sauvegarder sur Google Drive »
  - + un lien secondaire discret : « Utiliser un fichier .slfv »
- Après connexion, on affiche : provider utilisé, date de dernière sync, boutons **Envoyer** / **Récupérer** / **Synchroniser**.
- Aucun champ URL, aucun mot de passe, aucun client-ID à saisir.

### Détection
`detectPreferredProvider()` dans `src/lib/sync/config.ts` :
- iOS (`/iPad|iPhone|iPod/` ou `navigator.platform === 'MacIntel' && maxTouchPoints > 1`) → `"icloud"`.
- Sinon → `"gdrive"`.
- Override manuel possible via le lien secondaire (`"file"`).

### Google Drive (Android + desktop)
- On garde `gdriveAdapter` mais on retire le champ « Client ID » de l'UI : utiliser un **Client ID managé** stocké dans `import.meta.env.VITE_SLFV_GDRIVE_CLIENT_ID` (variable publique, safe côté client) — l'utilisateur ne voit qu'un bouton « Se connecter avec Google ».
- Scope `drive.appdata`, fichier `sprintlab.slfv` (invisible pour l'utilisateur, propre à l'app).
- Token stocké en localStorage, refresh via `initTokenClient` transparent.

### iCloud Drive (iOS)
Le navigateur iOS n'expose **aucune API iCloud directe**. Approche standard :
- **Push** : générer le blob `.slfv` puis déclencher `<a download>` — sur iOS Safari, l'utilisateur choisit « Enregistrer dans Fichiers » → iCloud Drive/SprintLab.
- **Pull** : `<input type="file" accept=".slfv">` — iOS ouvre le sélecteur Fichiers avec iCloud Drive natif.
- On mémorise en localStorage l'emplacement conseillé et on affiche des instructions courtes la 1ʳᵉ fois.
- Nouveau adapter `icloudAdapter` dans `src/lib/sync/adapters.ts` (essentiellement `fileAdapter` avec libellés adaptés et détection de la présence dans Files/iCloud).

### Suppression
- Retirer l'adaptateur **WebDAV** de l'UI et du sélecteur (on garde le code mort supprimé de `adapters.ts` pour rester local-only).
- Retirer les champs `webdavUrl / webdavUser / webdavPath / webdavPassword` de `PublicConfig` / `SecretConfig`.
- Simplifier `SyncProvider` à `"none" | "gdrive" | "icloud" | "file"`.

### Fichiers touchés
- `src/lib/sync/config.ts` — nouveau `SyncProvider`, `detectPreferredProvider()`, suppression WebDAV.
- `src/lib/sync/adapters.ts` — retirer WebDAV, ajouter `icloudAdapter`, Google Drive sans champ Client ID (lecture env).
- `src/lib/sync/manager.ts` — inchangé sauf typage.
- Écran Réglages (créer/adapter section) : bouton unique + statut.
- `.env` : ajouter `VITE_SLFV_GDRIVE_CLIENT_ID` (le user fournira la valeur ; si vide, on désactive Drive et on retombe sur fichier).
- **`SPEC.md`** — mettre à jour section « Sync (BYOC) » → « Sync (Drive natif) », lister les 3 providers, bumper `Last updated`.

---

## 3. Vérifs finales
- Build (`tsgo`) OK.
- Import du screenshot fourni → 23 athlètes.
- Sur iPhone : bouton unique « Sauvegarder sur iCloud Drive » → dialog Fichiers.
- Sur Android : bouton unique « Sauvegarder sur Google Drive » → OAuth Google.

Aucune donnée quitte l'appareil sans action explicite de l'utilisateur.
