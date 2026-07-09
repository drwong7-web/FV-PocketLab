## Effet 3D unifié sur toutes les cartes

Étendre le rendu « relief / 3D » (déjà présent sur les MetricCard via `.engraved-surface`) à l'ensemble des cartes de l'app, en gardant la cohérence dark/light.

### Portée
Cartes concernées :
- `.glass-card` (utilisée dans Dashboard, TeamDetail, PlayerDetail, TestList, TestResults, NewTest, Teams, JumpTest, SprintTest…)
- `MetricCard` (déjà stylé, à harmoniser avec le nouveau langage 3D)
- Cartes ad-hoc utilisant `rounded-2xl border bg-*` (Dashboard : « Manage Teams », « New Test », « Latest test », « Get started »)

Aucun changement de layout, de contenu ou de logique — uniquement CSS / classes visuelles.

### Rendu visuel
- Léger bombé : highlight en haut (1px clair), ombre en bas (1px sombre), ombre portée douce et diffuse pour décoller du fond.
- Bord subtilement biseauté via `box-shadow` inset (pas de `border` doublée).
- Hover : élévation renforcée + très léger `translateY(-2px)` pour effet tactile.
- Active/press : compression `translateY(0)` + ombre réduite.
- Respect strict des tokens HSL (`--foreground`, `--background`, `--shadow-*`) — aucun `#hex` ni couleur brute.

### Détails techniques (dans `src/index.css`)

1. Nouvelles variables dans `:root` et `.light` :
   - `--shadow-3d` : combinaison highlight inset haut + shadow inset bas + drop-shadow externe.
   - `--shadow-3d-hover` : version amplifiée.
   
2. Nouvelle classe utilitaire `.card-3d` (layer components) :
   ```css
   box-shadow: var(--shadow-3d);
   transition: transform .2s var(--transition-smooth), box-shadow .2s var(--transition-smooth);
   ```
   + `:hover` → `translateY(-2px)` et `--shadow-3d-hover`
   + `:active` → `translateY(0)` et shadow réduite

3. Modifier `.glass-card` pour intégrer directement le nouveau `box-shadow` 3D (remplace l'actuel `var(--shadow-card)` par `var(--shadow-3d)` + ajout des transitions et du hover).

4. Harmoniser `.engraved-surface` : garder l'effet gravé texte mais réutiliser la même ombre externe que `.card-3d` pour cohérence entre MetricCard et glass-card.

5. Dashboard : ajouter `card-3d` (ou laisser `glass-card` qui l'aura par défaut) aux cartes « Manage Teams », « New Test », « Latest test », « Get started » — elles utilisent déjà `glass-card`, donc rien à changer côté composant.

### Dark vs Light
- Dark : highlight `hsl(var(--foreground)/0.08)`, ombre basse `hsl(0 0% 0% / 0.6)`, drop-shadow `0 12px 28px -12px hsl(0 0% 0% / 0.7)`.
- Light : highlight `hsl(0 0% 100% / 0.9)`, ombre basse `hsl(0 0% 0% / 0.12)`, drop-shadow `0 12px 28px -14px hsl(222 30% 40% / 0.25)`.

### Fichiers modifiés
- `src/index.css` : variables `--shadow-3d*`, classe `.card-3d`, mise à jour `.glass-card` et `.engraved-surface`, variantes `.light`.
- Aucun composant `.tsx` modifié (l'effet est appliqué via classes existantes `glass-card` et `engraved-surface`).

### Hors périmètre
- Pas de tilt 3D à la souris (parallax) — effet 3D purement statique + micro-interaction hover, pour rester sobre et performant sur mobile.
- Pas de changement SPEC.md (styling pur, pas d'architecture).
