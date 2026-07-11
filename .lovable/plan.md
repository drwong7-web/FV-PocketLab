## Plan

Modifier `src/pages/SprintTest.tsx` pour remplacer le bouton/icone sélectionné (le carré `TrendingUp` à la ligne 210) par le logo sprint néon, en adaptant ses dimensions.

### Changements
1. **Import** : retirer `TrendingUp` de l'import `lucide-react`, ajouter `import logoSprint from "@/assets/logo-sprint-neon.png"`.
2. **Remplacement du bloc** (lignes 210-212) :
   - Supprimer le `<div className="flex h-10 w-10 ...">` contenant `<TrendingUp ... />`.
   - Le remplacer par `<img src={logoSprint} alt="Sprint" className="h-14 w-14 object-contain flex-shrink-0" />`.
3. **Ajustement visuel** : conserver le `gap-3` du conteneur flex et la taille `h-14 w-14` (comme pour le logo jump) pour un rendu cohérent.

### Fichier concerné
- `src/pages/SprintTest.tsx`

Aucune logique métier ou backend n'est touchée.