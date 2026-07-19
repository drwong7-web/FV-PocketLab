Objectif : rendre l'action "Sign up" (et ses traductions) plus visible dans le bouton de bascule en bas du formulaire d'authentification, en augmentant légèrement sa taille et en appliquant la couleur d'accent du thème choisi.

État actuel :
- Le bouton se trouve dans `src/pages/Auth.tsx` (lignes 97-103) et affiche `t("switchToSignup")`.
- La traduction complète est dans `src/lib/settings.tsx` : `"No profile?\u00a0 Sign up"`.

Plan :
1. Ajouter deux nouvelles clés de traduction dans `src/lib/settings.tsx` :
   - `noProfilePrompt` : "No profile?" / "Pas de profil ?" / "لا يوجد ملف؟"
   - `signUpLink` : "Sign up" / "Créer un profil" / "أنشئ حساباً"
2. Modifier `src/pages/Auth.tsx` pour afficher le préfixe et l'action séparément :
   - Le préfixe reste en `text-xs text-muted-foreground`.
   - L'action "Sign up" est wrappée dans un `<span>` avec `text-sm font-semibold text-primary` pour qu'elle adopte la couleur d'accent du thème et soit légèrement plus grande.
3. Conserver le comportement existant du bouton (basculer entre login et signup au clic).

Détails techniques :
- Utiliser le token sémantique `text-primary` afin que la couleur suive le thème choisi par l'utilisateur.
- Pas de changement de logique métier, uniquement de la présentation et des traductions.
- Aucune dépendance supplémentaire requise.