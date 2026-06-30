/**
 * Persistance de la configuration de sync BYOC.
 * - Provider sélectionné
 * - Paramètres non-secrets en clair (URL WebDAV, client_id Google, etc.)
 * - Secrets (mot de passe WebDAV, token OAuth) chiffrés via master key
 */
import { aesDecrypt, aesEncrypt, getMasterKey } from "@/lib/deviceAuth";

export type SyncProvider = "none" | "file" | "webdav" | "gdrive";

const CFG_KEY = "fv:sync:cfg-v1";
const SECRETS_KEY = "fv:sync:secrets-v1";
const STATE_KEY = "fv:sync:state-v1";

export interface PublicConfig {
  provider: SyncProvider;
  webdavUrl?: string;
  webdavUser?: string;
  webdavPath?: string; // ex: /SprintLab/snapshot.slfv
  gdriveClientId?: string;
  gdriveFileName?: string; // ex: sprintlab.slfv
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
  const mk = getMasterKey();
  const blob = (() => { try { return localStorage.getItem(SECRETS_KEY); } catch { return null; } })();
  if (!mk || !blob) return {};
  try { return JSON.parse(await aesDecrypt(mk, blob)) as SecretConfig; }
  catch { return {}; }
}
export async function setSecretConfig(s: SecretConfig): Promise<void> {
  const mk = getMasterKey();
  if (!mk) throw new Error("Application verrouillée.");
  const blob = await aesEncrypt(mk, JSON.stringify(s));
  try { localStorage.setItem(SECRETS_KEY, blob); } catch { /* */ }
}

export function getSyncState(): SyncState {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") as SyncState; }
  catch { return {}; }
}
export function setSyncState(s: SyncState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* */ }
}
