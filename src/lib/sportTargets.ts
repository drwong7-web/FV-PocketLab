/**
 * Sport-specific F-V profile reference targets.
 *
 * Values derived/aggregated from:
 * - Jiménez-Reyes P. et al. (2017) "Effectiveness of an individualized training based
 *   on F-V imbalance profile in jumping". Frontiers in Physiology.
 * - Jiménez-Reyes P. et al. (2019) "Differences in F-V profile between sprinters and
 *   athletes from team sports". J. Strength Cond. Res.
 * - Cross M.R. et al. (2017) "Mechanical properties of sprinting in elite rugby
 *   union and rugby league". IJSPP.
 * - Morin J-B., Samozino P. (2016) "Interpreting power-force-velocity profiles".
 *
 * Units:
 *  - jump:  F0 in N/kg, V0 in m/s, Pmax in W/kg
 *  - sprint: F0 in N/kg, V0 in m/s, Pmax in W/kg
 *
 * Targets are typical optimal medians for trained athletes of each sport.
 * They are indicative, not normative.
 */

export interface FVTarget {
  F0: number;
  V0: number;
  Pmax: number;
  /** Half-range used to draw the target zone on the chart. */
  F0Range: number;
  V0Range: number;
}

export interface SportTargets {
  jump?: FVTarget;
  sprint?: FVTarget;
  label: string;
}

const SPORT_TARGETS: Record<string, SportTargets> = {
  football: {
    label: "Football",
    jump:   { F0: 32, V0: 3.6, Pmax: 28, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 7.5, V0: 9.5, Pmax: 18, F0Range: 0.8, V0Range: 0.6 },
  },
  rugby: {
    label: "Rugby",
    jump:   { F0: 35, V0: 3.4, Pmax: 30, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 8.2, V0: 9.8, Pmax: 20, F0Range: 0.9, V0Range: 0.6 },
  },
  basketball: {
    label: "Basketball",
    jump:   { F0: 33, V0: 3.7, Pmax: 30, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 7.3, V0: 9.2, Pmax: 17, F0Range: 0.8, V0Range: 0.6 },
  },
  handball: {
    label: "Handball",
    jump:   { F0: 32, V0: 3.6, Pmax: 28, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 7.4, V0: 9.3, Pmax: 17, F0Range: 0.8, V0Range: 0.6 },
  },
  volleyball: {
    label: "Volleyball",
    jump:   { F0: 34, V0: 3.8, Pmax: 32, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 7.0, V0: 8.8, Pmax: 15, F0Range: 0.8, V0Range: 0.6 },
  },
  sprint: {
    label: "Sprint (athlétisme)",
    jump:   { F0: 35, V0: 4.0, Pmax: 35, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 8.5, V0: 10.5, Pmax: 22, F0Range: 0.9, V0Range: 0.6 },
  },
  athletisme: {
    label: "Athlétisme",
    jump:   { F0: 33, V0: 3.9, Pmax: 32, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 8.0, V0: 10.0, Pmax: 20, F0Range: 0.9, V0Range: 0.6 },
  },
  cyclisme: {
    label: "Cyclisme",
    jump:   { F0: 30, V0: 3.4, Pmax: 25, F0Range: 3, V0Range: 0.4 },
    sprint: { F0: 6.5, V0: 8.5, Pmax: 14, F0Range: 0.7, V0Range: 0.5 },
  },
  default: {
    label: "Athlète polyvalent",
    jump:   { F0: 30, V0: 3.5, Pmax: 26, F0Range: 4, V0Range: 0.5 },
    sprint: { F0: 7.0, V0: 9.0, Pmax: 16, F0Range: 1.0, V0Range: 0.7 },
  },
};

function normalize(sport?: string | null): string {
  if (!sport) return "default";
  const s = sport
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (s.includes("foot")) return "football";
  if (s.includes("rugby")) return "rugby";
  if (s.includes("basket")) return "basketball";
  if (s.includes("hand")) return "handball";
  if (s.includes("volley")) return "volleyball";
  if (s.includes("sprint") || s === "100m" || s === "200m") return "sprint";
  if (s.includes("athle")) return "athletisme";
  if (s.includes("cycl") || s.includes("velo")) return "cyclisme";
  return "default";
}

export function getSportTargets(sport?: string | null): SportTargets {
  return SPORT_TARGETS[normalize(sport)] ?? SPORT_TARGETS.default;
}

export function getJumpTarget(sport?: string | null): FVTarget | undefined {
  return getSportTargets(sport).jump;
}

export function getSprintTarget(sport?: string | null): FVTarget | undefined {
  return getSportTargets(sport).sprint;
}
