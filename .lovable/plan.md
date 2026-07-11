## Problème

Le dictionnaire de traduction dans `src/lib/settings.tsx` (`TR`) ne contient que ~15 clés, toutes utilisées uniquement dans la page Paramètres. Les autres pages (Dashboard, TestList, NewTest, JumpTest, SprintTest, TestResults, Teams, TeamDetail, PlayerDetail, Auth, AppLayout, etc.) contiennent leurs libellés en dur (majoritairement en français), donc changer la langue n'a aucun effet visible ailleurs. Le `html.lang` / `html.dir` (RTL arabe) sont bien appliqués, mais les textes ne changent pas.

## Objectif

Faire en sorte que le sélecteur de langue (fr / en / ar) traduise **toute** l'interface, pas seulement l'écran Paramètres.

## Approche

1. **Étendre le dictionnaire `TR`** dans `src/lib/settings.tsx` avec toutes les chaînes UI de l'app, regroupées par domaine :
   - Navigation / layout : titres d'onglets, menu, boutons retour
   - Auth : login, register, champs, erreurs
   - Dashboard : titres, cartes de stats, actions rapides
   - TestList / NewTest : noms de tests (Vertical Jump, Linear Sprint), descriptions, filtres
   - JumpTest / SprintTest : étapes, instructions caméra, boutons (Start, Stop, Retry, Save), unités
   - TestResults : métriques (hauteur, vitesse max, phase d'accélération, etc.), export
   - Teams / TeamDetail / PlayerDetail : équipes, joueurs, ajout, champs formulaire
   - Toasts / messages d'erreur communs

2. **Remplacer les chaînes en dur** dans chaque page/composant par des appels `t("cle")` via `useSettings()`.

3. **Gérer les valeurs dynamiques** (nombres, unités) avec de petites fonctions de format qui respectent la locale (`toLocaleString(s.lang)`), en gardant les unités techniques (`cm`, `m/s`, `s`) universelles.

4. **RTL arabe** : vérifier que `html.dir = "rtl"` (déjà en place) rend correctement les listes/cartes. Ajuster ponctuellement les classes Tailwind si besoin (`text-start` au lieu de `text-left`, `ms-*` / `me-*`).

5. **Mettre à jour `SPEC.md`** : documenter que l'app est intégralement traduite (fr / en / ar) et que toute nouvelle chaîne UI doit passer par `TR` + `t()`.

## Détails techniques

- Le contexte `SettingsProvider` re-render tout l'arbre à chaque changement de `s.lang` (déjà le cas), donc pas besoin d'ajouter un mécanisme réactif supplémentaire.
- `t(k)` retourne la clé si absente : utile en dev pour repérer les oublis.
- Ordre de travail suggéré, page par page pour éviter un diff monstrueux : layout + nav → TestList/NewTest → Jump/Sprint/Results → Teams/Players → Auth → Dashboard.
- Aucun changement de logique métier, uniquement présentation.

## Questions

- Ok pour que je traduise **toutes** les pages en une seule passe, ou tu préfères que je commence par un sous-ensemble (ex. les écrans de test + navigation) et qu'on itère ?
- L'arabe doit-il être une traduction complète et soignée, ou une base fonctionnelle (traductions courtes, à raffiner ensuite) ?
