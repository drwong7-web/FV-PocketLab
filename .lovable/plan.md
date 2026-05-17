Le problème n’est pas l’écran noir : après avoir arrêté l’enregistrement, la modale ne bascule pas de façon fiable vers l’écran d’analyse avec la vidéo enregistrée.

Do I know what the issue is? Oui.

Cause probable dans `src/components/camera/SprintVideoAnalyzer.tsx` : le handler `MediaRecorder.onstop` appelle `stopStream()`, et `stopStream()` tente à nouveau de stopper le recorder encore référencé. Sur certains navigateurs, surtout mobile/Safari, `onstop`/`dataavailable` peut se déclencher de manière particulière ou multiple, ce qui rend le flux instable : la vidéo peut être créée trop tôt, écrasée, ou l’interface peut retomber sur l’état de choix au lieu d’afficher l’analyse.

Plan de correction :

1. Séparer proprement l’arrêt caméra et l’arrêt recorder
   - Créer une fonction dédiée qui arrête uniquement les tracks caméra.
   - Éviter d’appeler `recorder.stop()` depuis `onstop`.
   - Nettoyer `recorderRef.current` seulement après traitement du blob.

2. Rendre `onstop` idempotent
   - Ajouter une garde pour ignorer un éventuel second `onstop`.
   - Ne créer l’URL vidéo que si le blob contient vraiment des données.
   - Afficher une erreur claire si l’enregistrement est vide.

3. Forcer l’écran d’analyse après capture valide
   - Après création de `videoUrl`, rester en `mode="choose"` mais s’assurer que `videoUrl` est non nul avant de nettoyer la caméra.
   - Réinitialiser les états d’analyse uniquement après validation du blob.

4. Sécuriser le chargement vidéo
   - Garder le correctif de durée WebM déjà ajouté.
   - Ajouter `onLoadedData`/`onCanPlay` si nécessaire pour synchroniser l’affichage de la timeline.

5. Vérification
   - Tester le chemin “Filmer maintenant” → “Démarrer” → “Arrêter”.
   - Confirmer que la modale affiche directement la vidéo, la timeline et les contrôles d’analyse.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>