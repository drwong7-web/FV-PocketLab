/**
 * PWA registration wrapper.
 *
 * Only registers the app-shell service worker in production and outside
 * Lovable preview/iframe contexts, per the Lovable PWA safety rules.
 * Supports `?sw=off` as a kill switch that unregisters existing SWs.
 */

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")
  ) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSw() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith("/sw.js") || url.endsWith("/service-worker.js")) {
        await r.unregister();
      }
    }
  } catch { /* */ }
}

export function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    // Clean up any previously-registered app SW so preview never serves stale HTML.
    void unregisterAppSw();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[pwa] register failed:", err);
    });
  });
}
