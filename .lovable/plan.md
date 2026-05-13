## Objectif

Supprimer le bandeau d'avertissement en bas de `CameraDistance.tsx` pour laisser plus de place au menu de contrôle (Playback/Mark, vitesse, frame-by-frame) qui se trouve juste au-dessus.

## Modification

Dans `src/components/camera/CameraDistance.tsx` (lignes ~245-250), retirer le bloc :

```tsx
<Card className="m-2 rounded-lg">
  <div className="space-y-1 p-2 text-xs">
    <p>⚠ Do not move the camera between calibration and the trial. Same framing and zoom.</p>
    <p>Use <strong>Playback</strong> to scrub, then <strong>Mark</strong> to place the 2 ankle markers.</p>
  </div>
</Card>
```

Nettoyer aussi l'import `Card` s'il n'est plus utilisé ailleurs dans le fichier.

## Résultat attendu

Le panneau de marquage (overlay sombre avec boutons Playback/Mark, vitesses, ±1 frame, Undo) gagne de l'espace vertical et reste collé aux boutons d'action (Redo / Confirm) en bas.
