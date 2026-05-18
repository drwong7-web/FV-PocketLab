/**
 * Lightweight camera-shake stabilizer.
 *
 * Estimates a (dx, dy) translation between consecutive frames by computing
 * the centroid shift of a downscaled luminance buffer. This is much cheaper
 * than full phase-correlation and effective for hand-held micro-tremor.
 *
 * Usage:
 *   const stab = createStabilizer();
 *   const stabilized = stab.stabilize(enhancedCanvas); // returns canvas
 */

const DOWN_W = 64;
const DOWN_H = 64;
const MAX_SHIFT_RATIO = 0.15; // ignore real pans

export function createStabilizer() {
  const outCanvas = document.createElement("canvas");
  const outCtx = outCanvas.getContext("2d")!;
  const downCanvas = document.createElement("canvas");
  downCanvas.width = DOWN_W; downCanvas.height = DOWN_H;
  const downCtx = downCanvas.getContext("2d", { willReadFrequently: true })!;
  let prev: Float32Array | null = null;
  let prevCentroid: { cx: number; cy: number } | null = null;

  return {
    canvas: outCanvas,
    /**
     * Returns a canvas where the input has been shifted to compensate
     * micro-translation w.r.t. the previous frame.
     */
    stabilize(source: HTMLCanvasElement | HTMLVideoElement): HTMLCanvasElement {
      const sw = "videoWidth" in source ? source.videoWidth : source.width;
      const sh = "videoHeight" in source ? source.videoHeight : source.height;
      if (!sw || !sh) return outCanvas;
      if (outCanvas.width !== sw || outCanvas.height !== sh) {
        outCanvas.width = sw; outCanvas.height = sh;
      }

      // Build luminance signature
      downCtx.drawImage(source as CanvasImageSource, 0, 0, DOWN_W, DOWN_H);
      let centroid: { cx: number; cy: number } | null = null;
      try {
        const data = downCtx.getImageData(0, 0, DOWN_W, DOWN_H).data;
        const lum = new Float32Array(DOWN_W * DOWN_H);
        let sumL = 0, sumLx = 0, sumLy = 0;
        for (let y = 0; y < DOWN_H; y++) {
          for (let x = 0; x < DOWN_W; x++) {
            const i = (y * DOWN_W + x) * 4;
            const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            lum[y * DOWN_W + x] = l;
            sumL += l; sumLx += l * x; sumLy += l * y;
          }
        }
        if (sumL > 0) {
          centroid = { cx: sumLx / sumL, cy: sumLy / sumL };
        }
        prev = lum;
      } catch {
        // tainted canvas — pass through
        outCtx.clearRect(0, 0, sw, sh);
        outCtx.drawImage(source as CanvasImageSource, 0, 0);
        prev = null;
        prevCentroid = centroid;
        return outCanvas;
      }

      let dx = 0, dy = 0;
      if (prevCentroid && centroid) {
        dx = ((centroid.cx - prevCentroid.cx) * sw) / DOWN_W;
        dy = ((centroid.cy - prevCentroid.cy) * sh) / DOWN_H;
        const maxX = sw * MAX_SHIFT_RATIO;
        const maxY = sh * MAX_SHIFT_RATIO;
        if (Math.abs(dx) > maxX || Math.abs(dy) > maxY) { dx = 0; dy = 0; }
      }
      prevCentroid = centroid;

      outCtx.clearRect(0, 0, sw, sh);
      // Compensate: shift by -dx, -dy
      outCtx.drawImage(source as CanvasImageSource, -dx, -dy);
      return outCanvas;
    },
    reset() {
      prev = null;
      prevCentroid = null;
    },
  };
}
