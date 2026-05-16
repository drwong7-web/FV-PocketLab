/**
 * Force-Velocity profile calculations
 * Based on Samozino et al. (vertical jump) and Morin & Samozino (sprint)
 */

const G = 9.81;

// ============================================================
// VERTICAL JUMP METHOD (Samozino et al., 2008)
// ============================================================

export interface JumpTrial {
  load: number; // additional load in kg
  jumpHeight: number; // jump height in meters
}

export interface JumpInputs {
  bodyMass: number;
  pushOffDistance: number;
  trials: JumpTrial[];
}

export interface FVPoint {
  force: number;
  velocity: number;
  load?: number;
}

export interface JumpResults {
  points: FVPoint[];
  /** Theoretical maximal force (N/kg). */
  F0: number;
  /** Theoretical maximal velocity (m/s). */
  V0: number;
  /** Maximal power output (W/kg). */
  Pmax: number;
  /** Measured F-V slope (N/kg per m/s). */
  slopeFV: number;
  /** Theoretical optimal slope maximizing jump height (Samozino 2012). */
  FVoptimal: number;
  /** Signed F-V imbalance (%) — positive = force deficit, negative = velocity deficit. */
  FVimbalance: number;
  profile: "force_deficit" | "velocity_deficit" | "balanced" | "well_balanced";
  /** R² of the F-V linear regression. */
  r2: number;
  /** Theoretical jump height computed from F0/V0 (m). */
  hMax: number;
  /** Optimal jump height that would be reached with the optimal slope (m). */
  hMaxOptimal: number;
  pushOffDistance: number;
}

export function calculateJumpProfile(inputs: JumpInputs): JumpResults {
  const { bodyMass, pushOffDistance, trials } = inputs;
  const valid = trials.filter((t) => t.jumpHeight > 0 && bodyMass > 0 && pushOffDistance > 0);

  // Samozino 2008: for an additional load ml, force per kg of TOTAL system mass is
  //   F/m_tot = g · (h/hPO + 1)
  // and take-off velocity is v = √(g·h/2). The F0/V0/Pmax are then expressed
  // per kg of TOTAL system mass. We normalize back to body mass for inter-load
  // comparison so all points lie on the SAME F-V line of the lower limbs.
  const points: FVPoint[] = valid.map((t) => {
    const totalMass = bodyMass + (t.load ?? 0);
    const ratio = totalMass / bodyMass;
    const force = G * (t.jumpHeight / pushOffDistance + 1) * ratio;
    const velocity = Math.sqrt((G * t.jumpHeight) / 2);
    return { force, velocity, load: t.load };
  });

  const { intercept: F0, slope: b, r2 } = linearRegression(
    points.map((p) => p.velocity),
    points.map((p) => p.force),
  );

  const slopeFV = b;
  const V0 = -F0 / slopeFV;
  const Pmax = (F0 * V0) / 4;

  const { slope: SFVopt, hMaxOpt } = computeOptimalSlope(Pmax, pushOffDistance);
  // Signed FVimb (Samozino 2014) — sign keeps the deficit direction.
  const FVimbalance = ((slopeFV - SFVopt) / SFVopt) * 100;

  let profile: JumpResults["profile"];
  const absImb = Math.abs(FVimbalance);
  if (absImb < 5) profile = "well_balanced";
  else if (absImb < 10) profile = "balanced";
  else if (slopeFV < SFVopt) profile = "velocity_deficit";
  else profile = "force_deficit";

  // Theoretical jump height from current profile (Samozino simulator):
  //   h = ((V0/2)² · (1 − g/F0)) / (2g)   with F0 in N/kg.
  const hMax = F0 > G ? ((V0 / 2) ** 2 * (1 - G / F0)) / (2 * G) : 0;

  return {
    points,
    F0,
    V0,
    Pmax,
    slopeFV,
    FVoptimal: SFVopt,
    FVimbalance,
    profile,
    r2,
    hMax: Math.max(0, hMax),
    hMaxOptimal: Math.max(0, hMaxOpt),
    pushOffDistance,
  };
}

