/**
 * Unified test list: merges legacy sprint tests (storage.ts) and
 * new jump/sprint tests stored via localHistory.
 */
import { listTests, getPlayer } from "./storage";
import { getLocalTests, type LocalTest } from "./localHistory";
import type { JumpResults, SprintResults } from "./fvCalculations";

export interface UnifiedTest {
  id: string;
  source: "legacy" | "local";
  type: "jump" | "sprint";
  createdAt: number;
  playerId: string;
  playerName: string;
  // headline metrics for list rows
  primary: string; // e.g. "Vmax 8.32 m/s"
  secondary: string; // e.g. "Pmax 850 W"
}

function fromLegacy(orgId: string, playerId?: string): UnifiedTest[] {
  return listTests(playerId, orgId).map((t) => {
    const p = getPlayer(t.playerId);
    return {
      id: t.id,
      source: "legacy",
      type: "sprint",
      createdAt: t.createdAt,
      playerId: t.playerId,
      playerName: p ? `${p.firstName} ${p.lastName}` : "Unknown player",
      primary: `Vmax ${t.analysis.vmax.toFixed(2)} m/s`,
      secondary: `Pmax ${t.analysis.fv.Pmax.toFixed(0)} W`,
    };
  });
}

function fromLocal(playerId?: string): UnifiedTest[] {
  return getLocalTests()
    .filter((t) => (playerId ? t.athlete_id === playerId : true))
    .map((t) => unifyLocal(t));
}

function unifyLocal(t: LocalTest): UnifiedTest {
  const name = `${t.athlete_snapshot.first_name} ${t.athlete_snapshot.last_name}`.trim() || "Athlete";
  if (t.type === "jump") {
    const r = t.results as JumpResults;
    return {
      id: t.id, source: "local", type: "jump",
      createdAt: new Date(t.test_date).getTime() || Date.now(),
      playerId: t.athlete_id, playerName: name,
      primary: `F0 ${r.F0.toFixed(2)} N/kg · V0 ${r.V0.toFixed(2)} m/s`,
      secondary: `Pmax ${r.Pmax.toFixed(1)} W/kg`,
    };
  }
  const r = t.results as SprintResults;
  return {
    id: t.id, source: "local", type: "sprint",
    createdAt: new Date(t.test_date).getTime() || Date.now(),
    playerId: t.athlete_id, playerName: name,
    primary: `Vmax ${r.Vmax.toFixed(2)} m/s · F0 ${r.F0.toFixed(2)} N/kg`,
    secondary: `Pmax ${r.Pmax.toFixed(1)} W/kg`,
  };
}

export function listUnifiedTests(orgId: string, playerId?: string): UnifiedTest[] {
  return [...fromLegacy(orgId, playerId), ...fromLocal(playerId)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}
