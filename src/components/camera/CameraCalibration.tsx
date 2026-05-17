import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Check, RotateCcw, Ruler, Upload, X } from "lucide-react";

interface CameraCalibrationProps {
  onConfirm: (pxPerCm: number) => void;
  onClose: () => void;
}

export function CameraCalibration({ onConfirm, onClose }: CameraCalibrationProps) {
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingYRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<"idle" | "snapped">("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [calibCm, setCalibCm] = useState("100");
  const [error, setError] = useState("");

  // Horizontal sliding markers (ratio 0..1 on overlay)
  const [yTop, setYTop] = useState(0.3);
  const [yBottom, setYBottom] = useState(0.7);
  const [placed, setPlaced] = useState(false);
  const [dragging, setDragging] = useState<"top" | "bottom" | null>(null);

  const openCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = liveVideoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setError("");
    } catch (e) {
      setError("Could not open camera: " + (e as Error).message);
    }
  };

  // Open / re-open the camera whenever we are back to the live preview phase.
  // Using an effect ensures liveVideoRef is mounted before we attach the stream
  // (prevents a black screen when "Retake" is pressed).
  useEffect(() => {
    if (phase !== "idle") return;
    if (!streamRef.current) {
      openCamera();
    } else if (liveVideoRef.current && liveVideoRef.current.srcObject !== streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetMarkers = () => { setYTop(0.3); setYBottom(0.7); setPlaced(false); };

  const snap = () => {
    const v = liveVideoRef.current;
    if (!v) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPhotoUrl(url);
      setNaturalSize({ w, h });
      resetMarkers();
      setPhase("snapped");
    }, "image/jpeg", 0.9);
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (photoUrl) URL.revokeObjectURL(photoUrl);

      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Failed to load image")); img.src = url; });
        setPhotoUrl(url);
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        resetMarkers();
        setPhase("snapped");
        return;
      }

      const tmpUrl = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.src = tmpUrl; v.muted = true; v.playsInline = true; v.preload = "auto";
      await new Promise<void>((res, rej) => {
        v.onloadeddata = () => res();
        v.onerror = () => rej(new Error("Failed to load video"));
      });
      v.currentTime = Math.min(0.1, (v.duration || 1) / 2);
      await new Promise<void>((res) => { v.onseeked = () => res(); });
      const w = v.videoWidth, h = v.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(v, 0, 0, w, h);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
      URL.revokeObjectURL(tmpUrl);
      setPhotoUrl(URL.createObjectURL(blob));
      setNaturalSize({ w, h });
      resetMarkers();
      setPhase("snapped");
    } catch (err) {
      setError("Could not read file: " + (err as Error).message);
    }
  };

  const retake = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    resetMarkers();
    setPhase("idle");
    // Camera is (re)attached by the [phase] effect once the <video> is mounted.
  };

  // First tap on overlay (markers not placed yet): position both lines around
  // the tap and immediately start dragging the closest one.
  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if (placed) return;
    const overlay = overlayRef.current; if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const top = Math.max(0, y - 0.08);
    const bottom = Math.min(1, y + 0.08);
    setYTop(top);
    setYBottom(bottom);
    setPlaced(true);
    const which: "top" | "bottom" = Math.abs(y - top) < Math.abs(y - bottom) ? "top" : "bottom";
    try { overlay.setPointerCapture(e.pointerId); } catch { /* noop */ }
    setDragging(which);
  };

  // Displayed image box inside overlay (object-contain)
  const getDisplayBox = () => {
    const overlay = overlayRef.current;
    if (!overlay || !naturalSize) return null;
    const rect = overlay.getBoundingClientRect();
    const nW = naturalSize.w, nH = naturalSize.h;
    const elAR = rect.width / rect.height;
    const natAR = nW / nH;
    let dispH: number, offY: number;
    if (natAR > elAR) { dispH = rect.width / natAR; offY = (rect.height - dispH) / 2; }
    else { dispH = rect.height; offY = 0; }
    return { offY, dispH, nH };
  };

  const pxPerCm = (() => {
    const cm = parseFloat(calibCm);
    const box = getDisplayBox();
    if (!box || !cm) return 0;
    const verticalDispPx = Math.abs(yTop - yBottom) * box.dispH;
    const naturalPx = verticalDispPx * (box.nH / box.dispH);
    return naturalPx / cm;
  })();

  // Drag handled at overlay level
  const flushY = () => {
    rafRef.current = null;
    const y = pendingYRef.current;
    if (y == null || !dragging) return;
    if (dragging === "top") setYTop(y); else setYBottom(y);
  };
  const onOverlayPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const overlay = overlayRef.current; if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    pendingYRef.current = y;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flushY);
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    setDragging(null);
  };
  const onHandlePointerDown = (which: "top" | "bottom") => (e: React.PointerEvent) => {
    e.stopPropagation();
    const overlay = overlayRef.current;
    if (overlay) { try { overlay.setPointerCapture(e.pointerId); } catch { /* noop */ } }
    setDragging(which);
  };
  const onHandleKeyDown = (which: "top" | "bottom") => (e: React.KeyboardEvent) => {
    const overlay = overlayRef.current; if (!overlay) return;
    const step = 1 / overlay.getBoundingClientRect().height;
    const cur = which === "top" ? yTop : yBottom;
    const set = which === "top" ? setYTop : setYBottom;
    if (e.key === "ArrowUp") { e.preventDefault(); set(Math.max(0, cur - step)); }
    else if (e.key === "ArrowDown") { e.preventDefault(); set(Math.min(1, cur + step)); }
  };

  const renderMarker = (which: "top" | "bottom", yRatio: number, colorClass: string, label: string) => {
    const box = getDisplayBox();
    const overlayH = overlayRef.current?.getBoundingClientRect().height || 0;
    const topPx = box ? box.offY + yRatio * box.dispH : yRatio * overlayH;
    // Clamp the handle so it stays fully inside the overlay (handle is 32px tall).
    const handleH = 48;
    const desiredHandleTop = topPx - handleH / 2;
    const handleTop = Math.min(Math.max(desiredHandleTop, 0), Math.max(0, overlayH - handleH));
    return (
      <div className="pointer-events-none absolute left-0 right-0" style={{ top: `${topPx}px` }}>
        <div className={`h-px w-full ${colorClass}`} />
        <div
          role="slider"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(yRatio * 100)}
          tabIndex={0}
          onPointerDown={onHandlePointerDown(which)}
          onKeyDown={onHandleKeyDown(which)}
          className="pointer-events-auto absolute left-0 h-8 w-10 cursor-ns-resize touch-none"
          style={{ touchAction: "none", top: `${handleTop - topPx}px` }}
        >
          <span className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white shadow-lg ${colorClass}`} />
        </div>
        <span
          className={`pointer-events-none absolute left-12 rounded-sm px-1 text-[10px] font-mono text-white ${colorClass}`}
          style={{ top: `${handleTop - topPx + 4}px` }}
        >
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          <span className="font-display text-sm uppercase">Camera calibration</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {phase === "idle" && <video ref={liveVideoRef} playsInline muted className="h-full w-full object-cover" />}
        {phase === "snapped" && photoUrl && (
          <>
            <img ref={imgRef} src={photoUrl} alt="calibration" className="h-full w-full object-contain" />
            <div
              ref={overlayRef}
              className={`absolute inset-0 ${(!placed || dragging) ? "pointer-events-auto" : "pointer-events-none"}`}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {!placed && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-md bg-black/60 px-3 py-2 text-center text-xs text-white">
                    Touchez l'écran pour placer les repères
                  </div>
                </div>
              )}
              {placed && renderMarker("top", yTop, "bg-destructive", "top")}
              {placed && renderMarker("bottom", yBottom, "bg-primary", "bottom")}
            </div>
          </>
        )}
      </div>

      {phase === "snapped" && (
        <div className="space-y-2 bg-black/85 p-3 text-white">
          <p className="text-xs">
            Align the two horizontal lines on the top and bottom ends of a <strong>vertical</strong> reference object (e.g. a 1 m ruler standing up).
          </p>
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs">Real length (cm)</Label>
            <Input type="number" inputMode="decimal" value={calibCm} onChange={(e) => setCalibCm(e.target.value)} className="h-8 bg-white/10 text-white" />
            {pxPerCm > 0 && (
              <span className="ml-auto rounded-md bg-primary/20 px-2 py-1 font-mono text-xs text-primary">
                {pxPerCm.toFixed(2)} px/cm
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p className="bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">{error}</p>}

      <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={onFileChosen} />

      <div className="flex gap-2 bg-black/80 p-3">
        {phase === "idle" && (
          <>
            <Button onClick={snap} className="flex-1 gradient-primary text-primary-foreground shadow-glow">
              <Camera className="mr-2 h-4 w-4" /> Capture
            </Button>
            <Button onClick={onUploadClick} variant="outline" className="flex-1">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </>
        )}
        {phase === "snapped" && (
          <>
            <Button onClick={retake} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button onClick={() => onConfirm(pxPerCm)} disabled={pxPerCm <= 0} className="flex-1 gradient-primary text-primary-foreground">
              <Check className="mr-2 h-4 w-4" /> Confirm calibration
            </Button>
          </>
        )}
      </div>

      <div className="bg-black/80 px-3 pb-3 text-[11px] text-white/70">
        Place the reference object <strong>in the same vertical plane as the athlete</strong>, perpendicular to the camera axis. Do not move the camera afterwards.
      </div>
    </div>
  );
}
