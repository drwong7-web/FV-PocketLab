## Problème

Le bouton « Choisir un dossier » ne fait rien visiblement dans l'aperçu Lovable.

**Cause :** L'aperçu s'affiche dans un iframe, et la Permissions-Policy du navigateur bloque `window.showDirectoryPicker()` dans les iframes cross-origin. L'appel lève une `SecurityError` (« The request is not allowed by the user agent or the platform in the current context »). Notre code attrape silencieusement cette erreur dans `pickExportDirectory()` et retourne `null`, donc rien n'apparaît à l'écran — d'où l'impression que le bouton ne fonctionne pas.

Hors iframe (onglet plein écran sur Chrome/Edge desktop, ou app native Capacitor), l'API fonctionne normalement.

## Correctifs

### 1. `src/lib/exportTarget.ts`
- Détecter l'exécution en iframe (`window.self !== window.top`) et exposer `isInIframe()`.
- Dans `pickExportDirectory()`, ne plus avaler les erreurs : retourner un objet `{ ok, name?, reason? }` avec des codes (`unsupported`, `iframe-blocked`, `cancelled`, `error`) au lieu de `string | null`.
- Conserver le comportement Capacitor existant.

### 2. `src/components/AppLayout.tsx`
- Adapter `handlePickFolder` au nouveau retour : afficher un `toast.error` explicite si `iframe-blocked` (« Ouvrez l'app dans un nouvel onglet pour choisir un dossier ») ou `unsupported` (« Navigateur non compatible — utilisez Chrome/Edge desktop »).
- Ajouter sous le bouton un petit texte d'aide quand on est en iframe, avec un lien « Ouvrir dans un nouvel onglet » qui pointe vers `window.location.href` cible (`target="_blank"`).
- Ajouter les clés i18n correspondantes (`openInNewTab`, `iframeBlocked`, `browserUnsupported`) dans `src/lib/settings.tsx` (fr/en/ar).

## Hors scope
Aucun changement de logique d'export PDF/Word ni de stockage. Uniquement le retour d'erreur du sélecteur et le feedback UI.
