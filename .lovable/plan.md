Je vais corriger la page pour qu’elle couvre toute la hauteur visible de l’écran mobile.

Plan :
1. Remplacer les hauteurs basées sur `100vh/min-h-screen` par `100svh` aux endroits concernés, afin d’éviter les espaces liés aux barres du navigateur mobile.
2. Appliquer le correctif au layout principal de l’app et à l’écran de connexion, car la prévisualisation mobile montre aussi le problème sur `/auth`.
3. Ajuster la modale caméra AI pour utiliser la hauteur dynamique de l’écran (`100dvh/100svh`) afin qu’elle remplisse l’écran sans être coupée par les contrôles du mobile.
4. Vérifier sur viewport mobile que le fond et les overlays couvrent bien toute la fenêtre.