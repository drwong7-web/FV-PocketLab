/**
 * PWA install helpers — platform detection, standalone detection,
 * beforeinstallprompt capture, persistent-storage request.
 */

export type PwaPlatform =
  | "ios-safari"
  | "android-chromium"
  | "desktop-chromium"
  | "firefox"
  | "other";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BIPEvent | null = null;
const listeners = new Set<() => void>();

const INSTALLED_KEY = "slfv:pwa-installed";

function markInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, "1");
  } catch { /* */ }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch { /* */ }
  // iOS Safari
  const nav = navigator as unknown as { standalone?: boolean };
  return nav.standalone === true;
}

/** True when launched as a PWA, or after a previous install on this device. */
export function isPwaInstalled(): boolean {
  if (isStandalone()) {
    markInstalled();
    return true;
  }
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  return false;
}

export function getPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return "ios-safari";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Android/i.test(ua)) return "android-chromium";
  if (/Chrome|Edg|OPR/i.test(ua)) return "desktop-chromium";
  return "other";
}

export function initInstallCapture(): void {
  if (typeof window === "undefined") return;
  if (isStandalone()) markInstalled();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BIPEvent;
    listeners.forEach((fn) => { try { fn(); } catch { /* */ } });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    markInstalled();
    listeners.forEach((fn) => { try { fn(); } catch { /* */ } });
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export function onInstallStateChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((fn) => { try { fn(); } catch { /* */ } });
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined") return false;
    const s = navigator.storage as unknown as {
      persist?: () => Promise<boolean>;
      persisted?: () => Promise<boolean>;
    };
    if (!s?.persist) return false;
    if (s.persisted && (await s.persisted())) return true;
    return await s.persist();
  } catch { return false; }
}
