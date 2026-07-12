Le bouton « Localiser » (autofillWeather) dans l'en-tête de la carte Conditions du test Sprint utilise actuellement `variant="outline"`, ce qui le distingue visuellement du bouton « Démo » situé dans le titre de la page qui utilise `bg-gradient-primary text-primary-foreground font-semibold`.

Plan :
1. Dans `src/pages/SprintTest.tsx`, remplacer le style du bouton Localiser (ligne ~329) pour qu'il ressemble au bouton Démo :
   - Supprimer `variant="outline"`
   - Appliquer `className="bg-gradient-primary text-primary-foreground font-semibold"`
   - Conserver `size="sm"`, `onClick={autofillWeather}` et `disabled={geoBusy}`
2. Vérifier que l'icône et le texte restent lisibles et que l'état désactivé reste fonctionnel.
3. Lancer la vérification TypeScript et, si pertinent, un aperçu visuel rapide.

Fichier concerné : `src/pages/SprintTest.tsx`