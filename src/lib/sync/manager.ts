/**
 * Sync manager — orchestre push / pull / sync (les deux) selon le provider
 * configuré et met à jour l'état de sync persistant.
 */
import { buildSnapshot, decryptSnapshotBlob, encryptSnapshotJson, applySnapshot, type MergeReport } from "./snapshot";
import { getPublicConfig, getSyncState, setSyncState } from "./config";
import { getAdapter } from "./adapters";

export interface SyncResult {
  ok: boolean;
  direction: "push" | "pull" | "both";
  pulled?: MergeReport;
  pushed?: boolean;
  error?: string;
}

async function adapterOrThrow() {
  const cfg = getPublicConfig();
  if (cfg.provider === "none") throw new Error("Aucun provider sync configuré.");
  const adapter = getAdapter(cfg.provider);
  if (!adapter) throw new Error("Provider sync inconnu.");
  return adapter;
}

export async function syncPushNow(): Promise<SyncResult> {
  try {
    const adapter = await adapterOrThrow();
    const blob = await encryptSnapshotJson(buildSnapshot());
    await adapter.push(blob);
    setSyncState({ ...getSyncState(), lastSyncAt: Date.now(), lastDirection: "push", lastError: undefined });
    return { ok: true, direction: "push", pushed: true };
  } catch (e) {
    const msg = (e as Error).message;
    setSyncState({ ...getSyncState(), lastError: msg });
    return { ok: false, direction: "push", error: msg };
  }
}

export async function syncPullNow(mode: "merge" | "replace" = "merge"): Promise<SyncResult> {
  try {
    const adapter = await adapterOrThrow();
    const blob = await adapter.pull();
    if (!blob) return { ok: true, direction: "pull", pulled: { added: 0, updated: 0, totalKeys: 0 } };
    const snap = await decryptSnapshotBlob(blob);
    const report = applySnapshot(snap, mode);
    setSyncState({ ...getSyncState(), lastSyncAt: Date.now(), lastDirection: "pull", lastError: undefined });
    return { ok: true, direction: "pull", pulled: report };
  } catch (e) {
    const msg = (e as Error).message;
    setSyncState({ ...getSyncState(), lastError: msg });
    return { ok: false, direction: "pull", error: msg };
  }
}

/** Pull (merge) puis push — idéal pour "Sync now" bi-directionnel. */
export async function syncBothNow(): Promise<SyncResult> {
  const pull = await syncPullNow("merge");
  if (!pull.ok) return { ...pull, direction: "both" };
  const push = await syncPushNow();
  if (!push.ok) return { ...push, direction: "both" };
  setSyncState({ ...getSyncState(), lastSyncAt: Date.now(), lastDirection: "both", lastError: undefined });
  return { ok: true, direction: "both", pulled: pull.pulled, pushed: true };
}
