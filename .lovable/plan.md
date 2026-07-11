## Objectif
Rendre les cartes de la page **Paramètres** visuellement identiques aux cartes utilisées dans le reste de l'application (Dashboard, Tests, Équipes, Joueurs, etc.).

## État actuel
Les trois sections des paramètres utilisent :
```
<section className="space-y-3 bg-card border border-border rounded-2xl p-4 shadow-card">
```
Cela donne un fond plat `bg-card` et une ombre `shadow-card`.

Le reste de l'application utilise presque partout la classe utilitaire `.glass-card` définie dans `src/index.css` :
```css
.glass-card {
  background: var(--gradient-surface);
  @apply border border-border rounded-2xl;
  box-shadow: var(--shadow-card);
}
```
Ce qui produit un fond dégradé surface et une ombre cohérente avec le design system sport-science.

## Modifications prévues
1. **Remplacer les classes des 3 `<section>` des paramètres** pour utiliser `glass-card` au lieu de `bg-card border border-border rounded-2xl shadow-card`.
2. **Conserver** les espacements internes (`space-y-3` / `space-y-4`) et le contenu existant.
3. **Ajuster si nécessaire** les fonds des boutons/sélecteurs inactifs (`bg-background`) pour qu'ils restent lisibles sur le fond dégradé des cartes.

## Fichier concerné
- `src/components/AppLayout.tsx`

## Non concerné
- Aucun changement de texte, de traduction, de comportement ou de logique métier.
- Aucun ajout de dépendance.