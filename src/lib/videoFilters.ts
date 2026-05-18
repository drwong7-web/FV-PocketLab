/**
 * Automatic per-frame video enhancement for pose detection.
 *
 * Pipeline (auto-adaptive, no UI):
 *   1. Auto-exposure / gamma correction (only if frame is too dark / too bright)
 *   2. CLAHE-lite contrast boost on luminance (only if low contrast)
 *   3. Gentle gaussian denoise (only if noise estimate above threshold)
 *   4. Unsharp mask sharpening
 *   5. Bicubic-like upscale to ~720p if source is smaller
 *
 * All conditional — if a frame is already clean & HD, only sharpening runs.
 * Output is an HTMLCanvasElement ready to feed to MediaPipe (which accepts
 * HTMLCanvasElement directly via detectForVideo).
 */

export interface EnhanceOptions {
  sharpenAmount?: number;   // 0..1, default 0.6
  targetMinHeight?: number; // upscale only if videoHeight < this
  enableStats?: boolean;    // sample histogram every N frames
}

interface EnhancerState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  workCanvas: HTMLCanvasElement;
  workCtx: CanvasRenderingContext2D;
  lastStats: { mean: number; std: number; noise: number } | null;
  frameCount: number;
}

export function createFrameEnhancer(opts: EnhanceOptions = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const workCanvas = document.createElement("canvas");
  const workCtx = workCanvas.getContext("2d", { willReadFrequently: true })!;
  const state: EnhancerState = {
    canvas, ctx, workCanvas, workCtx,
    lastStats: null, frameCount: 0,
  };
  const sharpen = opts.sharpenAmount ?? 0.6;
  const targetH = opts.targetMinHeight ?? 720;

  return {
    canvas,
    /**
     * Draw the enhanced version of `source` into the internal canvas and
     * return that canvas. Safe to call on every frame.
     */
    enhance(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): HTMLCanvasElement {
      const sw = "videoWidth" in source ? source.videoWidth : source.width;
      const sh = "videoHeight" in source ? source.videoHeight : source.height;
      if (!sw || !sh) return canvas;

      // Decide upscale factor
      const scale = sh < targetH ? Math.min(2, targetH / sh) : 1;
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);

      if (canvas.width !== dw || canvas.height !== dh) {
        canvas.width = dw; canvas.height = dh;
      }

      // CSS filter pre-pass: cheap GPU-accelerated contrast+brightness+saturate
      // The browser applies these during drawImage.
      let cssFilter = "";
      const stats = state.lastStats;
      if (stats) {
        // Auto-exposure: target mean luminance ~ 128
        const mean = stats.mean;
        if (mean < 90) {
          cssFilter += ` brightness(115%) contrast(108%)`;
        } else if (mean > 165) {
          cssFilter += ` brightness(92%) contrast(95%)`;
        }
        // Low contrast → CLAHE-lite via contrast()
        if (stats.std < 35) {
          cssFilter += ` contrast(118%) saturate(110%)`;
        }
      }
      ctx.filter = cssFilter.trim() || "none";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source as CanvasImageSource, 0, 0, dw, dh);
      ctx.filter = "none";

      // Read ImageData for convolution-based ops
      // Skip for very large frames to keep perf reasonable
      const totalPx = dw * dh;
      if (totalPx <= 1920 * 1080) {
        try {
          const imgData = ctx.getImageData(0, 0, dw, dh);
          // Update stats every 8 frames
          if (state.frameCount % 8 === 0) {
            state.lastStats = estimateStats(imgData.data, dw, dh);
          }
          // Denoise if noisy
          let data = imgData.data;
          if (state.lastStats && state.lastStats.noise > 12) {
            data = gaussianBlur3(data, dw, dh);
          }
          // Unsharp mask
          if (sharpen > 0) {
            data = unsharpMask(data, dw, dh, sharpen);
          }
          ctx.putImageData(new ImageData(data, dw, dh), 0, 0);
        } catch {
          // CORS / tainted canvas — skip ImageData ops, keep CSS-filtered output
        }
      }

      state.frameCount++;
      return canvas;
    },
    reset() {
      state.frameCount = 0;
      state.lastStats = null;
    },
  };
}

// ---------------- Helpers ----------------

function estimateStats(data: Uint8ClampedArray, w: number, h: number) {
  // Sample every 16th pixel for speed
  let sum = 0, sumSq = 0, n = 0;
  let noise = 0, noiseN = 0;
  const stride = 16 * 4;
  for (let i = 0; i < data.length; i += stride) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum; sumSq += lum * lum; n++;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));

  // Noise estimate: median abs diff between neighbouring pixels (sampled rows)
  for (let y = 4; y < h - 4; y += 32) {
    for (let x = 4; x < w - 4; x += 16) {
      const i = (y * w + x) * 4;
      const j = i + 4;
      const dL = Math.abs(
        (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) -
        (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2])
      );
      noise += dL; noiseN++;
    }
  }
  return { mean, std, noise: noiseN > 0 ? noise / noiseN : 0 };
}

function gaussianBlur3(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  // 3x3 gaussian, σ≈0.85, kernel [1 2 1 / 2 4 2 / 1 2 1] /16
  const out = new Uint8ClampedArray(src.length);
  // Copy alpha
  for (let i = 3; i < src.length; i += 4) out[i] = src[i];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const i00 = ((y - 1) * w + (x - 1)) * 4 + c;
        const i01 = ((y - 1) * w + x) * 4 + c;
        const i02 = ((y - 1) * w + (x + 1)) * 4 + c;
        const i10 = (y * w + (x - 1)) * 4 + c;
        const i11 = (y * w + x) * 4 + c;
        const i12 = (y * w + (x + 1)) * 4 + c;
        const i20 = ((y + 1) * w + (x - 1)) * 4 + c;
        const i21 = ((y + 1) * w + x) * 4 + c;
        const i22 = ((y + 1) * w + (x + 1)) * 4 + c;
        const v = (
          src[i00] + 2 * src[i01] + src[i02] +
          2 * src[i10] + 4 * src[i11] + 2 * src[i12] +
          src[i20] + 2 * src[i21] + src[i22]
        ) >> 4;
        out[i11] = v;
      }
    }
  }
  // Edges: copy
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      out[(0 * w + x) * 4 + c] = src[(0 * w + x) * 4 + c];
      out[((h - 1) * w + x) * 4 + c] = src[((h - 1) * w + x) * 4 + c];
    }
  }
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      out[(y * w + 0) * 4 + c] = src[(y * w + 0) * 4 + c];
      out[(y * w + (w - 1)) * 4 + c] = src[(y * w + (w - 1)) * 4 + c];
    }
  }
  return out;
}

function unsharpMask(src: Uint8ClampedArray, w: number, h: number, amount: number): Uint8ClampedArray {
  // sharpened = src + amount * (src - blur(src))
  const blurred = gaussianBlur3(src, w, h);
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    out[i + 3] = src[i + 3];
    for (let c = 0; c < 3; c++) {
      const v = src[i + c] + amount * (src[i + c] - blurred[i + c]);
      out[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return out;
}
