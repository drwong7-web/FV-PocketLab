## Plan : ajuster la taille des titres des sections Paramètres

### Objectif
Diminuer de 2 niveaux Tailwind la taille de police des titres des 3 sections du panneau Paramètres (`Langue`, `Thème`, `Synchronisation`), par rapport à leur taille actuelle `text-2xl`.

### Changements prévus
Dans `src/components/AppLayout.tsx` :
- Ligne 134 : `<h3 className="text-2xl uppercase">{t("language")}</h3>` → `text-lg uppercase`
- Ligne 159 : `<h3 className="text-2xl uppercase">{t("theme")}</h3>` → `text-lg uppercase`
- Ligne 230 : `<h3 className="text-2xl uppercase">{t("cloudBackup")}</h3>` → `text-lg uppercase`

### Vérification
Lancer `bun run build` pour s’assurer qu’il n’y a pas d’erreur de compilation.
