import type { FrameSample } from "./poseDetector";
import { butterworthLowpass, oneEuroSeries, interpolateGaps } from "./signalFilters";

const G = 9.81;

export interface JumpDetectionResult {
  takeoffIdx: number;
  apexIdx: number;
  landingIdx: number;
  takeoffT: number;
  apexT: number;
  landingT: number;
  flightTime: number;       // s
  heightFromFlight: number; // m, h = g * t² / 8
  peakDisplacementNorm: number; // normalized Y units (smaller Y = higher)
  baselineY: number;
  confidence: number;       // 0..1
}

/**
 * Detect takeoff/apex/landing from a time series of foot Y positions.
 * Y is normalized image coordinate (0 = top, 1 = bottom). Lower Y = higher in air.
 */
export function detectJump(samples: FrameSample[]): JumpDetectionResult | null {
  const valid = samples.filter((s) => s.visibility > 0.5);
  if (valid.length < 10) return null;

  const t = valid.map((s) => s.t);
  const yRaw = valid.map((s) => s.footY);

  // Estimate sample rate from median dt
  const dts: number[] = [];
  for (let i = 1; i < t.length; i++) dts.push(t[i] - t[i - 1]);
  dts.sort((a, b) => a - b);
  const medDt = dts[Math.floor(dts.length / 2)] || 1 / 30;
  const fs = 1 / Math.max(1e-3, medDt);

  // Fill any holes, one-euro then butterworth lowpass at 8 Hz
  const yFilled = interpolateGaps(yRaw, 3);
  const yOE = oneEuroSeries(t, yFilled, 1.2, 0.05);
  const y = butterworthLowpass(yOE, fs, 8);


  // Apex = global minimum of Y (highest point in air)
  let apexIdx = 0;
  for (let i = 1; i < y.length; i++) if (y[i] < y[apexIdx]) apexIdx = i;

  // Baseline = median Y over first 25% of samples (athlete on ground before jump)
  const preCount = Math.max(5, Math.floor(y.length * 0.25));
  const preWindow = [...y.slice(0, preCount)].sort((a, b) => a - b);
  const baselineY = preWindow[Math.floor(preWindow.length / 2)];

  const peakDisp = baselineY - y[apexIdx];
  if (peakDisp <= 0.005) return null; // no real jump detected

  // Threshold: feet considered airborne when above baseline by > 25% of peak displacement
  const threshold = baselineY - peakDisp * 0.25;

  // Takeoff: last frame before apex where y > threshold (still on/near ground)
  let takeoffIdx = 0;
  for (let i = apexIdx; i >= 0; i--) {
    if (y[i] >= threshold) { takeoffIdx = i; break; }
  }
  // Landing: first frame after apex where y >= threshold
  let landingIdx = y.length - 1;
  for (let i = apexIdx; i < y.length; i++) {
    if (y[i] >= threshold) { landingIdx = i; break; }
  }

  // Sub-frame refinement via linear interpolation at the threshold crossing
  const interpT = (i0: number, i1: number) => {
    if (i0 === i1) return t[i0];
    const y0 = y[i0], y1 = y[i1];
    if (y1 === y0) return t[i0];
    const r = (threshold - y0) / (y1 - y0);
    return t[i0] + r * (t[i1] - t[i0]);
  };

  const takeoffT = takeoffIdx < y.length - 1 ? interpT(takeoffIdx, takeoffIdx + 1) : t[takeoffIdx];
  const landingT = landingIdx > 0 ? interpT(landingIdx - 1, landingIdx) : t[landingIdx];

  const flightTime = Math.max(0, landingT - takeoffT);
  const heightFromFlight = (G * flightTime * flightTime) / 8;

  // Confidence: visibility average inside flight window + plausibility of flight time
  const inWindow = valid.slice(takeoffIdx, landingIdx + 1);
  const visMean = inWindow.reduce((s, x) => s + x.visibility, 0) / Math.max(1, inWindow.length);
  const plausible = flightTime > 0.15 && flightTime < 1.2 ? 1 : 0.4;
  const confidence = Math.min(1, visMean * plausible);

  return {
    takeoffIdx, apexIdx, landingIdx,
    takeoffT, apexT: t[apexIdx], landingT,
    flightTime, heightFromFlight,
    peakDisplacementNorm: peakDisp,
    baselineY,
    confidence,
  };
}
