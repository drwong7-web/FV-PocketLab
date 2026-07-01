## Objectif

Supprimer intégralement la section **Sécurité de l'appareil** (Paramètres) et TOUT le système d'authentification device-native qui l'alimente (PIN, biométrie/passkey, verrouillage automatique, master-key, chiffrement AES des secrets).

L'app devient **local-first sans verrouillage** : un simple profil local (nom + team) enregistré sur l'appareil, plus aucun écran de déverrouillage, plus aucun chiffrement des clés/secrets stockés.

## Ce qui est supprimé

### Fichiers entiers
- `src/lib/deviceAuth.ts` — PBKDF2, AES-GCM, WebAuthn, auto-lock, master key.

### Section UI (dans `src/components/AppLayout.tsx`)
- Toute la `<section>` "Sécurité de l'appareil" (auto-lock 5/15/60/240, Biométrie Face/Touch/Windows Hello, Changer le PIN, "Réinitialiser tout").
- Le bouton `Lock` de la barre supérieure (icône cadenas à droite).
- Les états React associés : `bioAvailable`, `bioEnrolled`, `autoLock`, `pinCurrent`, `pinNew`.
- Les handlers : `onEnableBio`, `onDisableBio`, `onChangeAutoLock`, `onChangePin`.
- Les imports Lucide devenus inutiles (`Fingerprint`, `Lock`, `ShieldCheck`, `Timer`) et les imports depuis `deviceAuth`.

### Écran d'authentification (`src/pages/Auth.tsx`)
- Suppression du flux PIN (création + confirmation), du bouton biométrie et du déverrouillage.
- Remplacé par un onboarding minimal : **Nom + Team → Enregistrer** (une seule fois). Ensuite `/auth` redirige vers `/app`.

### Route de protection (`src/components/ProtectedRoute.tsx`)
- Plus de notion de `locked`. Redirige vers `/auth` uniquement si aucun profil local n'existe (`enrolled === false`).

### Contexte Auth (`src/lib/auth.tsx`)
- Suppression de `locked`, `lock()`, `bumpActivity`, `unlockPin`, `unlockBiometric`, auto-lock timer, écouteurs pointerdown/keydown/visibility.
- `enroll({ name, org })` crée simplement le profil local.
- `signOut()` = efface le profil local et redirige. Plus de purge master-key/passkey.

### Client IA (`src/lib/ai/client.ts`)
- Suppression de tout le chiffrement AES-GCM.
- Clé Gemini stockée **en clair** dans `localStorage` (`fv:ai-key:v2`) — chargée synchroniquement, sans `loadAIKey()`.
- `setAIKey` devient synchrone, sans exigence de master key.
- Suppression de `clearAIKeyFromMemory` et de tous ses appels.
- Retire l'import `JSZip` — non, il reste utilisé par `parseAthletesFile` (extraction DOCX) → conservé.

### Sync BYOC (`src/lib/sync/config.ts` + `snapshot.ts` + `adapters.ts`/`manager.ts`)
- `SecretConfig` (mdp WebDAV, token Google) : stocké **en clair** dans `localStorage` au lieu d'être chiffré AES.
- `encryptSnapshotJson` / `decryptSnapshotBlob` : les snapshots deviennent du **JSON brut** (non chiffrés). Le header magic `SLFV1` reste toléré en lecture pour compat descendante minimale mais l'écriture produit du JSON simple.
- Retrait complet des références à `getMasterKey`, `aesEncrypt`, `aesDecrypt` dans tout `src/lib/sync/*`.
- Les clés `fv:auth:*` sortent de la liste d'exclusion (n'existent plus).

### Nettoyage secondaire
- `src/pages/Landing.tsx` : le CTA "Sign in" reste — il pointe vers `/auth` pour l'onboarding profil.
- Recherche globale `deviceAuth`, `masterKey`, `passkey`, `enrollPin`, `unlockWith`, `autoLock`, `PBKDF2`, `AES-GCM` → tout ce qui reste après les changements ci-dessus est supprimé.

## Détails techniques

```text
Avant :
  Auth → PIN → master key en mémoire → déchiffre AI key + secrets sync
  Header : [Settings] [Lock]
  Settings : Langue · Thème · Accent · Dossier · IA · Sécurité (PIN/Bio/Auto-lock) · Sync

Après :
  Auth → Nom + Team → profil créé, plus jamais demandé
  Header : [Settings]              (plus de cadenas)
  Settings : Langue · Thème · Accent · Dossier · IA · Sync
```

Le stockage local reste identique côté données (`slfv:*`), seule la couche crypto est retirée. **Impact confidentialité assumé** : la clé Gemini et les mots de passe WebDAV sont désormais en clair dans `localStorage`.

## Vérification

- `tsgo` doit passer (aucun import cassé vers `deviceAuth`).
- Preview : `/auth` demande uniquement Nom + Team, `/app` s'ouvre directement au retour, Paramètres n'affiche plus la section Sécurité, plus d'icône cadenas dans la barre du haut.
