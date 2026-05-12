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
  distance: number;
  time: number;
}

export interface SprintInputs {
  bodyMass: number;
  height: number;
  splits: SprintSplit[];
  airTemperature?: number;
  airPressure?: number;
  windSpeed?: number;
}

export interface SprintResults {
  /** Acceleration time constant of the v(t) model (s). */
  tau: number;
  /** Maximal velocity from the v(t) model (m/s). */
  Vmax: number;
  /** Theoretical maximal horizontal force (N/kg). */
  F0: number;
  /** Theoretical maximal horizontal velocity from the F-V regression (m/s). */
  V0: number;
  /** Maximal horizontal power output (W/kg). */
  Pmax: number;
  /** Slope of the linear F-V regression (N/kg per m/s). */
  slopeFV: number;
  /** Maximal ratio of horizontal force (%). */
  RFmax: number;
  /** Decrease of the ratio of force vs velocity (%/(m·s⁻¹)). */
  DRF: number;
  /** R² of the F-V linear regression. */
  r2: number;
  /** RMSE of the position-time fit (m). */
  rmse: number;
  FVprofile: number[];
  velocityProfile: number[];
  splits: Array<SprintSplit & { predicted: number }>;
}

export function calculateSprintProfile(inputs: SprintInputs): SprintResults {
  const { bodyMass, height, splits } = inputs;
  const sorted = [...splits].filter((s) => s.distance > 0 && s.time > 0).sort((a, b) => a.time - b.time);

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
  const rmse = sorted.length > 0 ? Math.sqrt(bestSSE / sorted.length) : 0;

  // Air resistance — Arsac & Locatelli; Atkinson frontal area approx.
  const T = (inputs.airTemperature ?? 20) + 273.15;
  const P = inputs.airPressure ?? 760;
  const rho = 1.293 * (P / 760) * (273 / T);
  const frontalArea = 0.2025 * Math.pow(height, 0.725) * Math.pow(bodyMass, 0.425) * 0.266;
  const Cd = 0.9;
  const k = 0.5 * rho * frontalArea * Cd;

  // Build F-V samples from the v(t) model AFTER the start phase (t > 0.3 s),
  // following Morin & Samozino 2016 to avoid degenerate values near t=0.
  const points: { force: number; velocity: number; t: number }[] = [];
  for (let t = 0.3; t <= 5; t += 0.05) {
    const v = Vmax * (1 - Math.exp(-t / tau));
    const a = (Vmax / tau) * Math.exp(-t / tau);
    const wind = inputs.windSpeed ?? 0;
    const Faero = (k * (v - wind) ** 2) / bodyMass;
    const F = a + Faero;
    points.push({ force: F, velocity: v, t });
  }

  const { intercept: F0, slope: b, r2 } = linearRegression(
    points.map((p) => p.velocity),
    points.map((p) => p.force),
  );
  const V0 = -F0 / b;
  const Pmax = (F0 * V0) / 4;

  const rfPoints = points.map((p) => {
    const Ftotal = Math.sqrt(p.force ** 2 + G ** 2);
    return { rf: (p.force / Ftotal) * 100, v: p.velocity };
  });
  const RFmax = rfPoints.reduce((m, p) => (p.rf > m ? p.rf : m), 0);
  const { slope: DRF } = linearRegression(
    rfPoints.map((p) => p.v),
    rfPoints.map((p) => p.rf),
  );

  const splitsWithPred = sorted.map((s) => ({
    ...s,
    predicted: Vmax * (s.time + tau * (Math.exp(-s.time / tau) - 1)),
  }));

  return {
    tau, Vmax, F0, V0, Pmax,
    slopeFV: b, RFmax, DRF, r2, rmse,
    FVprofile: points.map((p) => p.force),
    velocityProfile: points.map((p) => p.velocity),
    splits: splitsWithPred,
  };
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
