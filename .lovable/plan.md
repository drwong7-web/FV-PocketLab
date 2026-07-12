## Recolorer les 4 logos (sprint + saut vertical) selon le thème/accent

### Approche
Décalage de teinte CSS pur via `filter: hue-rotate()` calibré sur l'accent utilisateur. Chaque pixel voit sa teinte pivotée — les blancs des highlights, les gris des ombres et le glow néon restent intacts. Aucun `mask`, aucun aplat de couleur.

### Modifs

**1. `src/lib/settings.tsx`** (dans le `useEffect` qui pose les variables CSS, ~ligne 305)
Ajouter :
```ts
const logoHueShift = ((H - 120) + 360) % 360;  // 120° = vert des PNG source
html.style.setProperty("--logo-hue-shift", `${logoHueShift}deg`);
html.style.setProperty("--logo-brightness", isDark ? "1" : "0.92");
```

**2. `src/index.css`** — ajouter une classe utilitaire :
```css
.logo-themed {
  filter:
    hue-rotate(var(--logo-hue-shift, 0deg))
    saturate(1.05)
    brightness(var(--logo-brightness, 1));
}
```

**3. Ajouter `className="logo-themed"` sur les 4 `<img>`** :
- `src/pages/NewTest.tsx` — les deux tuiles (logoJump, logoSprint)
- `src/pages/SprintTest.tsx` ligne ~214
- `src/pages/JumpTest.tsx` ligne ~146

### Résultat attendu
- Thème dark + accent vert (défaut) → logos inchangés visuellement.
- Thème dark + accent bleu/rouge/violet → silhouette du logo suit la teinte accent, glow et traînées conservés.
- Thème light → légère baisse de brightness pour éviter que le blanc éclabousse sur fond clair.

### Note
`hue-rotate` est un filter CSS (pas un mask). Si l'utilisateur veut zéro filter runtime, l'alternative est de régénérer des PNG par thème, mais ça ne peut pas suivre l'accent libre 0–360°.