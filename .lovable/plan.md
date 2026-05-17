# Import d'athlètes par fichier (PDF / Word / Image)

## Objectif

Sur la page d'une équipe (`/app/teams/:teamId`), ajouter un bouton "Importer une liste" à côté de "Player". L'utilisateur dépose un fichier (PDF, DOCX ou autre extension microsoft word, image PNG/JPG ou autre forme image), l'app extrait les athlètes (prénom, nom, masse, taille, position, date de naissance si présents) et les crée automatiquement dans l'équipe après validation.

## Flux utilisateur

1. Bouton "Importer" sur `TeamDetail`.
2. Dialog : zone de drop + sélecteur de fichier (`.pdf,.docx,.png,.jpg,.jpeg,.webp`).
3. Spinner "Analyse en cours…" pendant l'extraction.
4. Tableau éditable des athlètes détectés (cases à cocher, champs modifiables, masse par défaut 75 si absente).
5. Bouton "Créer N athlètes" → crée via `createPlayer` et ferme le dialog.

## Architecture technique

### 1. Edge function `parse-athletes-list`

Nouvelle fonction Supabase (`supabase/functions/parse-athletes-list/index.ts`) qui reçoit un fichier en base64 + son type MIME et renvoie un JSON `{ athletes: [{ firstName, lastName, mass?, height?, position?, birthDate? }] }`.

- **Images** (`image/*`) : envoyées directement à `google/gemini-2.5-flash` via Lovable AI Gateway en multimodal (vision + extraction structurée JSON).
- **PDF** : Gemini 2.5 supporte les PDF en entrée multimodale via `image_url` data URL `application/pdf` — utilisé tel quel (pas de parsing serveur lourd nécessaire).
- **DOCX** : extraction texte côté edge function avec un parseur ZIP minimal (lecture de `word/document.xml`, strip des balises) puis envoi du texte à Gemini pour structuration JSON. Pas de dépendance npm lourde — implémentation directe avec `JSZip` via `npm:jszip`.

Prompt système : "Tu extrais une liste d'athlètes depuis un document. Réponds uniquement en JSON strict suivant le schéma. Masse en kg, taille en cm, date au format ISO si présente. Ignore les en-têtes/totaux."

Utilise `tool_calls` / `response_format: json_schema` pour garantir un JSON valide.

### 2. Frontend

- Nouveau composant `src/components/players/ImportPlayersDialog.tsx` :
  - dropzone simple (input file stylé)
  - lit le fichier en base64, appelle `supabase.functions.invoke('parse-athletes-list', { body: { fileBase64, mimeType, fileName } })`
  - affiche la table éditable des résultats
  - crée les joueurs avec `createPlayer` au clic "Confirmer"
- Modification de `src/pages/TeamDetail.tsx` : ajouter le bouton "Importer" à côté de "Player".

### 3. Sécurité & coût

- Pas de secret à ajouter : `LOVABLE_API_KEY` déjà présent.
- Limite taille fichier : 10 MB côté client avec message d'erreur clair.
- Gestion des 429/402 retournés par l'AI Gateway avec toast utilisateur.

## Fichiers touchés

- `supabase/functions/parse-athletes-list/index.ts` (nouveau)
- `src/components/players/ImportPlayersDialog.tsx` (nouveau)
- `src/pages/TeamDetail.tsx` (ajout bouton + dialog)

## Hors scope

- Pas de modification du schéma DB (les joueurs sont en localStorage via `createPlayer`).
- Pas d'historique des imports.
- Pas de dédoublonnage automatique (l'utilisateur décoche dans la table de prévisualisation).