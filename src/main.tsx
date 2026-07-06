import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SettingsProvider } from "./lib/settings";
import { bootstrapKvStore } from "./lib/db/kvStore";

const root = createRoot(document.getElementById("root")!);

// Hydrate IndexedDB → in-memory cache before the first render so every
// synchronous storage read (auth check, teams, players…) sees the data.
bootstrapKvStore().finally(() => {
  root.render(
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
});
