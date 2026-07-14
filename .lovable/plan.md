
## Diagnostic
`src/pages/TestResults.tsx` (1122 lignes) contient encore des dizaines de chaînes en dur (mélange FR/EN) alors que le reste de l'app passe par `useSettings().t(key)`. C'est pour ça que cette page ne suit pas la langue choisie dans les paramètres.

Toutes les autres pages (`Dashboard`, `Teams`, `TeamDetail`, `PlayerDetail`, `JumpTest`, `SprintTest`, `TestList`, `NewTest`, `Auth`) utilisent déjà `t(...)` correctement — seul `TestResults.tsx` a été oublié.

## Plan de correction

### 1. Ajouter les clés de traduction manquantes dans `src/lib/settings.tsx`
Dans l'objet `TR` (FR / EN / AR), ajouter les clés pour tous les libellés visibles de la page résultats, regroupées par bloc :

- **En-tête & actions** : titre du test (Saut vertical / Sprint linéaire), bouton retour, dupliquer, supprimer, exporter PDF, exporter DOCX, enregistrer, partager.
- **Infos athlète** : athlète, équipe, sport, date, poids de corps, taille, hPO, conditions du test.
- **Indicateurs principaux (saut)** : F0, V0, Pmax, pente F-V, pente optimale, FVimb, R², h max, profil, unités (N/kg, m/s, W/kg, cm, %).
- **Indicateurs principaux (sprint)** : F0 horiz., V0 / Vmax, Pmax, pente F-V, RFmax, DRF, temps, distance, splits.
- **Sections & graphiques** : « Profil F-V (Samozino) », « Représentation graphique F-V », « Essais », « Fractions », « Conditions du test », « Méthode et références », « Recommandations d'entraînement ».
- **Interprétation profil** : « déficit de force », « déficit de vitesse », « équilibré », « bien équilibré », « profil optimal », phrases descriptives associées.
- **Recommandations** : titre, colonnes du tableau (Exercice, Séries × Reps, Intensité), notes.
- **Cible sport / tracé rouge** : « Profil type », « Comparaison au sport », nom générique fallback.
- **Messages d'état** : « Aucun essai valide », « Chargement… », « Test introuvable ».

Environ 60–80 nouvelles clés. Toutes ajoutées en trois langues (fr/en/ar), en cohérence avec le ton déjà utilisé (Paramètres, Sombre, etc.).

### 2. Remplacer les chaînes en dur dans `src/pages/TestResults.tsx`
- Balayer tout le JSX de la page (headings, labels, titres de cartes, textes de paragraphes, boutons, badges de profil, tooltips).
- Remplacer chaque chaîne littérale par `t("cleKey")`.
- Pour les unités et libellés courts (N/kg, m/s, %, cm) : garder tels quels (universels) ou introduire une constante partagée.
- Pour les phrases dynamiques (ex. « Profil en déficit de force de X % »), utiliser une petite fonction locale qui compose `t("profilDeficitForce")` + valeur numérique.

### 3. Cas spécial : contenu du PDF/DOCX
Les fonctions `pdf.text(...)` en haut de fichier écrivent des libellés en anglais dur (`"Main indicators"`, `"Trials"`, etc.). Deux options :
- (a) Traduire aussi le PDF selon la langue courante (passer `t` au générateur).
- (b) Laisser le PDF/DOCX toujours en anglais (norme internationale de rapport).

**Recommandation** : (a) — cohérent avec l'app, et l'utilisateur voit la même langue à l'écran et à l'export.

### 4. Vérification
- Charger la page en FR, EN, AR : plus aucune chaîne en dur ne doit rester (recherche rapide `rg` sur des mots FR/EN typiques restants dans `TestResults.tsx`).
- RTL en arabe : vérifier qu'aucun libellé ne casse la mise en page (déjà géré ailleurs, mais confirmer sur les cartes de métriques).

## Fichiers modifiés
- `src/lib/settings.tsx` — nouvelles clés FR/EN/AR.
- `src/pages/TestResults.tsx` — remplacement systématique des chaînes en dur par `t(...)`.
- `SPEC.md` — pas de changement (pas d'impact architecture).

## Hors scope
- Pas de refactor du calcul (Samozino reste intact).
- Pas de changement UI/graphique.
- Pas de traduction des libellés du graphique Recharts en dehors des titres de sections déjà remplacés.
