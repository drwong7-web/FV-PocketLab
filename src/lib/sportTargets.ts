/**
 * Sport-specific F-V profile reference targets.
 *
 * Values derived/aggregated from:
 * - Jiménez-Reyes P. et al. (2017, 2019) — Frontiers in Physiology, JSCR
 * - Cross M.R. et al. (2017) — IJSPP (rugby)
 * - Morin J-B., Samozino P. (2016) — IJSPP (interpretation of P-F-V profiles)
 * - Samozino P. et al. (2016) — sprint mechanics
 * - Haugen T. et al. (2019) — sprint mechanics team sports
 * - Slawinski J. et al. (2017) — elite sprinters biomechanics
 * - Giroux C. et al. (2016) — track cycling
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
  /** i18n key used to render the localized sport label. */
  labelKey: string;
  /** Legacy fallback label (French). */
  label: string;
}

/** Canonical sport keys stored on `team.sport`. */
export type SportKey =
  | "football"
  | "rugby"
  | "basketball"
  | "handball"
  | "volleyball"
  | "hockey"
  | "sprint_100_200"
  | "sprint_400"
  | "middle_distance"
  | "long_distance"
  | "long_jump"
  | "high_jump"
  | "triple_jump"
  | "cycling_track"
  | "tennis"
  | "ski_alpin"
  | "other";

const SPORT_TARGETS: Record<SportKey, SportTargets> = {
  // Team sports
  football: {
    label: "Football", labelKey: "sportFootball",
    jump:   { F0: 32, V0: 3.6, Pmax: 28, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.5, V0: 9.5, Pmax: 18, F0Range: 0.8, V0Range: 0.6 },
  },
  rugby: {
    label: "Rugby", labelKey: "sportRugby",
    jump:   { F0: 35, V0: 3.4, Pmax: 30, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 8.2, V0: 9.8, Pmax: 20, F0Range: 0.9, V0Range: 0.6 },
  },
  basketball: {
    label: "Basketball", labelKey: "sportBasketball",
    jump:   { F0: 33, V0: 3.7, Pmax: 30, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.3, V0: 9.2, Pmax: 17, F0Range: 0.8, V0Range: 0.6 },
  },
  handball: {
    label: "Handball", labelKey: "sportHandball",
    jump:   { F0: 32, V0: 3.6, Pmax: 28, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.4, V0: 9.3, Pmax: 17, F0Range: 0.8, V0Range: 0.6 },
  },
  volleyball: {
    label: "Volleyball", labelKey: "sportVolleyball",
    jump:   { F0: 34, V0: 3.8, Pmax: 32, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.0, V0: 8.8, Pmax: 15, F0Range: 0.8, V0Range: 0.6 },
  },
  hockey: {
    label: "Hockey", labelKey: "sportHockey",
    jump:   { F0: 31, V0: 3.5, Pmax: 27, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.2, V0: 9.0, Pmax: 16, F0Range: 0.8, V0Range: 0.6 },
  },

  // Athletics
  sprint_100_200: {
    label: "Sprint (100/200 m)", labelKey: "sportSprint100200",
    jump:   { F0: 35, V0: 4.0, Pmax: 35, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 8.5, V0: 10.5, Pmax: 22, F0Range: 0.7, V0Range: 0.5 },
  },
  sprint_400: {
    label: "400 m", labelKey: "sport400m",
    jump:   { F0: 32, V0: 3.8, Pmax: 30, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 7.8, V0: 10.0, Pmax: 19, F0Range: 0.7, V0Range: 0.5 },
  },
  middle_distance: {
    label: "Demi-fond", labelKey: "sportMiddleDistance",
    jump:   { F0: 26, V0: 3.4, Pmax: 22, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 6.5, V0: 9.0, Pmax: 14, F0Range: 0.7, V0Range: 0.5 },
  },
  long_distance: {
    label: "Fond", labelKey: "sportLongDistance",
    jump:   { F0: 22, V0: 3.2, Pmax: 18, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 5.5, V0: 8.2, Pmax: 11, F0Range: 0.7, V0Range: 0.5 },
  },
  long_jump: {
    label: "Saut en longueur", labelKey: "sportLongJump",
    jump:   { F0: 34, V0: 4.0, Pmax: 34, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 8.3, V0: 10.3, Pmax: 21, F0Range: 0.7, V0Range: 0.5 },
  },
  high_jump: {
    label: "Saut en hauteur", labelKey: "sportHighJump",
    jump:   { F0: 36, V0: 3.9, Pmax: 35, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 7.8, V0: 9.5, Pmax: 18, F0Range: 0.7, V0Range: 0.5 },
  },
  triple_jump: {
    label: "Triple saut", labelKey: "sportTripleJump",
    jump:   { F0: 35, V0: 3.9, Pmax: 34, F0Range: 2.5, V0Range: 0.3 },
    sprint: { F0: 8.2, V0: 10.2, Pmax: 20, F0Range: 0.7, V0Range: 0.5 },
  },

  // Other F-V relevant sports
  cycling_track: {
    label: "Cyclisme sur piste", labelKey: "sportCyclingTrack",
    jump:   { F0: 32, V0: 3.6, Pmax: 29, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.0, V0: 9.0, Pmax: 17, F0Range: 0.8, V0Range: 0.6 },
  },
  tennis: {
    label: "Tennis", labelKey: "sportTennis",
    jump:   { F0: 30, V0: 3.5, Pmax: 26, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.0, V0: 9.0, Pmax: 16, F0Range: 0.8, V0Range: 0.6 },
  },
  ski_alpin: {
    label: "Ski alpin", labelKey: "sportSkiAlpin",
    jump:   { F0: 33, V0: 3.4, Pmax: 28, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 7.2, V0: 8.8, Pmax: 16, F0Range: 0.8, V0Range: 0.6 },
  },

  // Fallback balanced profile
  other: {
    label: "Autre", labelKey: "sportOther",
    jump:   { F0: 28, V0: 3.5, Pmax: 24, F0Range: 3,   V0Range: 0.4 },
    sprint: { F0: 6.8, V0: 8.8, Pmax: 15, F0Range: 0.8, V0Range: 0.6 },
  },
};

