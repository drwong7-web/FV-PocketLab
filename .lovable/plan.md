Je vais corriger l’écran caméra de mesure manuelle pour que la moitié inférieure de la vidéo reste visible sur mobile.

Plan :
1. Ajuster le conteneur vidéo dans `CameraDistance.tsx` pour réserver de l’espace au panneau de commandes en mode review au lieu de le superposer à la vidéo.
2. Garder le panneau de marquage en bas, mais le sortir du flux qui masque l’image afin que la vidéo s’arrête au-dessus du menu.
3. Conserver les contrôles existants et les marqueurs, sans changer la logique de mesure ni les autres écrans.

Détail technique :
- Remplacer la superposition `absolute bottom-0` du panneau review par une zone de commandes dans le layout vertical.
- Maintenir l’overlay de clic uniquement sur la zone vidéo visible pour que les coordonnées des points restent cohérentes.