Problème constaté : sur la page de test de saut, le titre d’en-tête « Jump height (cm) » n’est pas aligné avec les cases de saisie de la hauteur situées en dessous.

Cause probable : la rangée d’en-têtes utilise la même grille que les rangées d’inputs (`grid-cols-[1fr_1fr_auto_auto_auto]`), mais les `<span>` d’en-tête n’ont pas le padding horizontal des `<Input>` (`px-3`). Le texte de l’en-tête démarre donc au bord gauche de la cellule, tandis que le texte dans l’input démarre 12 px plus à droite.

Plan de correction :

1. Dans `src/pages/JumpTest.tsx`, ajouter `px-3` aux cinq `<span>` de la rangée d’en-tête des essais, de façon à ce que le texte de chaque en-tête démarre au même x que le texte contenu dans l’input correspondant.
2. Conserver la grille `grid-cols-[1fr_1fr_auto_auto_auto]` déjà en place pour que les colonnes restent alignées.
3. Vérifier visuellement en aperçu que « Jump height (cm) » est désormais aligné avec la case de saisie juste en dessous.

Aucune autre page ni logique métier n’est concernée.