## Fix sliding markers + apply to calibration

### 1. Fluidité des marqueurs (CameraDistance.tsx)

Problème: le drag bloque parce que `onPointerMove` est posé sur la petite poignée (4×4 px). Dès que le pointeur sort de la poignée pendant le glissement, l'événement n'est plus reçu de manière fiable, surtout sur mobile.

Correction:
- Déplacer la logique de drag au niveau de l'`overlayRef` (parent plein écran): un seul `onPointerMove` global qui met à jour le marqueur actif tant que `dragging !== null`.
- La poignée ne fait que `onPointerDown` → `setDragging(...)`. Plus de `setPointerCapture` sur la poignée (source de blocages quand le DOM change).
- Mettre `pointer-events-auto` sur l'overlay pendant le drag pour intercepter le mouvement même hors de la poignée; sinon `pointer-events-none` pour laisser passer les contrôles natifs de la vidéo.
- Utiliser `requestAnimationFrame` pour throttle les updates de position.
- Augmenter la zone tactile de la poignée: garder la poignée visuelle fine (4×4) mais ajouter un padding invisible (12 px) via un wrapper `before:` ou un hit-box transparent plus large (~28×28) — précision visuelle préservée, confort tactile gagné.

### 2. Contrôles natifs vidéo gênants

Problème: `controls` natif HTML5 affiche un gros bouton play/pause au centre qui chevauche les marqueurs.

Correction:
- Retirer l'attribut `controls` du `<video>` de revue.
- Ajouter une barre de contrôle custom en bas du panneau (déjà partiellement présente: vitesse + frame ±1). Ajouter:
  - Bouton Play/Pause
  - Une scrubber bar (input range lié à `currentTime` / `duration`)
- Tout est en dehors de la zone vidéo → ne gêne plus le marquage.

### 3. Marqueurs horizontaux dans la calibration (CameraCalibration.tsx)

Remplacer le système "clic 2 points" par deux lignes horizontales glissantes identiques à CameraDistance:
- Deux lignes horizontales (rouge = haut référence, vert = bas référence) avec poignées à gauche.
- État: `yTop`, `yBottom` en ratio 0..1.
- Drag géré au niveau de l'overlay (même technique que point 1).
- Calcul: `pxPerCm = |yTop - yBottom| * naturalH / cm` (distance verticale en pixels naturels / longueur réelle en cm).
- Le libellé d'instruction devient: "Aligne les deux lignes sur les extrémités de l'objet de référence vertical (ex: règle de 1 m posée verticalement)."
- L'avertissement reste: objet dans le même plan vertical que l'athlète.

Conséquence: la calibration mesure une distance **verticale** uniquement (cohérent avec la mesure de hauteur de saut qui est aussi verticale). Ça améliore la précision pour le saut vertical car on calibre dans la même direction que ce qu'on mesure.

### Fichiers touchés
- `src/components/camera/CameraDistance.tsx` — refactor drag, suppression `controls`, ajout scrubber + play/pause.
- `src/components/camera/CameraCalibration.tsx` — remplacement du système click-2-points par 2 lignes glissantes.

Aucun changement de logique métier hors UI / interaction.
