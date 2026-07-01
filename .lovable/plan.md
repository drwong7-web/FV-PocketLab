
## Objectif
Le build échoue sur `@supabase/supabase-js` introuvable. Nettoyer tous les vestiges Supabase pour que le projet compile sans cette dépendance, cohérent avec l'architecture local-first déjà en place.

## Ce qui reste à supprimer

1. **Dossier `src/integrations/supabase/`** (client.ts + types.ts) — non utilisé par le code applicatif (aucun `import { supabase }` dans `src/`), mais casse le typecheck.
2. **Dossier `supabase/`** à la racine (contient `config.toml`) — plus aucune edge function référencée.
3. **Dépendance `@supabase/supabase-js`** dans `package.json` — retirée via `bun remove`.
4. **Variables `VITE_SUPABASE_*`** dans `.env` (si présentes) — non lues par le code.

## Vérifications

- `grep -r "supabase\|@supabase" src/` doit ne rien retourner.
- Le typecheck passe (harness).
- L'UI d'authentification locale (PIN/Passkey) et le stockage IndexedDB restent inchangés.

## Ce qui n'est PAS touché

- `.lovable/plan.md` (document de planification interne, aucun impact runtime).
- Tout le code local-first : `deviceAuth`, Dexie, sync BYOC, client IA. Aucune fonctionnalité utilisateur n'est modifiée.