/**
 * Search the optimal F-V slope that maximizes jump height for a given Pmax,
 * iso-power constraint F0·V0 = 4·Pmax (Samozino 2012).
 */
function computeOptimalSlope(Pmax: number, hPO: number): { slope: number; hMaxOpt: number } {
  void hPO;
  let bestH = -Infinity;
  let bestSlope = -10;
  for (let v0 = 1; v0 <= 6; v0 += 0.005) {
    const f0 = (4 * Pmax) / v0;
    if (f0 <= G) continue;
    const slope = -f0 / v0;
    // Take-off velocity for an unloaded squat-jump (Samozino 2008).
    const vto = (v0 / 2) * Math.sqrt(1 - G / f0);
    if (!isFinite(vto)) continue;
    const h = (vto * vto) / (2 * G);
    if (h > bestH) { bestH = h; bestSlope = slope; }
  }
  return { slope: bestSlope, hMaxOpt: Math.max(0, bestH) };
}

// ============================================================
// SPRINT METHOD (Morin & Samozino, 2016)
// ============================================================

export interface SprintSplit {
  distance: number; // meters
  time: number; // seconds
}

export interface SprintInputs {
  bodyMass: number; // kg
  height: number; // m (athlete height)
  splits: SprintSplit[];
  airTemperature?: number;
  airPressure?: number;
  windSpeed?: number; // m/s (positive = tailwind)
  testDistance?: 30 | 40 | 60;
  startType?: "standing" | "three_point" | "blocks";
  surface?: "track" | "grass" | "synthetic" | "indoor";
  shoes?: string;
  shoeType?: ShoeType;
  notes?: string;
  videoFps?: number;
}

export type SprintPhaseName =
  | "start"
  | "acceleration"
  | "transition"
  | "max_velocity"
  | "deceleration";

export interface SprintPhase {
  name: SprintPhaseName;
  label: string;
  tStart: number;
  tEnd: number;
  dStart: number;
  dEnd: number;
  vMean: number;
}

export interface SprintSeriesPoint {
  t: number;
  x: number;
  v: number;
  a: number;
  F: number;
  P: number;
  RF: number;
}

export interface SprintQualityScore {
  splitCoherenceScore: number;
  modelFitScore: number;
  fpsScore: number;
  globalScore: number;
  message: string;
  warnings: string[];
}

export type SprintInterpretationType =
  | "force_deficit"
  | "velocity_deficit"
  | "power_deficit"
  | "orientation_deficit"
  | "balanced";

export type ShoeType = "spikes" | "cleats" | "sprint";

export const SHOE_LABELS: Record<ShoeType, string> = {
  spikes: "Pointes (sprint spikes)",
  cleats: "Crampons (foot / rugby)",
  sprint: "Chaussures de sprint / training",
};

export const FOOTWEAR_SURFACE_FACTORS: Record<ShoeType, Record<NonNullable<SprintInputs["surface"]>, number>> = {
  spikes: { track: 1.000, synthetic: 1.005, indoor: 1.010, grass: 1.030 },
  cleats: { track: 1.020, synthetic: 1.015, indoor: 1.025, grass: 1.000 },
  sprint: { track: 1.010, synthetic: 1.010, indoor: 1.005, grass: 1.025 },
};

export function getFootwearAdjustment(
  shoeType: ShoeType | undefined,
  surface: SprintInputs["surface"],
): number {
  if (!shoeType) return 1;
  const s = surface ?? "track";
  return FOOTWEAR_SURFACE_FACTORS[shoeType]?.[s] ?? 1;
}

export function airDensity(tempC: number, pressureHpa: number): number {
  const T = tempC + 273.15;
  return 1.293 * (pressureHpa / 760) * (273 / T);
}

export function frontalArea(heightM: number, bodyMassKg: number): number {
  return 0.2025 * Math.pow(heightM, 0.725) * Math.pow(bodyMassKg, 0.425) * 0.266;
}

