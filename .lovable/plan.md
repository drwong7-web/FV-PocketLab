Retirer l'icône `+` (Plus) devant "New Test" sur le Dashboard.

**Fichier**: `src/pages/Dashboard.tsx` ligne 46
- Supprimer `<Plus className="w-4 h-4" />` et les classes flex du wrapper devenues inutiles
- Retirer l'import `Plus` de `lucide-react` s'il n'est plus utilisé ailleurs