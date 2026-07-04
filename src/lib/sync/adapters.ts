/**
 * Adaptateurs de sync natifs :
 *   - fileAdapter   : téléchargement/upload d'un fichier .slfv (fallback universel).
 *   - icloudAdapter : iOS/iPadOS → utilise l'app Fichiers (iCloud Drive) via
 *     un download (« Enregistrer dans Fichiers ») et un <input type=file>.
 *   - gdriveAdapter : OAuth Google natif, dossier appData privé de l'app.
 */
import { getPublicConfig, getSecretConfig, setSecretConfig, managedGoogleClientId } from "./config";

export interface SyncAdapter {
  id: string;
  label: string;
  push(blob: Blob): Promise<void>;
  pull(): Promise<Blob | null>;
}

function fileNameOf(): string {
  return (getPublicConfig().fileName || "sprintlab.slfv").trim() || "sprintlab.slfv";
}

// ---------- Fichier local (download/upload) ----------
export const fileAdapter: SyncAdapter = {
  id: "file",
  label: "Fichier .slfv",
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

// ---------- iCloud Drive (iOS) ----------
// Aucune API navigateur → on passe par l'app Fichiers d'iOS. Le download
// affiche « Enregistrer dans Fichiers » avec iCloud Drive proposé par défaut.
export const icloudAdapter: SyncAdapter = {
  id: "icloud",
  label: "iCloud Drive",
  async push(blob) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fileNameOf();
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

// ---------- Google Drive (OAuth natif, Client ID managé) ----------
const GIS_SRC = "https://accounts.google.com/gsi/client";
function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { google?: { accounts?: { oauth2?: unknown } } }).google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Impossible de charger Google Identity Services."));
    document.head.appendChild(s);
  });
}
async function gdriveToken(force = false): Promise<string> {
  const clientId = managedGoogleClientId();
  const s = await getSecretConfig();
  const now = Date.now();
  if (!force && s.gdriveAccessToken && (s.gdriveTokenExpiresAt ?? 0) > now + 30_000) {
    return s.gdriveAccessToken;
  }
  if (!clientId) throw new Error("Google Drive n'est pas configuré sur cette build.");
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    try {
      const client = (window as unknown as { google: { accounts: { oauth2: { initTokenClient: (o: unknown) => { requestAccessToken: (o: unknown) => void } } } } })
        .google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.appdata",
          prompt: "",
          callback: async (resp: { error?: string; access_token?: string; expires_in?: number }) => {
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
  label: "Google Drive",
  async push(blob) {
    const name = fileNameOf();
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
    const name = fileNameOf();
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
  if (id === "icloud") return icloudAdapter;
  if (id === "gdrive") return gdriveAdapter;
  return null;
}