export function simulateSplitTime(
  distance: number,
  Vmax: number,
  tau: number,
  k: number,
  bodyMass: number,
  wind: number,
): number {
  if (Vmax <= 0 || tau <= 0 || distance <= 0) return 0;
  let lo = 0, hi = Math.max(2, distance / Math.max(0.1, Vmax) + 5);
  const D = (t: number) => Vmax * (t + tau * (Math.exp(-t / tau) - 1));
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (D(mid) < distance) lo = mid;
    else hi = mid;
  }
  const tBase = (lo + hi) / 2;
  const dt = 0.01;
  let eAero = 0;
  for (let t = dt; t <= tBase; t += dt) {
    const v = Vmax * (1 - Math.exp(-t / tau));
    eAero += (k / bodyMass) * Math.pow(v - wind, 2) * v * dt;
  }
  const F0approx = Vmax / tau;
  const dT = eAero / Math.max(0.5, F0approx * Vmax);
  return tBase + dT;
}

export interface SprintResults {
  tau: number;
  Vmax: number;
  F0: number;
  V0: number;
  Pmax: number;
  slopeFV: number;
  RFmax: number;
  DRF: number;
  /** R² of the distance-time fit on splits (alias of modelFitScore). */
  r2: number;
  rmse: number;
  FVprofile: number[];
  velocityProfile: number[];
  splits: Array<SprintSplit & { predicted: number }>;
  MAC?: number;
  Sfv?: number;
  RFpeak?: number;
  RFmean?: number;
  modelFitScore?: number;
  phases?: SprintPhase[];
  series?: SprintSeriesPoint[];
  qualityScore?: SprintQualityScore;
  interpretationType?: SprintInterpretationType;
  aeroDefaults?: boolean;
  testDistance?: 30 | 40 | 60;
  startType?: SprintInputs["startType"];
  surface?: SprintInputs["surface"];
  videoFps?: number;
  shoeType?: ShoeType;
  footwearAdjustment?: { factor: number; shoeLabel: string };
}

