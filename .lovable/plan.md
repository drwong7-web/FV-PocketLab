Plan de correction :

1. Restaurer le comportement visuel du graphique F-V du saut vertical
- Garder le tracé vert comme profil mesuré.
- Garder un seul tracé rouge pointillé comme profil type de comparaison.
- Ne pas remettre la zone cible, le marqueur cible, ni l’iso-Pmax sur le graphique du saut vertical.

2. Corriger la vraie cause du problème
- Le sport de l’athlète n’est pas enregistré dans le snapshot du test : il est actuellement sauvegardé à `null` lors de la création du test.
- Récupérer le sport depuis l’équipe de l’athlète au moment d’enregistrer un test saut vertical.
- Appliquer la même correction au test sprint pour garder une logique cohérente.

3. Sécuriser l’affichage des anciens tests déjà créés
- Dans la page de résultats, si le test ancien contient `sport: null`, retrouver le joueur puis son équipe pour récupérer le sport actuel.
- Utiliser ce sport résolu pour :
  - le résumé de la cible sportive,
  - le tracé rouge du graphique F-V du saut vertical,
  - les références sportives côté sprint.

4. Résultat attendu
- Sur la page résultats du test saut vertical, le graphique retrouve la même représentation qu’avant.
- Le seul changement visible est que la ligne rouge pointillée correspond enfin au profil type du sport choisi.
- Si aucun sport n’est disponible, aucun tracé rouge sportif n’est affiché plutôt qu’un tracé incorrect.