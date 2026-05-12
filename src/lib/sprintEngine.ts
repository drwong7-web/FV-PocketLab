/**
 * SprintLab FV Pro — Sprint Science Engine
 * Modular implementation:
 *  - EMA smoothing
 *  - 1D Kalman filter (position + velocity state)
 *  - Numerical differentiation for velocity / acceleration
 *  - Mono-exponential sprint model fitting (Samozino-style)
 *  - F-V linear regression: F0, V0, Pmax
 *  - Phase detection: acceleration / max-velocity / deceleration
 *
 * Inputs may come from:
 *   (a) split distances + times  -> we fit a mono-exponential model
 *       v(t) = vmax * (1 - exp(-t/tau)),  x(t) = vmax*(t + tau*(exp(-t/tau)-1))
 *       and resample to dense position-time
 *   (b) raw position-time arrays (advanced) -> filtered directly
 *
 * Designed to be ready for future video-tracking ingestion (just feed
 * a position-time array into `analyzePositionTime`).
 */

export interface Split {
  distance: number; // meters
  time: number;     // seconds
}

export interface SamplePoint {
  t: number; // seconds
  x: number; // meters
  v: number; // m/s
  a: number; // m/s^2
  f: number; // N (mass * a)
}

export type SprintPhase = "acceleration" | "max_velocity" | "deceleration";

export interface PhaseSegment {
  phase: SprintPhase;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
}

export interface FVProfile {
  F0: number;       // N
  V0: number;       // m/s
  Pmax: number;     // W
  slope: number;    // N / (m/s)
  rSquared: number;
  F0_rel?: number;  // N/kg
  Pmax_rel?: number;// W/kg
}

export interface SprintAnalysis {
  samples: SamplePoint[];
  vmax: number;
  tau?: number;
  modelFit?: { vmax: number; tau: number; rSquared: number };
  fv: FVProfile;
  phases: PhaseSegment[];
  mass: number;
  duration: number;
  distanceCovered: number;
}

// ---------- Filters ----------

export function ema(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

/**
 * 1D Kalman filter on a [position, velocity] state with constant-velocity model.
 * Smooths a noisy position-time series.
 */
export function kalmanPosition(
  times: number[],
  positions: number[],
  opts: { processNoise?: number; measurementNoise?: number } = {}
): { x: number[]; v: number[] } {
  const q = opts.processNoise ?? 0.05;       // tunes how much the model can deviate
  const r = opts.measurementNoise ?? 0.02;   // measurement variance (meters^2)
  const n = positions.length;
  if (n === 0) return { x: [], v: [] };

  // State: [x, v]
  let x = positions[0];
  let v = 0;
  // Covariance
  let P = [
    [1, 0],
    [0, 1],
  ];

  const xs: number[] = [];
  const vs: number[] = [];

  for (let i = 0; i < n; i++) {
    const dt = i === 0 ? (times[1] - times[0]) || 0.01 : times[i] - times[i - 1];

    // Predict
    const xPred = x + v * dt;
    const vPred = v;
    // F = [[1,dt],[0,1]];  P = F P F' + Q
    const F00 = 1, F01 = dt, F10 = 0, F11 = 1;
    const FP00 = F00 * P[0][0] + F01 * P[1][0];
    const FP01 = F00 * P[0][1] + F01 * P[1][1];
    const FP10 = F10 * P[0][0] + F11 * P[1][0];
    const FP11 = F10 * P[0][1] + F11 * P[1][1];
    const P00 = FP00 * F00 + FP01 * F01 + q * dt;
    const P01 = FP00 * F10 + FP01 * F11;
    const P10 = FP10 * F00 + FP11 * F01;
    const P11 = FP10 * F10 + FP11 * F11 + q;

    // Update with measurement z = position; H = [1,0]
    const z = positions[i];
    const y = z - xPred;
    const S = P00 + r;
    const K0 = P00 / S;
    const K1 = P10 / S;
    x = xPred + K0 * y;
    v = vPred + K1 * y;
    P = [
      [(1 - K0) * P00, (1 - K0) * P01],
      [-K1 * P00 + P10, -K1 * P01 + P11],
    ];

    xs.push(x);
    vs.push(v);
  }

  return { x: xs, v: vs };
}

// ---------- Differentiation ----------

export function centralDiff(times: number[], values: number[]): number[] {
  const n = values.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (i === 0) out[i] = (values[1] - values[0]) / (times[1] - times[0]);
    else if (i === n - 1) out[i] = (values[n - 1] - values[n - 2]) / (times[n - 1] - times[n - 2]);
    else out[i] = (values[i + 1] - values[i - 1]) / (times[i + 1] - times[i - 1]);
  }
  return out;
}

// ---------- Linear regression ----------

export function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  // R²
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yp = slope * xs[i] + intercept;
    ssRes += (ys[i] - yp) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, rSquared };
}