/** Ordered sport groups used to build the selection UI. */
export const SPORT_GROUPS: {
  key: "team" | "athletics" | "other_sports" | "fallback";
  items: SportKey[];
}[] = [
  { key: "team",         items: ["football", "rugby", "basketball", "handball", "volleyball", "hockey"] },
  { key: "athletics",    items: ["sprint_100_200", "sprint_400", "middle_distance", "long_distance", "long_jump", "high_jump", "triple_jump"] },
  { key: "other_sports", items: ["cycling_track", "tennis", "ski_alpin"] },
  { key: "fallback",     items: ["other"] },
];

function normalize(sport?: string | null): SportKey | null {
  if (!sport) return null;
  const raw = sport.trim();
  // Direct canonical key match
  if (raw in SPORT_TARGETS) return raw as SportKey;

  const s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (s in SPORT_TARGETS) return s as SportKey;

  // Legacy free-text mapping
  if (s.includes("foot")) return "football";
  if (s.includes("rugby")) return "rugby";
  if (s.includes("basket")) return "basketball";
  if (s.includes("hand")) return "handball";
  if (s.includes("volley")) return "volleyball";
  if (s.includes("hockey")) return "hockey";
  if (s.includes("tennis")) return "tennis";
  if (s.includes("ski")) return "ski_alpin";
  if (s.includes("cycl") || s.includes("velo") || s.includes("bike")) return "cycling_track";
  if (s === "100m" || s === "200m" || s.includes("sprint")) return "sprint_100_200";
  if (s === "400m" || s.includes("400")) return "sprint_400";
  if (s.includes("demi") || s.includes("middle") || s.includes("800") || s.includes("1500")) return "middle_distance";
  if (s.includes("fond") || s.includes("long dist") || s.includes("marathon") || s.includes("5000") || s.includes("10000")) return "long_distance";
  if (s.includes("longueur") || s.includes("long jump")) return "long_jump";
  if (s.includes("hauteur") || s.includes("high jump")) return "high_jump";
  if (s.includes("triple")) return "triple_jump";
  if (s.includes("athle")) return "sprint_100_200";
  return null;
}

export function getSportTargets(sport?: string | null): SportTargets | undefined {
  const key = normalize(sport);
  return key ? SPORT_TARGETS[key] : undefined;
}

export function getJumpTarget(sport?: string | null): FVTarget | undefined {
  return getSportTargets(sport)?.jump;
}

export function getSprintTarget(sport?: string | null): FVTarget | undefined {
  return getSportTargets(sport)?.sprint;
}

/** Resolves the display label for a stored sport value, translating when possible. */
export function getSportLabel(
  sport: string | null | undefined,
  t?: (k: string) => string,
): string {
  if (!sport) return "";
  const key = normalize(sport);
  if (key) {
    const target = SPORT_TARGETS[key];
    if (t) {
      const translated = t(target.labelKey);
      if (translated && translated !== target.labelKey) return translated;
    }
    return target.label;
  }
  return sport;
}
