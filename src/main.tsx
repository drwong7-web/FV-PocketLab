import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SettingsProvider } from "./lib/settings";
import { bootstrapKvStore } from "./lib/db/kvStore";

// Kick off IndexedDB hydration ASAP, but don't block the first paint.
// Components that need the cache observe readiness via `useKvReady()`.
bootstrapKvStore();

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
