# Marqueurs glissants pour le marquage manuel du saut vertical

## Objectif
Dans `CameraDistance` (utilisé pour le marquage manuel du saut vertical), remplacer le système actuel "cliquer pour placer 2 points" par deux **lignes horizontales glissantes** que l'on déplace verticalement sur la vidéo — équivalent vertical des marqueurs glissants verticaux du `SprintVideoAnalyzer`.

## Comportement cible

- Deux lignes horizontales superposées à la vidéo en lecture :
  - **Ligne 1 (rouge)** : cheville au décollage (position basse de référence).
  - **Ligne 2 (verte)** : cheville à l'apex (position haute).
- Chaque ligne traverse toute la largeur de la vidéo, avec une **poignée** (handle circulaire) au centre pour la saisir.
- Déplacement **vertical uniquement** par drag (pointer events) + ajustement fin au clavier (`ArrowUp` / `ArrowDown` = 1 px naturel).
- Position par défaut à l'ouverture : ligne 1 à 70 % de la hauteur, ligne 2 à 30 %.
- Hauteur calculée en continu : `|y1 - y2| en px naturels / pxPerCm / 100` (mètres) — affichée live.
- Étiquette `cm` à droite de chaque ligne + valeur globale `h = xx.x cm` déjà présente.

## Changements UI

- Supprimer le toggle `Playback / Mark` et le bouton `Undo last marker` (devenus inutiles, les lignes sont toujours visibles et déplaçables).
- Supprimer le clic sur l'overlay pour placer un point (`handleOverlayClick`, `toNatural`, `ankleTakeoff` / `ankleApex` en tant que points cliqués).
- Garder : contrôles de lecture (playbackRate, ±1 frame), redo, confirm, calibration warning.
- Garder l'overlay au-dessus de la vidéo, mais `pointer-events-none` sauf sur les poignées (comme dans `SprintVideoAnalyzer`).

## Détails techniques

- État interne :
  ```ts
  const [yTakeoff, setYTakeoff] = useState<number>(0.7); // ratio 0..1 sur la hauteur affichée
  const [yApex, setYApex]       = useState<number>(0.3);
  const [dragging, setDragging] = useState<"takeoff" | "apex" | null>(null);
  ```
- Calcul de la hauteur en mètres : convertir les ratios → pixels naturels via `videoHeight` et le `object-contain` fit (réutiliser la logique de `toNatural` mais sur Y) ; puis `heightM = |y1Nat - y2Nat| / pxPerCm / 100`.
- Drag : `onPointerDown` sur la poignée → `setPointerCapture` → `onPointerMove` met à jour le ratio Y (clamp 0..1) → `onPointerUp` libère.
- Clavier : focus sur la poignée, `ArrowUp/Down` déplacent d'1 px (1 / `rect.height`).
- Style : lignes pleine largeur (`absolute left-0 right-0 h-px`), poignée centrée (`left-1/2 -translate-x-1/2 h-5 w-5 rounded-full`), couleurs `bg-destructive` et `bg-primary` (ou `bg-emerald-500` via classe sémantique existante si dispo).

## Fichier modifié
- `src/components/camera/CameraDistance.tsx` uniquement.

## Vérification
- Recompiler, ouvrir Vertical Jump test → Camera (manuel) → enregistrer ou importer une vidéo → vérifier que deux lignes horizontales apparaissent immédiatement en review, qu'on peut les glisser au doigt sur mobile et à la souris, et que la valeur `h = xx.x cm` se met à jour en temps réel.