// ---------- Mono-exponential sprint model fit ----------

/**
 * Fit v(t) = vmax * (1 - exp(-t/tau)) to splits using grid + refine search.
 * Returns vmax, tau and R² on the predicted distances.
 */
export function fitMonoExponentialFromSplits(splits: Split[]) {
  const ts = splits.map((s) => s.time);
  const xs = splits.map((s) => s.distance);

  const distAt = (t: number, vmax: number, tau: number) =>
    vmax * (t + tau * (Math.exp(-t / tau) - 1));

  // Initial vmax estimate from last interval
  const last = splits[splits.length - 1];
  const prev = splits[splits.length - 2] ?? { distance: 0, time: 0 };
  const initVmax = (last.distance - prev.distance) / Math.max(0.05, last.time - prev.time);

  let best = { vmax: initVmax, tau: 1.0, err: Infinity };
  const vmaxRange = [Math.max(4, initVmax * 0.7), Math.max(6, initVmax * 1.4)];
  const tauRange = [0.4, 2.5];

  for (let vIter = 0; vIter < 60; vIter++) {
    const vmax = vmaxRange[0] + ((vmaxRange[1] - vmaxRange[0]) * vIter) / 59;
    for (let tIter = 0; tIter < 60; tIter++) {
      const tau = tauRange[0] + ((tauRange[1] - tauRange[0]) * tIter) / 59;
      let err = 0;
      for (let i = 0; i < ts.length; i++) {
        if (ts[i] <= 0) continue;
        const pred = distAt(ts[i], vmax, tau);
        err += (pred - xs[i]) ** 2;
      }
      if (err < best.err) best = { vmax, tau, err };
    }
  }

  // Local refinement
  for (let pass = 0; pass < 4; pass++) {
    const dv = 0.2 / (pass + 1);
    const dt = 0.1 / (pass + 1);
    for (let i = -10; i <= 10; i++) {
      for (let j = -10; j <= 10; j++) {
        const vmax = best.vmax + (i * dv) / 10;
        const tau = best.tau + (j * dt) / 10;
        if (tau <= 0.05) continue;
        let err = 0;
        for (let k = 0; k < ts.length; k++) {
          if (ts[k] <= 0) continue;
          err += (distAt(ts[k], vmax, tau) - xs[k]) ** 2;
        }
        if (err < best.err) best = { vmax, tau, err };
      }
    }
  }

  // R² on distances
  const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < ts.length; i++) {
    const pred = ts[i] <= 0 ? 0 : distAt(ts[i], best.vmax, best.tau);
    ssRes += (pred - xs[i]) ** 2;
    ssTot += (xs[i] - meanX) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { vmax: best.vmax, tau: best.tau, rSquared };
}

// ---------- Resampling ----------

export function resampleFromModel(vmax: number, tau: number, duration: number, dt = 0.02) {
  const times: number[] = [];
  const positions: number[] = [];
  for (let t = 0; t <= duration + 1e-9; t += dt) {
    times.push(+t.toFixed(4));
    positions.push(vmax * (t + tau * (Math.exp(-t / tau) - 1)));
  }
  return { times, positions };
}

// ---------- Phase detection ----------

export function detectPhases(samples: SamplePoint[]): PhaseSegment[] {
  if (samples.length < 5) return [];
  const vmax = Math.max(...samples.map((s) => s.v));
  const enterMaxVel = 0.95 * vmax; // entering MV when ≥95% vmax
  const decelThreshold = -0.5;     // m/s² sustained negative accel

  const phases: PhaseSegment[] = [];
  let phase: SprintPhase = "acceleration";
  let segStart = 0;

  for (let i = 1; i < samples.length; i++) {
    const s = samples[i];
    let next: SprintPhase = phase;

    if (phase === "acceleration" && s.v >= enterMaxVel) next = "max_velocity";
    else if (phase === "max_velocity" && s.a < decelThreshold && s.v < 0.97 * vmax) next = "deceleration";

    if (next !== phase) {
      phases.push({
        phase,
        startIndex: segStart,
        endIndex: i,
        startTime: samples[segStart].t,
        endTime: samples[i].t,
      });
      segStart = i;
      phase = next;
    }
  }
  phases.push({
    phase,
    startIndex: segStart,
    endIndex: samples.length - 1,
    startTime: samples[segStart].t,
    endTime: samples[samples.length - 1].t,
  });
  return phases;
}

// ---------- F-V profile ----------

