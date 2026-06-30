/**
 * Sync snapshot — collecte/restaure les données utilisateur (localStorage
 * namespacé) sous forme d'un blob JSON chiffré (AES-GCM via master key).
 *
 * Politique de merge : LWW (Last-Write-Wins) par entité quand un `createdAt`
 * existe, sinon le snapshot le plus récent (au niveau du fichier) gagne.
 */
import { aesDecrypt, aesEncrypt, getMasterKey } from "@/lib/deviceAuth";

const DATA_PREFIXES = ["slfv:", "fv:"];
// Clés à NE PAS exporter (secrets/device-local)
const EXCLUDED_KEYS = new Set([
  "fv:auth:salt",
  "fv:auth:verifier",
  "fv:auth:passkey-cred",
  "fv:auth:passkey-wrap",
  "fv:auth:passkey-blob",
  "fv:auth:autolock-min",
  "fv:ai-key:v2",
  "slfv:session",
]);

const MERGEABLE_COLLECTIONS: Record<string, "id" | "createdAt"> = {
  "slfv:teams": "createdAt",
  "slfv:players": "createdAt",
  "slfv:tests": "createdAt",
  "slfv:orgs": "id",
  "slfv:users": "id",
};

export interface SnapshotV1 {
  v: 1;
  app: "sprintlab-fv-pro";
  createdAt: number;
  device?: string;
  data: Record<string, unknown>;
}

function collect(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (EXCLUDED_KEYS.has(k)) continue;
    if (!DATA_PREFIXES.some((p) => k.startsWith(p))) continue;
    try { out[k] = JSON.parse(localStorage.getItem(k) || "null"); }
    catch { out[k] = localStorage.getItem(k); }
  }
  return out;
}

export function buildSnapshot(): SnapshotV1 {
  return {
    v: 1,
    app: "sprintlab-fv-pro",
    createdAt: Date.now(),
    device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined,
    data: collect(),
  };
}

function mergeArrays(local: any[], remote: any[]): any[] {
  if (!Array.isArray(local)) return remote;
  if (!Array.isArray(remote)) return local;
  const byId = new Map<string, any>();
  for (const it of local) if (it?.id) byId.set(it.id, it);
  for (const r of remote) {
    if (!r?.id) continue;
    const existing = byId.get(r.id);
    if (!existing) { byId.set(r.id, r); continue; }
    const ta = Number(existing.createdAt ?? 0);
    const tb = Number(r.createdAt ?? 0);
    byId.set(r.id, tb >= ta ? r : existing);
  }
  return Array.from(byId.values());
}

export interface MergeReport {
  added: number;
  updated: number;
  totalKeys: number;
}

export function applySnapshot(snap: SnapshotV1, mode: "merge" | "replace" = "merge"): MergeReport {
  if (snap.v !== 1 || snap.app !== "sprintlab-fv-pro") {
    throw new Error("Snapshot incompatible.");
  }
  let added = 0, updated = 0;
  const keys = Object.keys(snap.data ?? {});
  for (const k of keys) {
    if (EXCLUDED_KEYS.has(k)) continue;
    const incoming = snap.data[k];
    if (mode === "replace" || !(k in MERGEABLE_COLLECTIONS)) {
      try { localStorage.setItem(k, JSON.stringify(incoming ?? null)); } catch { /* */ }
      added++;
      continue;
    }
    // merge by id with LWW
    let local: any[] = [];
    try { local = JSON.parse(localStorage.getItem(k) || "[]"); } catch { local = []; }
    const remote = Array.isArray(incoming) ? incoming : [];
    const before = local.length;
    const merged = mergeArrays(local, remote);
    try { localStorage.setItem(k, JSON.stringify(merged)); } catch { /* */ }
    if (merged.length > before) added += merged.length - before;
    updated += Math.max(0, remote.length - (merged.length - before));
  }
  return { added, updated, totalKeys: keys.length };
}

// ---------- Encryption envelope ----------
const HEADER = "SLFV1"; // magic
const HEADER_BYTES = new TextEncoder().encode(HEADER);

export async function encryptSnapshotJson(snap: SnapshotV1): Promise<Blob> {
  const mk = getMasterKey();
  if (!mk) throw new Error("Application verrouillée.");
  const json = JSON.stringify(snap);
  const payload = await aesEncrypt(mk, json); // "iv:ct" base64
  const body = new TextEncoder().encode(payload);
  return new Blob([HEADER_BYTES, body], { type: "application/octet-stream" });
}

export async function decryptSnapshotBlob(blob: Blob): Promise<SnapshotV1> {
  const mk = getMasterKey();
  if (!mk) throw new Error("Application verrouillée.");
  const buf = new Uint8Array(await blob.arrayBuffer());
  // Cas chiffré
  if (buf.length > HEADER_BYTES.length) {
    const head = new TextDecoder().decode(buf.slice(0, HEADER_BYTES.length));
    if (head === HEADER) {
      const payload = new TextDecoder().decode(buf.slice(HEADER_BYTES.length));
      const json = await aesDecrypt(mk, payload);
      return JSON.parse(json) as SnapshotV1;
    }
  }
  // Cas JSON brut (import manuel)
  try {
    const json = new TextDecoder().decode(buf);
    return JSON.parse(json) as SnapshotV1;
  } catch {
    throw new Error("Fichier illisible ou clé incorrecte.");
  }
}
