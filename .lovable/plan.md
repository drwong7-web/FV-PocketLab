## Objectif

Retirer entièrement Supabase / Lovable Cloud et passer à une architecture **local-first** :
- Base de données 100% sur l'appareil (IndexedDB)
- Sync optionnelle avec un cloud personnel choisi par l'utilisateur (**BYOC** : Bring Your Own Cloud)
- Authentification via la sécurité native de l'appareil (PIN / biométrie via **WebAuthn / Passkeys**), plus de mot de passe stocké

---

## 1. Suppression de Supabase

**Fichiers à supprimer**
- `src/integrations/supabase/` (client + types)
- `supabase/` (config + edge functions `parse-athletes-list`, `detect-sprint-markers`)
- Variables `VITE_SUPABASE_*` dans `.env`
- Dépendance `@supabase/supabase-js` du `package.json`

**Fichiers à nettoyer**
- `src/components/camera/SprintVideoAnalyzer.tsx` : remplacer `supabase.functions.invoke("detect-sprint-markers", …)` par un appel direct côté client (voir §4 IA)
- `src/components/players/ImportPlayersDialog.tsx` : idem pour `parse-athletes-list`

---

## 2. Base de données locale (IndexedDB via Dexie)

Migration de `localStorage` → **IndexedDB** (plus robuste, async, supporte blobs vidéo, indexes).

Schéma Dexie (`src/lib/db.ts`) — mêmes entités que `src/lib/types.ts` :
- `users`, `organizations`, `teams`, `players`, `tests`, `media` (blobs vidéo)
- Chaque ligne porte `updatedAt` + `deletedAt` (soft delete) + `rev` pour la sync
- Conservation de l'API publique de `src/lib/storage.ts` (mêmes signatures `listTeams`, `createPlayer`, etc.) → zéro casse pour les pages existantes
- Suppression du `hashPassword` (plus d'authent locale par mot de passe)

---

## 3. Authentification device-native (WebAuthn / Passkeys)

Remplacement de `src/lib/auth.tsx` + `src/pages/Auth.tsx` par un flux Passkey :

- **Premier lancement** : création d'un compte local + enregistrement d'un passkey (`navigator.credentials.create` avec `authenticatorAttachment: "platform"`, `userVerification: "required"` → déclenche FaceID / TouchID / Windows Hello / verrouillage Android)
- **Lancements suivants** : `navigator.credentials.get` → déverrouille la session
- **Fallback** : PIN local 6 chiffres (hashé via Web Crypto `PBKDF2`) si l'appareil ne supporte pas WebAuthn
- Stockage du `credentialId` dans IndexedDB ; la clé privée reste dans le secure enclave de l'appareil
- `ProtectedRoute` reste, mais vérifie une session déverrouillée plutôt qu'un user distant
- Auto-lock configurable (5 / 15 / 60 min d'inactivité)

---

## 4. Fonctions IA (sans backend)

Les 2 edge functions Gemini sont déplacées **côté client** :

- Nouveau panneau **Paramètres → IA** : l'utilisateur colle sa propre clé API (Gemini, OpenAI, Anthropic au choix)
- Clé stockée chiffrée dans IndexedDB (AES-GCM via WebCrypto, clé dérivée du passkey/PIN)
- `src/lib/ai/` :
  - `client.ts` : appel HTTP direct vers le provider choisi
  - `detectMarkers.ts` : reprend le prompt de `detect-sprint-markers`
  - `parseAthletes.ts` : reprend le prompt de `parse-athletes-list`
- Si aucune clé n'est configurée : les boutons IA affichent un CTA "Configurer ma clé IA" au lieu d'échouer

---

## 5. Sync BYOC (Bring Your Own Cloud)

Architecture en **adaptateurs** — l'utilisateur choisit son provider dans **Paramètres → Sync** :

| Adaptateur | Méthode | Auth |
|---|---|---|
| **Aucun** (défaut) | — | — |
| **Google Drive** | Fichier `sprintlab.db.json` chiffré dans `appDataFolder` | OAuth implicite |
| **Dropbox** | Idem dans `/Apps/SprintLab/` | OAuth |
| **WebDAV** (Nextcloud, ownCloud, iCloud via app passwords) | PUT/GET d'un fichier chiffré | URL + user/pass |
| **Fichier local** (export/import manuel) | Téléchargement / upload `.slfv` | — |

Mécanisme commun (`src/lib/sync/`) :
- Export = snapshot complet de la DB + médias → JSON → compressé (gzip) → chiffré (AES-GCM, clé dérivée du passkey/PIN) → uploadé
- Import = inverse, merge par `updatedAt` le plus récent gagne (LWW)
- Bouton "Sync now" + sync auto à la fermeture / toutes les X minutes
- Aucun secret OAuth dans le code : flows publics PKCE pour Google/Dropbox

---

## 6. Impact sur les pages

- `Auth.tsx` → `Unlock.tsx` (passkey/PIN)
- `Dashboard.tsx`, `Teams.tsx`, `TeamDetail.tsx`, `TestList.tsx`, `TestResults.tsx`, `JumpTest.tsx`, `SprintTest.tsx`, `PlayerDetail.tsx` → continuent d'utiliser l'API `storage.ts` (devenue async — ajout de `await` + petits `useEffect`)
- `NewTest.tsx`, `ImportPlayersDialog.tsx`, `SprintVideoAnalyzer.tsx` → branchés sur `src/lib/ai/`
- Nouvelle page `Settings.tsx` : Clé IA, Provider Sync, Auto-lock, Export/Import manuel, Reset

---

## Détails techniques

- **Stack ajoutée** : `dexie` (~25 kb), aucune autre dépendance lourde ; WebCrypto / WebAuthn natifs
- **Compatibilité** : migration one-shot au premier lancement qui lit l'ancien `localStorage` (`slfv:*`, `fv:*`) et le réinjecte dans Dexie, puis purge
- **PWA / Capacitor** : 100% compatible — WebAuthn fonctionne sur iOS/Android via Capacitor, IndexedDB est persistante
- **Sécurité** : aucune donnée ne quitte l'appareil sauf si l'utilisateur active explicitement un provider de sync ; les blobs cloud sont chiffrés bout en bout (la clé ne quitte jamais l'appareil)

---

## Livraison proposée en 3 lots

1. **Lot 1 — Découplage** : Suppression Supabase + migration storage → Dexie + IA côté client avec clé utilisateur (app reste fonctionnelle, auth temporairement bypass)
2. **Lot 2 — Auth device** : Passkeys + PIN fallback + auto-lock + chiffrement de la clé IA
3. **Lot 3 — Sync BYOC** : Adaptateurs Google Drive + Dropbox + WebDAV + export/import fichier

Confirme-tu ce plan (et l'ordre des lots) ? Je peux aussi commencer par un seul lot si tu préfères livrer incrémentalement.