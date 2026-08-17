/**
 * Restauration automatique après changement d'appareil.
 *
 * Se déclenche uniquement quand l'appareil est **vide** : si des équipes, des
 * athlètes ou des tests existent déjà en local, on ne touche à rien. Le seul
 * scénario visé est « je me reconnecte sur un nouveau téléphone ».
 *
 * Le push, lui, reste manuel (boutons Envoyer / Synchroniser).
 */

import { kvGet, kvSet } from "@/lib/db/kvStore";
import { isOnline } from "@/lib/supabase/client";
import { supabaseAdapter } from "./adapters";
import { applySnapshot, blobToSnapshot, type MergeReport } from "./snapshot";
import { getPublicConfig, setPublicConfig, setSyncState, getSyncState } from "./config";

const DONE_KEY = "slfv:auto-restore-done";

export type AutoRestoreOutcome =
  | { status: "skipped"; reason: "offline" | "has-local-data" | "already-done" }
  | { status: "empty" }
  | { status: "restored"; report: MergeReport }
  | { status: "failed"; error: string };

/** True quand aucune donnée métier n'est présente sur l'appareil. */
export function deviceHasLocalData(): boolean {
  for (const key of ["slfv:teams", "slfv:players", "slfv:tests"]) {
    const value = kvGet<unknown[]>(key);
    if (Array.isArray(value) && value.length > 0) return true;
  }
  return false;
}

function alreadyRestoredFor(userId: string): boolean {
  return kvGet<string>(DONE_KEY) === userId;
}

function markRestored(userId: string) {
  kvSet(DONE_KEY, userId);
}

/**
 * Tente de récupérer la sauvegarde du compte. Sans objet distant (première
 * utilisation) on ne signale rien à l'utilisateur.
 */
export async function maybeAutoRestore(userId: string): Promise<AutoRestoreOutcome> {
  if (alreadyRestoredFor(userId)) return { status: "skipped", reason: "already-done" };
  if (!isOnline()) return { status: "skipped", reason: "offline" };
  if (deviceHasLocalData()) {
    // Rien à restaurer, mais inutile de retenter à chaque ouverture.
    markRestored(userId);
    return { status: "skipped", reason: "has-local-data" };
  }

  try {
    const blob = await supabaseAdapter.pull();
    if (!blob) {
      markRestored(userId);
      return { status: "empty" };
    }

    const report = applySnapshot(await blobToSnapshot(blob), "merge");
    markRestored(userId);

    // L'appareil vient de récupérer ses données : on active la sauvegarde sur
    // le compte pour que les prochains envois partent au bon endroit.
    if (getPublicConfig().provider === "none") {
      setPublicConfig({ provider: "supabase", fileName: "pocketlab.slfv", linked: true });
    }
    setSyncState({ ...getSyncState(), lastSyncAt: Date.now(), lastDirection: "pull", lastError: undefined });

    return { status: "restored", report };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // Pas de `markRestored` : un échec réseau doit pouvoir se rejouer.
    return { status: "failed", error };
  }
}

/** Permet de rejouer une restauration (ex. après déconnexion du cloud). */
export function resetAutoRestoreMarker(): void {
  kvSet(DONE_KEY, null);
}
