## Objectif

Supprimer le flash où les cartes/widgets disparaissent brièvement à chaque navigation, même après retour depuis le mode review.

## Plan

1. **Rendre le layout persistant visuellement**
  - Garder `AppLayout` monté sans animation de page.
  - Donner au `<main>` une hauteur minimale stable entre header et bottom nav, pour éviter qu’il se vide visuellement pendant un changement de route.
2. **Neutraliser les animations globales de page**
  - Supprimer/neutraliser l’effet `page-in` restant dans la configuration Tailwind au lieu de seulement l’adoucir.
  - Ainsi, même si une classe `animate-page-in` est réintroduite par un état review/preview, elle ne démarre plus avec une opacité basse.
3. **Stabiliser la première hydratation/auth**
  - Vérifier `ProtectedRoute` et le flux `AuthProvider` : s’il affiche un fallback vide pendant quelques millisecondes à chaque remount, remplacer ce fallback par un conteneur stable/non vide ou éviter le remount inutile.
4. **Validation ciblée**
  - Vérifier les navigations `/app`, `/app/teams`, `/app/tests` et retour via bottom nav.
  - Confirmer que header/bottom nav restent fixes et que le contenu ne disparaît plus en laissant seulement le background.