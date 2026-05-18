/**
 * Signal filters for pose / sprint analysis.
 *
 * Auto-applied — no UI. Designed to be cheap and to no-op safely on small inputs.
 */

// ---------------- One Euro Filter ----------------
// http://cristal.univ-lille.fr/~casiez/1euro/

class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  hasLast() {
    return this.y !== null;
  }
  last() {
    return this.y ?? 0;
  }
  reset() {
    this.y = null;
  }
}

export class OneEuroFilter {
  private xFilter = new LowPass();
  private dxFilter = new LowPass();
  private lastT: number | null = null;
  private lastX: number | null = null;

  constructor(
    private minCutoff = 1.0,
    private beta = 0.05,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, t: number): number {
    if (!Number.isFinite(x)) return x;
    if (this.lastT === null) {
      this.lastT = t;
      this.lastX = x;
      return this.xFilter.filter(x, 1);
    }
    const dt = Math.max(1e-6, t - this.lastT);
    const dx = (x - (this.lastX ?? x)) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const y = this.xFilter.filter(x, this.alpha(cutoff, dt));
    this.lastT = t;
    this.lastX = x;
    return y;
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastT = null;
    this.lastX = null;
  }
}

export function oneEuroSeries(
  times: number[],
  values: number[],
  minCutoff = 1.0,
  beta = 0.05,
): number[] {
  const f = new OneEuroFilter(minCutoff, beta);
  return values.map((v, i) => f.filter(v, times[i] ?? i / 30));
}

// ---------------- Interpolate gaps ----------------
/**
 * Fill NaN holes in `values` by linear interpolation between valid neighbours,
 * up to `maxGap` consecutive holes. Edges with no anchor are left as NaN.
 */
export function interpolateGaps(values: number[], maxGap = 3): number[] {
  const out = values.slice();
  const n = out.length;
  let i = 0;
  while (i < n) {
    if (!Number.isFinite(out[i])) {
      let j = i;
      while (j < n && !Number.isFinite(out[j])) j++;
      const gap = j - i;
      const left = i - 1;
      const right = j;
      if (gap <= maxGap && left >= 0 && right < n) {
        const a = out[left], b = out[right];
        for (let k = i; k < j; k++) {
          const r = (k - left) / (right - left);
          out[k] = a + r * (b - a);
        }
      }
      i = j;
    } else i++;
  }
  return out;
}

// ---------------- Butterworth 2nd-order zero-phase low-pass ----------------
/**
 * Apply a 2nd-order Butterworth low-pass forward + backward (zero phase).
 * `cutoffHz` ≈ 8 Hz works well for sprint/jump kinematics.
 */
export function butterworthLowpass(
  values: number[],
  sampleRateHz: number,
  cutoffHz = 8,
): number[] {
  const n = values.length;
  if (n < 4 || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) return values.slice();
  const nyq = sampleRateHz / 2;
  const fc = Math.min(Math.max(cutoffHz, 0.5), nyq * 0.95);
  const wc = Math.tan((Math.PI * fc) / sampleRateHz);
  const k1 = Math.SQRT2 * wc;
  const k2 = wc * wc;
  const a0 = k2 / (1 + k1 + k2);
  const a1 = 2 * a0;
  const a2 = a0;
  const b1 = (2 * (k2 - 1)) / (1 + k1 + k2);
  const b2 = (1 - k1 + k2) / (1 + k1 + k2);

  const apply = (input: number[]) => {
    const out = new Array(input.length).fill(0);
    let xm1 = input[0], xm2 = input[0];
    let ym1 = input[0], ym2 = input[0];
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      const y = a0 * x + a1 * xm1 + a2 * xm2 - b1 * ym1 - b2 * ym2;
      out[i] = y;
      xm2 = xm1; xm1 = x;
      ym2 = ym1; ym1 = y;
    }
    return out;
  };

  const forward = apply(values);
  const backward = apply(forward.slice().reverse()).reverse();
  return backward;
}

// ---------------- Savitzky-Golay (window 7, order 3, smoothing) ----------------
// Precomputed coefficients for window=7, order=3 smoothing
const SG_7_3 = [-2, 3, 6, 7, 6, 3, -2];
const SG_7_3_NORM = 21;

export function savitzkyGolay(values: number[]): number[] {
  const n = values.length;
  if (n < 7) return values.slice();
  const half = 3;
  const out = values.slice();
  for (let i = half; i < n - half; i++) {
    let s = 0;
    for (let k = -half; k <= half; k++) s += SG_7_3[k + half] * values[i + k];
    out[i] = s / SG_7_3_NORM;
  }
  return out;
}