export function calculateSprintProfile(inputs: SprintInputs): SprintResults {
  const { bodyMass, height, splits } = inputs;
  const footwearFactor = getFootwearAdjustment(inputs.shoeType, inputs.surface);
  const sorted = [...splits]
    .filter((s) => s.distance > 0 && s.time > 0)
    .map((s) => ({ ...s, time: s.time / footwearFactor }))
    .sort((a, b) => a.time - b.time);

  let bestVmax = 9, bestTau = 1, bestSSE = Infinity;
  for (let vmax = 6; vmax <= 13; vmax += 0.05) {
    for (let tau = 0.3; tau <= 2.5; tau += 0.02) {
      let sse = 0;
      for (const s of sorted) {
        const dPred = vmax * (s.time + tau * (Math.exp(-s.time / tau) - 1));
        sse += (dPred - s.distance) ** 2;
      }
      if (sse < bestSSE) { bestSSE = sse; bestVmax = vmax; bestTau = tau; }
    }
  }
  for (let vmax = bestVmax - 0.05; vmax <= bestVmax + 0.05; vmax += 0.005) {
    for (let tau = bestTau - 0.02; tau <= bestTau + 0.02; tau += 0.002) {
      let sse = 0;
      for (const s of sorted) {
        const dPred = vmax * (s.time + tau * (Math.exp(-s.time / tau) - 1));
        sse += (dPred - s.distance) ** 2;
      }
      if (sse < bestSSE) { bestSSE = sse; bestVmax = vmax; bestTau = tau; }
    }
  }

  const Vmax = bestVmax;
  const tau = bestTau;
  const MAC = tau > 0 ? Vmax / tau : 0;

  const T = (inputs.airTemperature ?? 20) + 273.15;
  const P = inputs.airPressure ?? 760;
  const rho = 1.293 * (P / 760) * (273 / T);
  const frontalA = 0.2025 * Math.pow(height, 0.725) * Math.pow(bodyMass, 0.425) * 0.266;
  const Cd = 0.9;
  const k = 0.5 * rho * frontalA * Cd;
  const aeroDefaults = inputs.airTemperature == null || inputs.airPressure == null;

  const wind = inputs.windSpeed ?? 0;
  const tEnd = Math.max(5, (sorted[sorted.length - 1]?.time ?? 5) + 0.5);
  const dt = 0.02;
  const series: SprintSeriesPoint[] = [];
  const points: { force: number; velocity: number }[] = [];
  for (let t = dt; t <= tEnd + 1e-9; t += dt) {
    const v = Vmax * (1 - Math.exp(-t / tau));
    const a = (Vmax / tau) * Math.exp(-t / tau);
    const x = Vmax * (t + tau * (Math.exp(-t / tau) - 1));
    const Faero = (k * (v - wind) ** 2) / bodyMass;
    const F = a + Faero;
    const Pw = F * v;
    const Ftotal = Math.sqrt(F ** 2 + G ** 2);
    const RF = (F / Ftotal) * 100;
    series.push({ t, x, v, a, F, P: Pw, RF });
    points.push({ force: F, velocity: v });
  }

  const { intercept: F0, slope: b } = linearRegression(
    points.map((p) => p.velocity),
    points.map((p) => p.force),
  );
  const V0 = -F0 / b;
  const Pmax = (F0 * V0) / 4;

  const rfPoints = points.map((p) => {
    const Ftotal = Math.sqrt(p.force ** 2 + G ** 2);
    return { rf: (p.force / Ftotal) * 100, v: p.velocity };
  });
  const { intercept: RFmax, slope: DRF } = linearRegression(
    rfPoints.map((p) => p.v),
    rfPoints.map((p) => p.rf),
  );
  const RFpeak = Math.max(...rfPoints.map((p) => p.rf));
  const RFmean = rfPoints.reduce((a, p) => a + p.rf, 0) / rfPoints.length;

  const splitsWithPred = sorted.map((s) => ({
    ...s,
    predicted: Vmax * (s.time + tau * (Math.exp(-s.time / tau) - 1)),
  }));

  const meanD = sorted.reduce((a, s) => a + s.distance, 0) / Math.max(1, sorted.length);
  let ssRes = 0, ssTot = 0;
  for (const s of splitsWithPred) {
    ssRes += (s.distance - s.predicted) ** 2;
    ssTot += (s.distance - meanD) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  const rmse = Math.sqrt(ssRes / Math.max(1, sorted.length));

  const phases = segmentSprintPhases(series, Vmax);

  const qualityScore = computeSprintQualityScore({
    r2,
    rmse,
    nSplits: sorted.length,
    fps: inputs.videoFps,
  });

  const interpretationType = interpretSprintProfile({
    F0, V0, Vmax, Pmax, RFpeak, DRF,
  });

  return {
    tau,
    Vmax,
    F0,
    V0,
    Pmax,
    slopeFV: b,
    RFmax,
    DRF,
    r2,
    rmse,
    FVprofile: points.map((p) => p.force),
    velocityProfile: points.map((p) => p.velocity),
    splits: splitsWithPred,
    MAC,
    Sfv: b,
    RFpeak,
    RFmean,
    modelFitScore: r2,
    phases,
    series,
    qualityScore,
    interpretationType,
    aeroDefaults,
    testDistance: inputs.testDistance,
    startType: inputs.startType,
    surface: inputs.surface,
    videoFps: inputs.videoFps,
    shoeType: inputs.shoeType,
    footwearAdjustment: inputs.shoeType
      ? { factor: footwearFactor, shoeLabel: SHOE_LABELS[inputs.shoeType] }
      : undefined,
  };
}

// ============================================================
// Sprint helpers — phases, quality, interpretation
// ============================================================

function segmentSprintPhases(series: SprintSeriesPoint[], Vmax: number): SprintPhase[] {
  if (!series.length) return [];
  const labels: Record<SprintPhaseName, string> = {
    start: "Mise en action",
    acceleration: "Accélération",
    transition: "Transition",
    max_velocity: "Vitesse maximale",
    deceleration: "Décélération",
  };
  const pickPhase = (p: SprintSeriesPoint, prevA: number): SprintPhaseName => {
    const ratio = p.v / Vmax;
    if (ratio >= 0.95) return "max_velocity";
    if (p.a < -0.5 && prevA <= 0) return "deceleration";
    if (ratio < 0.3) return "start";
    if (ratio < 0.8) return "acceleration";
    return "transition";
  };
  const phases: SprintPhase[] = [];
  let current: SprintPhaseName = pickPhase(series[0], series[0].a);
  let segStart = series[0];
  for (let i = 1; i < series.length; i++) {
    const p = series[i];
    const next = pickPhase(p, series[i - 1].a);
    if (next !== current) {
      const segEnd = series[i - 1];
      phases.push({
        name: current,
        label: labels[current],
        tStart: segStart.t,
        tEnd: segEnd.t,
        dStart: segStart.x,
        dEnd: segEnd.x,
        vMean: (segStart.v + segEnd.v) / 2,
      });
      current = next;
      segStart = p;
    }
  }
  const last = series[series.length - 1];
  phases.push({
    name: current,
    label: labels[current],
    tStart: segStart.t,
    tEnd: last.t,
    dStart: segStart.x,
    dEnd: last.x,
    vMean: (segStart.v + last.v) / 2,
  });
  return phases.filter((p) => p.tEnd - p.tStart > 0.05);
}

function computeSprintQualityScore(args: {
  r2: number;
  rmse: number;
  nSplits: number;
  fps?: number;
}): SprintQualityScore {
  const warnings: string[] = [];
  const modelFitScore = Math.round(Math.max(0, Math.min(1, args.r2)) * 100);
  if (modelFitScore < 70) warnings.push("Modèle exponentiel mal ajusté — vérifier les splits.");

  const splitCoherenceScore = Math.round(Math.max(0, Math.min(100, 100 - args.rmse * 50)));
  if (args.rmse > 0.5) warnings.push("Cohérence des splits faible (RMSE > 0.5 m).");
  if (args.nSplits < 3) warnings.push("Moins de 3 splits : précision limitée.");

  let fpsScore = 0;
  if (args.fps != null) {
    if (args.fps >= 60) fpsScore = 100;
    else if (args.fps >= 30) fpsScore = 60;
    else { fpsScore = 30; warnings.push("FPS vidéo < 30 — précision frame insuffisante."); }
  }

  const parts: Array<[number, number]> = [
    [modelFitScore, 0.5],
    [splitCoherenceScore, 0.3],
  ];
  if (args.fps != null) parts.push([fpsScore, 0.2]);
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  const globalScore = Math.round(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum);

  let message = "";
  if (globalScore >= 80) message = "Analyse fiable pour suivi longitudinal.";
  else if (globalScore >= 60) message = "Analyse utilisable, correction manuelle recommandée.";
  else message = "Qualité insuffisante : refaire le test avec meilleure mesure.";

  return { modelFitScore, splitCoherenceScore, fpsScore, globalScore, message, warnings };
}

export function interpretSprintProfile(args: {
  F0: number; V0: number; Vmax: number; Pmax: number;
  RFpeak: number; DRF: number;
}): SprintInterpretationType {
  const { F0, Vmax, Pmax, RFpeak, DRF } = args;
  const lowRF = RFpeak < 40 || DRF < -8;
  const lowF0 = F0 < 6.5;
  const lowV = Vmax < 8.5;
  const lowP = Pmax < 16;
  if (lowRF && !lowF0) return "orientation_deficit";
  if (lowF0 && !lowV) return "force_deficit";
  if (lowV && !lowF0) return "velocity_deficit";
  if (lowP) return "power_deficit";
  return "balanced";
}

export interface SprintInterpretation {
  type: SprintInterpretationType;
  title: string;
  description: string;
  recommendations: string[];
}

export function getSprintInterpretation(results: SprintResults): SprintInterpretation {
  const type = results.interpretationType ?? "balanced";
  const map: Record<SprintInterpretationType, SprintInterpretation> = {
    force_deficit: {
      type, title: "Déficit de FORCE horizontale",
      description: "F0 bas et accélération initiale limitée. Travailler la force maximale et l'expression de force horizontale.",
      recommendations: [
        "Force maximale : squat / trap-bar 4×3-5 @ 85-95 % 1RM",
        "Sled lourd : 5×20 m @ 75-100 % PC",
        "Départs courts : 8×10 m max",
        "Hip thrust explosif 4×6",
        "Bondissements horizontaux 4×10 max distance",
      ],
    },
    velocity_deficit: {
      type, title: "Déficit de VITESSE maximale",
      description: "Vmax limitante alors que la force initiale est correcte. Exposer l'athlète à de hautes vitesses.",
      recommendations: [
        "Sprint lancé / flying 30 m : 5×30 m, lancé sur 20 m",
        "Sprints 40-60 m : 5×50 m max",
        "Pliométrie réactive (pogo, drop jumps)",
        "Travail technique en phase upright",
        "Sprints assistés (+5 à +10 %)",
      ],
    },
    power_deficit: {
      type, title: "Déficit de PUISSANCE globale",
      description: "F0 et V0 corrects mais Pmax faible. Travail force-vitesse mixte.",
      recommendations: [
        "Sprint résisté léger à modéré (sled 30-50 % PC)",
        "Travail balistique (jump squats 30-50 % 1RM)",
        "Sauts horizontaux 4×10",
        "Force-vitesse mixte 4×4 @ 60-70 % 1RM rapide",
      ],
    },
    orientation_deficit: {
      type, title: "Déficit d'ORIENTATION horizontale",
      description: "RF faible ou DRF très négatif : la force est mal orientée vers l'avant.",
      recommendations: [
        "Technique d'accélération (inclinaison du tronc)",
        "Sprint en côte légère (10-20 %) : 6×30 m",
        "Sled léger à modéré pour orientation",
        "Feedback vidéo sur la poussée complète",
        "Drills de poussée horizontale",
      ],
    },
    balanced: {
      type, title: "Profil sprint ÉQUILIBRÉ",
      description: "Profil cohérent. Maintenir la qualité avec un travail mixte force/vitesse.",
      recommendations: [
        "Sprint 20-30 m max : 6×25 m",
        "Sled push moyen : 4×20 m @ 30-50 % PC",
        "Bondissements 4×10",
        "Sprint départ 5×10 m",
      ],
    },
  };
  return map[type];
}

export const SPRINT_DEMO = {
  athlete: { firstName: "Démo", lastName: "Sprinter", sport: "football", bodyMass: 75, height: 1.8 },
  splits: [
    { distance: 5, time: 1.15 },
    { distance: 10, time: 1.82 },
    { distance: 15, time: 2.43 },
    { distance: 20, time: 3.0 },
    { distance: 25, time: 3.55 },
    { distance: 30, time: 4.08 },
  ] as SprintSplit[],
};

export function defaultSplitsForDistance(d: 30 | 40 | 60): number[] {
  if (d === 30) return [5, 10, 15, 20, 25, 30];
  if (d === 40) return [5, 10, 15, 20, 25, 30, 35, 40];
  return [5, 10, 15, 20, 25, 30, 40, 50, 60];
}

export function linearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0, ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * x[i];
    ssRes += (y[i] - pred) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

// ============================================================
// Recommendations
// ============================================================

export interface Recommendation {
  title: string;
  description: string;
  exercises: { name: string; sets: string; intensity: string }[];
}

export function getJumpRecommendations(profile: JumpResults["profile"], imbalance: number): Recommendation {
  if (profile === "force_deficit") {
    return {
      title: "Déficit de FORCE détecté",
      description: `Imbalance de ${Math.abs(imbalance).toFixed(1)}%. Priorisez le développement de la force maximale et de la force-puissance lourde pour rééquilibrer le profil.`,
      exercises: [
        { name: "Back squat lourd", sets: "4×3-5", intensity: "85-95% 1RM" },
        { name: "Front squat", sets: "4×4-6", intensity: "80-90% 1RM" },
        { name: "Hip thrust lourd", sets: "4×5", intensity: "85% 1RM" },
        { name: "Squat jump chargé", sets: "4×4", intensity: "30-50% 1RM" },
        { name: "Soulevé de terre", sets: "4×3", intensity: "85% 1RM" },
      ],
    };
  }
  if (profile === "velocity_deficit") {
    return {
      title: "Déficit de VITESSE détecté",
      description: `Imbalance de ${Math.abs(imbalance).toFixed(1)}%. Priorisez la pliométrie, les mouvements explosifs et les sauts à faible charge pour développer la vitesse de contraction.`,
      exercises: [
        { name: "Squat jump léger", sets: "5×5", intensity: "0-20% PC" },
        { name: "Drop jump (40-60cm)", sets: "5×5", intensity: "max intent" },
        { name: "Bondissements horizontaux", sets: "4×8", intensity: "explosif" },
        { name: "Saut en contre-mouvement", sets: "5×5", intensity: "PC seul" },
        { name: "Pogo jumps", sets: "4×10", intensity: "stiffness" },
      ],
    };
  }
  return {
    title: "Profil ÉQUILIBRÉ ✓",
    description: `Imbalance de ${Math.abs(imbalance).toFixed(1)}%. Maintenir le profil avec un travail mixte force-vitesse.`,
    exercises: [
      { name: "Squat 1/2 lourd", sets: "3×5", intensity: "80% 1RM" },
      { name: "Squat jump léger", sets: "3×5", intensity: "20-30% 1RM" },
      { name: "Drop jump", sets: "3×5", intensity: "stiffness" },
      { name: "Bondissements", sets: "3×8", intensity: "explosif" },
    ],
  };
}

export function getSprintRecommendations(results: SprintResults): Recommendation {
  if (results.RFmax < 35) {
    return {
      title: "Déficit de FORCE HORIZONTALE",
      description: `RFmax de ${results.RFmax.toFixed(1)}%. La capacité à produire de la force orientée horizontalement est limitée. Travail de poussée et d'orientation prioritaire.`,
      exercises: [
        { name: "Sprints en côte (10-30m)", sets: "6×30m", intensity: "max, pente 10-20%" },
        { name: "Sleds heavy push", sets: "5×20m", intensity: "75-100% PC" },
        { name: "Hip thrust explosif", sets: "4×6", intensity: "60% 1RM rapide" },
        { name: "Bondissements horizontaux", sets: "4×10", intensity: "max distance" },
        { name: "Sprint départ bloc", sets: "8×10m", intensity: "max" },
      ],
    };
  }
  if (Math.abs(results.DRF) < 5) {
    return {
      title: "Déficit de VITESSE MAX",
      description: `Vmax de ${results.Vmax.toFixed(2)} m/s. Bonne application de force mais vitesse maximale limitante.`,
      exercises: [
        { name: "Sprint volant 30m", sets: "5×30m", intensity: "lancé sur 20m" },
        { name: "Sprint 40-60m", sets: "5×50m", intensity: "max" },
        { name: "Skipping fréquence", sets: "4×20s", intensity: "freq max" },
        { name: "Sprints assistés", sets: "4×30m", intensity: "+5-10%" },
      ],
    };
  }
  return {
    title: "Profil sprint ÉQUILIBRÉ ✓",
    description: `Vmax ${results.Vmax.toFixed(2)} m/s, RFmax ${results.RFmax.toFixed(1)}%, Pmax ${results.Pmax.toFixed(1)} W/kg.`,
    exercises: [
      { name: "Sprint 20-30m", sets: "6×25m", intensity: "max" },
      { name: "Sled push moyen", sets: "4×20m", intensity: "30-50% PC" },
      { name: "Bondissements", sets: "4×10", intensity: "explosif" },
      { name: "Sprint départ", sets: "5×10m", intensity: "max" },
    ],
  };
}
