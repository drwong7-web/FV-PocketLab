export const IMAGE_PICK_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_PICK_MAX_PX = 384;

export type ImagePickErrorCode = "too-large" | "not-image" | "failed";

export class ImagePickError extends Error {
  code: ImagePickErrorCode;
  constructor(code: ImagePickErrorCode) {
    super(code);
    this.name = "ImagePickError";
    this.code = code;
  }
}

export function isImagePickError(e: unknown): e is ImagePickError {
  return e instanceof ImagePickError;
}

export function dataUrlImageKind(dataUrl: string): "jpeg" | "png" {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "jpeg";
  return "png";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImagePickError("failed"));
    img.src = url;
  });
}

function fit(width: number, height: number, maxPx: number) {
  const srcW = Math.max(1, width);
  const srcH = Math.max(1, height);
  const scale = Math.min(1, maxPx / Math.max(srcW, srcH));
  return {
    w: Math.max(1, Math.round(srcW * scale)),
    h: Math.max(1, Math.round(srcH * scale)),
  };
}

/** Resize an image file to a JPEG data URL suitable for local team/player storage. */
export async function fileToJpegDataUrl(
  file: File,
  maxPx = IMAGE_PICK_MAX_PX,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ImagePickError("not-image");
  if (file.size > IMAGE_PICK_MAX_BYTES) throw new ImagePickError("too-large");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { w, h } = fit(img.naturalWidth || img.width, img.naturalHeight || img.height, maxPx);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImagePickError("failed");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch (e) {
    if (isImagePickError(e)) throw e;
    throw new ImagePickError("failed");
  } finally {
    URL.revokeObjectURL(url);
  }
}
