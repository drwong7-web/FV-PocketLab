## Objectif

Sur la page `/app/tests/new/jump`, remplacer le carré à dégradé contenant l'icône `Zap` (à gauche du titre "SAUT VERTICAL") par le logo `logo-jump-neon.png` (le même que celui utilisé dans la carte "Saut vertical" de la page de sélection de test), avec des dimensions adaptées.

## Changement

Fichier: `src/pages/JumpTest.tsx`

1. Ajouter l'import: `import logoJump from "@/assets/logo-jump-neon.png";`
2. Retirer l'import de l'icône `Zap` depuis `lucide-react` (n'est plus utilisée).
3. Remplacer le bloc actuel (lignes 145–147):
   ```
   <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-primary-foreground shadow-glow">
     <Zap className="h-5 w-5" />
   </div>
   ```
   par un `<img>` avec le logo, dimensionné pour s'accorder à la ligne du titre (plus grand que 10×10 mais compact pour un en-tête de page):
   ```
   <img src={logoJump} alt={t("verticalJump")} className="h-14 w-14 object-contain flex-shrink-0" />
   ```

Aucun autre changement (le titre, le sous-titre et le reste de la page restent identiques).

## Vérification

- Build passe.
- Sur la page Test de saut vertical, le logo néon remplace le carré vert Zap et s'aligne visuellement avec le titre.
