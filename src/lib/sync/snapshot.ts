/**
 * Sync snapshot — collecte/restaure les données utilisateur persistées via
 * `src/lib/db/kvStore.ts` (IndexedDB) sous forme d'un blob JSON en clair.
 *
 * Politique de merge : LWW (Last-Write-Wins) par entité quand un `createdAt`
 * existe, sinon le snapshot le plus récent (au niveau du fichier) gagne.
 */

import { kvGet, kvKeys, kvSet } from "@/lib/db/kvStore";

const DATA_PREFIXES = ["slfv:", "fv:"];
// Clés à NE PAS exporter (device-local uniquement).
// `slfv:offline-auth` contient les vérificateurs PBKDF2 des mots de passe et
// `slfv:entitlements` le cache d'abonnement : ni l'un ni l'autre ne doit
// quitter l'appareil ni voyager vers un autre poste.
const EXCLUDED_KEYS = new Set([
  "fv:ai-key:v2",
  "fv:sync:secrets-v1",
  "fv:sync:state-v1",
  "slfv:session",
  "slfv:profile-ready",
  "slfv:offline-auth",
  "slfv:entitlements",
  "slfv:auto-restore-done",
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
  for (const k of kvKeys()) {
    if (EXCLUDED_KEYS.has(k)) continue;
    if (!DATA_PREFIXES.some((p) => k.startsWith(p))) continue;
    out[k] = kvGet(k);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeArrays(local: any[], remote: any[]): any[] {
  if (!Array.isArray(local)) return remote;
  if (!Array.isArray(remote)) return local;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      try { kvSet(k, incoming ?? null); } catch { /* */ }
      added++;
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const local: any[] = Array.isArray(kvGet(k)) ? (kvGet(k) as any[]) : [];
    const remote = Array.isArray(incoming) ? incoming : [];
    const before = local.length;
    const merged = mergeArrays(local, remote);
    try { kvSet(k, merged); } catch { /* */ }
    if (merged.length > before) added += merged.length - before;
    updated += Math.max(0, remote.length - (merged.length - before));
  }
  return { added, updated, totalKeys: keys.length };
}

// ---------- Snapshot envelope (JSON plain) ----------
const LEGACY_HEADER = "SLFV1";

export async function snapshotToBlob(snap: SnapshotV1): Promise<Blob> {
  const json = JSON.stringify(snap);
  return new Blob([json], { type: "application/json" });
}

export async function blobToSnapshot(blob: Blob): Promise<SnapshotV1> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  // Reject legacy encrypted files gracefully
  if (buf.length > LEGACY_HEADER.length) {
    const head = new TextDecoder().decode(buf.slice(0, LEGACY_HEADER.length));
    if (head === LEGACY_HEADER) {
      throw new Error("Snapshot chiffré legacy non supporté (chiffrement retiré).");
    }
  }
  try {
    const json = new TextDecoder().decode(buf);
    return JSON.parse(json) as SnapshotV1;
  } catch {
    throw new Error("Fichier snapshot illisible.");
  }
}
