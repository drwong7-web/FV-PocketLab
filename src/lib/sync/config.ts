/**
 * Persistance de la configuration de sync (stockage local).
 * L'app détecte automatiquement le drive natif du téléphone :
 *   - iOS/iPadOS → iCloud Drive (via l'app Fichiers du système)
 *   - Android / desktop → Google Drive (OAuth Google natif)
 *   - Fallback manuel → Fichier .slfv téléchargeable
 */
export type SyncProvider = "none" | "gdrive" | "icloud" | "file";

const CFG_KEY = "fv:sync:cfg-v2";
const SECRETS_KEY = "fv:sync:secrets-v2";
const STATE_KEY = "fv:sync:state-v1";

export interface PublicConfig {
  provider: SyncProvider;
  /** Nom du fichier de snapshot côté drive (par défaut sprintlab.slfv). */
  fileName?: string;
  /** True after user completed connect (OAuth or iCloud enable). */
  linked?: boolean;
}
export interface SecretConfig {
  gdriveAccessToken?: string;
  gdriveTokenExpiresAt?: number;
}
export interface SyncState {
  lastSyncAt?: number;
  lastDirection?: "push" | "pull" | "both";
  lastError?: string;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1);
}

/** Détecte le provider recommandé selon l'appareil. */
export function detectPreferredProvider(): Exclude<SyncProvider, "none"> {
  if (typeof navigator === "undefined") return "gdrive";
  if (isIOSDevice()) return "icloud";
  return managedGoogleClientId() ? "gdrive" : "file";
}

/** Client ID Google managé (publique, injecté à la build). */
export function managedGoogleClientId(): string {
  const v = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SLFV_GDRIVE_CLIENT_ID;
  return (v || "").trim();
}

export function getPublicConfig(): PublicConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return { provider: "none" };
    return { provider: "none", ...JSON.parse(raw) } as PublicConfig;
  } catch { return { provider: "none" }; }
}
export function setPublicConfig(cfg: PublicConfig) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* */ }
}

export async function getSecretConfig(): Promise<SecretConfig> {
  try {
    const raw = localStorage.getItem(SECRETS_KEY);
    return raw ? (JSON.parse(raw) as SecretConfig) : {};
  } catch { return {}; }
}
export async function setSecretConfig(s: SecretConfig): Promise<void> {
  try { localStorage.setItem(SECRETS_KEY, JSON.stringify(s)); } catch { /* */ }
}

export async function clearSecretConfig(): Promise<void> {
  try { localStorage.removeItem(SECRETS_KEY); } catch { /* */ }
}

export function getSyncState(): SyncState {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") as SyncState; }
  catch { return {}; }
}
export function setSyncState(s: SyncState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* */ }
}
