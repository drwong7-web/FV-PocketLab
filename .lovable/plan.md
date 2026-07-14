## Objectif
Supprimer partout dans l'app la saisie et l'affichage de la position/rôle de l'athlète.

## Modifications

1. **`src/pages/TeamDetail.tsx`** — formulaire d'ajout d'un joueur
   - Retirer le state `position` / `setPosition`.
   - Retirer le champ `<Label>Position</Label>` + `<Input>` dans le dialog.
   - Retirer `position` de l'appel `createPlayer(...)`.
   - Retirer `p.position` de la ligne affichée dans la liste des joueurs (garder juste `{p.mass} kg`).

2. **`src/pages/PlayerDetail.tsx`** — en-tête athlète
   - Retirer la portion `${player.position ? ` · ${player.position}` : ""}` du sous-titre.

3. **`src/components/players/ImportPlayersDialog.tsx`** — import IA
   - Retirer la colonne "Position" du récapitulatif (passer la grille de `grid-cols-3` à `grid-cols-2` : Masse + Taille).
   - Retirer `position` du type `ParsedAthlete`/`Row` et de l'appel `createPlayer`.

4. **`src/lib/import/athletes.ts`** — parseur
   - Retirer le champ `position` de l'interface exportée `ParsedAthlete`.
   - Retirer le `Field` `"position"`, l'entrée du dictionnaire d'en-têtes (`poste|position|role`), et l'affectation `position: posRaw || undefined` dans l'objet retourné.

5. **`src/lib/types.ts`** — laisser `position?: string` sur `Player` (rétro-compat des données existantes en localStorage). Aucune migration nécessaire ; le champ devient simplement inutilisé.

## Hors périmètre
- Pas de changement de `SPEC.md` structurel (retrait UI mineur). Les autres occurrences de "position" dans le code (CSS `style.position`, labels de graphes recharts, `point1Label` du calibrage caméra) ne concernent pas le rôle de l'athlète et restent intactes.