export function computeFVProfile(samples: SamplePoint[], mass: number): FVProfile {
  // Use only the acceleration portion where v > 0.3 vmax & a > 0
  const vmax = Math.max(...samples.map((s) => s.v));
  const usable = samples.filter((s) => s.v > 0.3 * vmax && s.a > 0.1);
  const xs = usable.map((s) => s.v);
  const ys = usable.map((s) => s.f);
  const reg = usable.length >= 3 ? linearRegression(xs, ys) : { slope: 0, intercept: 0, rSquared: 0 };
  // F = F0 + slope * V ; V0 when F=0 -> V0 = -F0/slope
  const F0 = reg.intercept;
  const V0 = reg.slope === 0 ? 0 : -F0 / reg.slope;
  const Pmax = (F0 * V0) / 4;
  return {
    F0,
    V0,
    Pmax,
    slope: reg.slope,
    rSquared: reg.rSquared,
    F0_rel: mass > 0 ? F0 / mass : undefined,
    Pmax_rel: mass > 0 ? Pmax / mass : undefined,
  };
}

// ---------- Top-level analyses ----------

export interface AnalyzeOptions {
  mass: number;
  emaAlpha?: number;
  kalman?: { processNoise?: number; measurementNoise?: number };
}

export function analyzePositionTime(
  times: number[],
  positions: number[],
  opts: AnalyzeOptions
): SprintAnalysis {
  // Smooth positions with EMA, then Kalman
  const emaPos = ema(positions, opts.emaAlpha ?? 0.35);
  const k = kalmanPosition(times, emaPos, opts.kalman);
  const x = k.x;
  // Velocity & acceleration via central differences on smoothed position
  const v = centralDiff(times, x).map((val) => Math.max(0, val));
  const vSmooth = ema(v, 0.4);
  const a = centralDiff(times, vSmooth);
  const aSmooth = ema(a, 0.4);

  const samples: SamplePoint[] = times.map((t, i) => ({
    t,
    x: x[i],
    v: vSmooth[i],
    a: aSmooth[i],
    f: opts.mass * aSmooth[i],
  }));

  const fv = computeFVProfile(samples, opts.mass);
  const phases = detectPhases(samples);

  return {
    samples,
    vmax: Math.max(...samples.map((s) => s.v)),
    fv,
    phases,
    mass: opts.mass,
    duration: times[times.length - 1] - times[0],
    distanceCovered: x[x.length - 1] - x[0],
  };
}

export function analyzeSplits(
  splits: Split[],
  opts: AnalyzeOptions & { duration?: number; sampleStep?: number }
): SprintAnalysis {
  const sorted = [...splits].sort((a, b) => a.time - b.time);
  const fit = fitMonoExponentialFromSplits(sorted);
  const duration = opts.duration ?? sorted[sorted.length - 1].time + 0.5;
  const { times, positions } = resampleFromModel(fit.vmax, fit.tau, duration, opts.sampleStep ?? 0.02);
  const analysis = analyzePositionTime(times, positions, opts);
  analysis.tau = fit.tau;
  analysis.modelFit = fit;
  return analysis;
}

// ---------- Recommendations ----------

export interface Recommendation {
  category: "strength" | "velocity" | "mixed" | "power";
  title: string;
  detail: string;
  drills: string[];
}

export function generateRecommendations(fv: FVProfile, mass: number): Recommendation[] {
  const recs: Recommendation[] = [];
  const f0Rel = mass > 0 ? fv.F0 / mass : 0;
  // Reference bands (simplified, athlete-population): elite f0Rel ≈ 7-9 N/kg, V0 ≈ 9-11 m/s
  const lowF0 = f0Rel < 6.5;
  const lowV0 = fv.V0 < 8.5;

  if (lowF0 && !lowV0) {
    recs.push({
      category: "strength",
      title: "Develop Horizontal Force (low F0)",
      detail: "Force production at low velocity is your limiting factor. Prioritise heavy & resisted sprint work to build horizontal force.",
      drills: ["Heavy sled pushes / pulls (≥75% BM)", "Hill sprints 10–20 m", "Trap-bar deadlift 3–5 reps", "Resisted starts from blocks"],
    });
  } else if (lowV0 && !lowF0) {
    recs.push({
      category: "velocity",
      title: "Develop Maximal Velocity (low V0)",
      detail: "You produce force well at low speed but lose effectiveness at high velocity. Train top-end sprint mechanics.",
      drills: ["Flying 20 m sprints", "Assisted overspeed runs", "Wickets / sprint-float-sprint", "Plyometrics: bounds & hops"],
    });
  } else if (lowF0 && lowV0) {
    recs.push({
      category: "mixed",
      title: "Mixed Deficit — Build the Foundation",
      detail: "Both F0 and V0 are below reference. Build a balanced base with mixed-method training.",
      drills: ["Full sprint distance work (10–60 m)", "Resisted + free sprint contrast", "General strength block", "Plyo progression"],
    });
  } else {
    recs.push({
      category: "power",
      title: "Balanced Profile — Maintain & Sharpen",
      detail: "F0 and V0 are well-balanced. Maintain qualities and target peak power output.",
      drills: ["Maintenance heavy lifts 1–2x/wk", "Sprint volume at race intensity", "Contrast / complex training", "Tactical / specific drills"],
    });
  }

  return recs;
}
