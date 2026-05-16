import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from "@mediapipe/tasks-vision";

let landmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

async function getLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const lm = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    landmarker = lm;
    return lm;
  })();
  return initPromise;
}

export interface PoseSample {
  t: number;
  x: number;
  confidence: number;
}

export interface PoseTrackingOptions {
  sampleRateHz?: number;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
  startTime?: number;
  endTime?: number;
}

export async function trackPelvisX(
  video: HTMLVideoElement,
  opts: PoseTrackingOptions = {},
): Promise<PoseSample[]> {
  const lm = await getLandmarker();
  const rate = opts.sampleRateHz ?? 30;
  const dt = 1 / rate;
  const duration = video.duration;
  const samples: PoseSample[] = [];

  const seekTo = (t: number) =>
    new Promise<void>((resolve) => {
      const onSeek = () => {
        video.removeEventListener("seeked", onSeek);
        resolve();
      };
      video.addEventListener("seeked", onSeek);
      video.currentTime = Math.min(t, duration - 0.001);
    });

  const wasPaused = video.paused;
  if (!wasPaused) video.pause();

  const start = Math.max(0, opts.startTime ?? 0);
  const end = Math.min(duration, opts.endTime ?? duration);
  const span = Math.max(0.001, end - start);
  let t = start;
  let frameIdx = 0;
  while (t < end) {
    if (opts.signal?.aborted) break;
    await seekTo(t);
    const ts = Math.round(t * 1000) + frameIdx;
    const result: PoseLandmarkerResult = lm.detectForVideo(video, ts);
    const lms = result.landmarks?.[0];
    if (lms && lms[23] && lms[24]) {
      const x = (lms[23].x + lms[24].x) / 2;
      const visL = (lms[23] as { visibility?: number }).visibility ?? 0.5;
      const visR = (lms[24] as { visibility?: number }).visibility ?? 0.5;
      samples.push({ t, x, confidence: (visL + visR) / 2 });
    }
    opts.onProgress?.((t - start) / span);
    t += dt;
    frameIdx++;
  }
  opts.onProgress?.(1);
  return samples;
}

export type CalibInput =
  | { x0Norm: number; xRefNorm: number; refMeters: number }
  | { markers: { xNorm: number; meters: number }[] };

function buildXToMeters(calib: CalibInput): ((x: number) => number) | null {
  if ("markers" in calib) {
    const pts = [...calib.markers].sort((a, b) => a.xNorm - b.xNorm);
    if (pts.length < 2) return null;
    return (x: number) => {
      if (x <= pts[0].xNorm) {
        const a = pts[0], b = pts[1];
        const slope = (b.meters - a.meters) / (b.xNorm - a.xNorm || 1e-9);
        return a.meters + slope * (x - a.xNorm);
      }
      if (x >= pts[pts.length - 1].xNorm) {
        const a = pts[pts.length - 2], b = pts[pts.length - 1];
        const slope = (b.meters - a.meters) / (b.xNorm - a.xNorm || 1e-9);
        return b.meters + slope * (x - b.xNorm);
      }
      for (let i = 1; i < pts.length; i++) {
        if (x <= pts[i].xNorm) {
          const a = pts[i - 1], b = pts[i];
          const r = (x - a.xNorm) / (b.xNorm - a.xNorm || 1e-9);
          return a.meters + r * (b.meters - a.meters);
        }
      }
      return pts[pts.length - 1].meters;
    };
  }
  const { x0Norm, xRefNorm, refMeters } = calib;
  const denom = xRefNorm - x0Norm;
  if (Math.abs(denom) < 1e-6 || refMeters <= 0) return null;
  return (x: number) => ((x - x0Norm) / denom) * refMeters;
}

export function computeSplitTimesFromSamples(
  samples: PoseSample[],
  distances: number[],
  calib: CalibInput,
  startTimeOffset: number,
): { distance: number; time: number; confidence: number }[] {
  const xToMeters = buildXToMeters(calib);
  if (!xToMeters) return [];

  const series = samples
    .filter((s) => s.t >= startTimeOffset)
    .map((s) => ({ t: s.t - startTimeOffset, d: xToMeters(s.x), c: s.confidence }))
    .sort((a, b) => a.t - b.t);

  if (series.length < 2) return [];

  const out: { distance: number; time: number; confidence: number }[] = [];
  for (const target of distances) {
    let found = -1;
    for (let i = 1; i < series.length; i++) {
      if (series[i - 1].d <= target && series[i].d >= target) { found = i; break; }
    }
    if (found < 0) continue;
    const a = series[found - 1];
    const b = series[found];
    const ratio = b.d === a.d ? 0 : (target - a.d) / (b.d - a.d);
    const t = a.t + ratio * (b.t - a.t);
    const confidence = (a.c + b.c) / 2;
    out.push({ distance: target, time: Math.max(0, t), confidence });
  }
  return out;
}

export function disposePoseLandmarker() {
  landmarker?.close();
  landmarker = null;
  initPromise = null;
}
