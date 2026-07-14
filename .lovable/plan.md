## Problème

Sur desktop, les champs `<Input type="number">` (masse, taille, hPO, charge kg, hauteur cm, etc.) affichent les flèches natives du navigateur (spinners) à droite, et l'utilisateur dit qu'il ne peut pas taper librement une valeur — il doit utiliser ces flèches. Sur mobile, le comportement est correct car iOS/Android n'affichent pas de spinners.

## Solution

Masquer globalement les spinners des inputs numériques via CSS, tout en gardant `type="number"` (donc le clavier numérique sur mobile reste actif et la saisie clavier reste possible partout).

### Fichier modifié

**`src/index.css`** — ajouter une petite règle utilitaire globale :

```css
/* Hide number input spin buttons (desktop) — keep numeric keyboard on mobile */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

Aucune modification des composants (`Input.tsx`, JumpTest, SprintTest, TeamDetail, ImportPlayersDialog, etc.) n'est nécessaire — la règle s'applique partout automatiquement.

## Hors périmètre

- Ne change pas la validation, ni les `step`, ni le type des champs.
- Ne touche pas au comportement mobile (déjà correct selon l'utilisateur).
- N'affecte aucune logique métier.
