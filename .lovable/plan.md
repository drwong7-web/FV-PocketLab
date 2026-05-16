## Objectif

Détection automatique, via Lovable AI (Gemini multimodal), des repères de distance physiques visibles dans la vidéo (0 m, 5 m, 10 m, …). Les positions retournées :
1. Sont affichées en surimpression sur la vidéo (en plus des poignées 0 m / X m déjà draggables).
2. Sont **utilisées dans le calcul F-V** via une fonction `xToMeters` par interpolation linéaire morceaux par morceaux entre repères voisins (plutôt qu'une calibration 2 points).

---

## 1. Edge function `detect-sprint-markers`

### `supabase/functions/detect-sprint-markers/index.ts`

- POST JSON `{ imageBase64: string, distances: number[] }` (image PNG/JPEG d'une frame, ex. 0.7 MB max).
- Utilise `@ai-sdk/openai-compatible` + `generateText` AI SDK avec `Output.object` (sortie structurée Zod) :
  ```ts
  z.object({
    markers: z.array(z.object({
      distance: z.number(),   // mètres
      xNorm: z.number(),       // 0..1, position horizontale dans l'image
      yNorm: z.number().optional(),
      confidence: z.number().min(0).max(1),
    })),
    notes: z.string().optional(),
  })
  ```
- Modèle : `google/gemini-3-flash-preview`. Prompt système : « Tu reçois une image extraite d'une vidéo de sprint linéaire vue de côté. La piste a des cônes/lignes/plots à des distances connues : {distances} m mesurées depuis la ligne de départ. Pour chaque distance, donne la coordonnée x normalisée (0=gauche, 1=droite) du repère visible. Renvoie uniquement les repères réellement visibles dans l'image, avec une confiance ∈[0,1]. »
- Message user : image (`type: "image"`) + texte rappelant la liste des distances et la convention.
- Gère 402 / 429 → renvoie JSON `{ error, status }`.
- `verify_jwt = false` (fonctionnalité publique de l'app authentifiée côté front, pas de données sensibles).

### Auth

Pas de JWT requis (calcul stateless, pas de DB). Aucune table ajoutée.

---

## 2. Front : capture frame + appel edge

### `src/components/camera/SprintVideoAnalyzer.tsx`

- Nouveau bouton **« Détecter les repères (IA) »** près de la section calibration / au-dessus de la timeline.
- Au clic :
  1. Seek la vidéo à `cropStart` (1re frame du crop IA), attendre `seeked`.
  2. Dessiner la frame sur un `<canvas>` temporaire à la taille naturelle de la vidéo, exporter en JPEG base64 (`toDataURL('image/jpeg', 0.85)`).
  3. Appeler `supabase.functions.invoke('detect-sprint-markers', { body: { imageBase64, distances: distancesWithZero } })` où `distancesWithZero = [0, ...distances]`.
  4. Stocker la réponse dans un nouvel état `detectedMarkers: { distance: number; xNorm: number; confidence: number }[]`.
- État d'appel : `aiMarkersBusy`, `aiMarkersError`.
- Si la détection contient 0 m et `testDistance` m → pré-remplit `calib.x0` et `calib.xRef` automatiquement (sauf si l'utilisateur les a déjà placés manuellement → propose un toast « Remplacer ? » non bloquant ; pour simplifier, on remplace toujours, l'utilisateur peut re-drag).

### Overlay sur la vidéo

- Pour chaque repère détecté (sauf 0 m et `testDistance` déjà rendus comme poignées primaires) :
  - Ligne verticale `bg-amber-400/70` (couleur distincte des deux poignées principales).
  - Étiquette `{d}m` en haut.
  - Petite poignée draggable identique à `x0`/`xRef` (réutilise la mécanique drag : on étend `draggingMarker` en `"x0" | "xRef" | { kind: "extra"; distance: number }`).

### Persistance du état des repères extras

- Nouvel état : `extraMarkers: Record<number, number>` (clé = distance m, valeur = `xNorm`).
- Initialisé / écrasé par la détection IA, modifiable au drag.
- Inclut 0 m et `testDistance` aussi → source de vérité unique pour le calcul (les poignées principales lisent/écrivent `extraMarkers[0]` et `extraMarkers[refMeters]` au lieu de `calib.x0` / `calib.xRef`). Conserver `calib` pour `refMeters` uniquement, ou tout migrer dans `extraMarkers`.

---

## 3. Calcul : interpolation piecewise

### `src/lib/poseDetection.ts`

- Étendre `computeSplitTimesFromSamples` avec une variante :
  ```ts
  computeSplitTimesFromSamples(
    samples,
    distances,
    calib: { markers: { xNorm: number; meters: number }[] } | { x0Norm; xRefNorm; refMeters },
    startTimeOffset,
  )
  ```
- Si `markers` fourni (≥ 2 points triés par `xNorm`) → `xToMeters(x)` fait une interpolation linéaire morceaux par morceaux entre les `markers` (extrapolation linéaire aux extrémités à partir des 2 plus proches).
- Sinon → comportement actuel (2 points).

### `runAI` dans l'analyzer

- Si `Object.keys(extraMarkers).length ≥ 2` → on passe `{ markers: [...] }`, sinon on retombe sur l'ancien chemin.

---

## 4. Hors-scope

- Pas de détection des chronos / des positions de l'athlète (toujours MediaPipe Pose).
- Pas de détection multi-frame agrégée (juste 1 frame, celle de `cropStart`).
- Pas de réglage de la couleur/forme des cônes — on fait confiance à Gemini.
- Pas de stockage des repères détectés en DB.

---

## Fichiers créés / modifiés

- **Créé** : `supabase/functions/detect-sprint-markers/index.ts`
- **Créé** : `supabase/functions/_shared/ai-gateway.ts` (helper provider, s'il n'existe pas déjà)
- **Modifié** : `src/components/camera/SprintVideoAnalyzer.tsx` (bouton, capture canvas, état `extraMarkers`, overlays, drag étendu)
- **Modifié** : `src/lib/poseDetection.ts` (`computeSplitTimesFromSamples` accepte des repères multiples)

## Erreurs IA à surfacer
- 429 → toast « Trop de requêtes IA, réessayez dans quelques secondes ».
- 402 → toast « Crédits IA épuisés, ajoutez du crédit dans Lovable Cloud ».
- Aucune réponse exploitable → message inline « Aucun repère détecté — ajustez manuellement ».
