/**
 * Adaptateurs BYOC.
 * Chaque adaptateur expose simplement push(blob) / pull() → Blob | null.
 * Le blob est toujours le snapshot chiffré (cf. snapshot.ts).
 */
import { getPublicConfig, getSecretConfig, setSecretConfig } from "./config";

export interface SyncAdapter {
  id: string;
  label: string;
  push(blob: Blob): Promise<void>;
  pull(): Promise<Blob | null>;
}

// ---------- Local file (download/upload) ----------
export const fileAdapter: SyncAdapter = {
  id: "file",
  label: "Fichier local (.slfv)",
  async push(blob) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `sprintlab-${new Date().toISOString().slice(0, 10)}.slfv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  async pull() {
    return new Promise<Blob | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".slfv,application/octet-stream,application/json";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  },
};

// ---------- WebDAV ----------
function webdavUrl(): { url: string; user: string; path: string } {
  const cfg = getPublicConfig();
  if (!cfg.webdavUrl) throw new Error("URL WebDAV manquante.");
  const path = cfg.webdavPath?.trim() || "/SprintLab/snapshot.slfv";
  const base = cfg.webdavUrl.replace(/\/+$/, "");
  const target = base + (path.startsWith("/") ? path : `/${path}`);
  return { url: target, user: cfg.webdavUser || "", path };
}
async function webdavAuthHeader(): Promise<string> {
  const cfg = getPublicConfig();
  const s = await getSecretConfig();
  if (!cfg.webdavUser || !s.webdavPassword) throw new Error("Identifiants WebDAV manquants.");
  return "Basic " + btoa(`${cfg.webdavUser}:${s.webdavPassword}`);
}
async function webdavMkcol(url: string, auth: string) {
  // Création récursive du dossier parent (idempotent)
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  parts.pop(); // retire le filename
  let acc = "";
  for (const p of parts) {
    acc += `/${p}`;
    try {
      await fetch(`${u.origin}${acc}`, { method: "MKCOL", headers: { Authorization: auth } });
    } catch { /* ignore */ }
  }
}
export const webdavAdapter: SyncAdapter = {
  id: "webdav",
  label: "WebDAV (Nextcloud, ownCloud, …)",
  async push(blob) {
    const { url } = webdavUrl();
    const auth = await webdavAuthHeader();
    await webdavMkcol(url, auth);
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/octet-stream" },
      body: blob,
    });
    if (!res.ok) throw new Error(`WebDAV PUT ${res.status}`);
  },
  async pull() {
    const { url } = webdavUrl();
    const auth = await webdavAuthHeader();
    const res = await fetch(url, { method: "GET", headers: { Authorization: auth } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`WebDAV GET ${res.status}`);
    return await res.blob();
  },
};

// ---------- Google Drive (PKCE-free token client via GIS) ----------
const GIS_SRC = "https://accounts.google.com/gsi/client";
function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Impossible de charger Google Identity Services."));
    document.head.appendChild(s);
  });
}
async function gdriveToken(force = false): Promise<string> {
  const cfg = getPublicConfig();
  const s = await getSecretConfig();
  const now = Date.now();
  if (!force && s.gdriveAccessToken && (s.gdriveTokenExpiresAt ?? 0) > now + 30_000) {
    return s.gdriveAccessToken;
  }
  if (!cfg.gdriveClientId) throw new Error("Client ID Google manquant.");
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: cfg.gdriveClientId,
        scope: "https://www.googleapis.com/auth/drive.appdata",
        prompt: "",
        callback: async (resp: any) => {
          if (resp?.error) return reject(new Error(`OAuth Google : ${resp.error}`));
          const token = resp.access_token as string;
          const exp = now + Math.max(0, Number(resp.expires_in || 0) - 30) * 1000;
          await setSecretConfig({ ...(await getSecretConfig()), gdriveAccessToken: token, gdriveTokenExpiresAt: exp });
          resolve(token);
        },
      });
      client.requestAccessToken({ prompt: s.gdriveAccessToken ? "" : "consent" });
    } catch (e) { reject(e as Error); }
  });
}
async function gdriveFindFile(token: string, name: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Drive list ${res.status}`);
  const json = await res.json();
  return json?.files?.[0]?.id ?? null;
}
export const gdriveAdapter: SyncAdapter = {
  id: "gdrive",
  label: "Google Drive (appData)",
  async push(blob) {
    const cfg = getPublicConfig();
    const name = cfg.gdriveFileName || "sprintlab.slfv";
    const token = await gdriveToken();
    const existing = await gdriveFindFile(token, name);
    const metadata = existing ? {} : { name, parents: ["appDataFolder"] };
    const boundary = "slfv" + Math.random().toString(36).slice(2);
    const meta = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const head = `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;
    const body = new Blob([meta, head, blob, tail], { type: `multipart/related; boundary=${boundary}` });
    const url = existing
      ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const res = await fetch(url, {
      method: existing ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error(`Drive upload ${res.status}`);
  },
  async pull() {
    const cfg = getPublicConfig();
    const name = cfg.gdriveFileName || "sprintlab.slfv";
    const token = await gdriveToken();
    const id = await gdriveFindFile(token, name);
    if (!id) return null;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Drive get ${res.status}`);
    return await res.blob();
  },
};

export function getAdapter(id: string): SyncAdapter | null {
  if (id === "file") return fileAdapter;
  if (id === "webdav") return webdavAdapter;
  if (id === "gdrive") return gdriveAdapter;
  return null;
}
