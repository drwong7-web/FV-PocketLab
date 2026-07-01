/**
 * Persistance de la configuration de sync BYOC (stockage en clair local).
 */
export type SyncProvider = "none" | "file" | "webdav" | "gdrive";

const CFG_KEY = "fv:sync:cfg-v1";
const SECRETS_KEY = "fv:sync:secrets-v1";
const STATE_KEY = "fv:sync:state-v1";

export interface PublicConfig {
  provider: SyncProvider;
  webdavUrl?: string;
  webdavUser?: string;
  webdavPath?: string;
  gdriveClientId?: string;
  gdriveFileName?: string;
}
export interface SecretConfig {
  webdavPassword?: string;
  gdriveAccessToken?: string;
  gdriveTokenExpiresAt?: number;
}
export interface SyncState {
  lastSyncAt?: number;
  lastDirection?: "push" | "pull" | "both";
  lastError?: string;
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

export function getSyncState(): SyncState {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") as SyncState; }
  catch { return {}; }
}
export function setSyncState(s: SyncState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* */ }
}
