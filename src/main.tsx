import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SettingsProvider } from "./lib/settings";
import { bootstrapKvStore } from "./lib/db/kvStore";
import { registerPwa } from "./pwa/register";
import { initInstallCapture, requestPersistentStorage } from "./lib/pwa/install";

// Capture beforeinstallprompt as early as possible.
initInstallCapture();

registerPwa();

// Kick off IndexedDB hydration ASAP, but don't block the first paint.
// Components that need the cache observe readiness via `useKvReady()`.
bootstrapKvStore();
// Silently ask the browser to make storage persistent (no UI).
void requestPersistentStorage();

const root = createRoot(document.getElementById("root")!);
root.render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);

// Remove the initial splash once React has mounted.
requestAnimationFrame(() => {
  document.getElementById("app-splash")?.remove();
});
