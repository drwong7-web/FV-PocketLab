import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Check, RotateCcw, Ruler, Upload, X } from "lucide-react";

interface CameraCalibrationProps {
  onConfirm: (pxPerCm: number) => void;
  onClose: () => void;
}

type Pt = { natX: number; natY: number; dispX: number; dispY: number };

export function CameraCalibration({ onConfirm, onClose }: CameraCalibrationProps) {
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<"idle" | "snapped">("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [a, setA] = useState<Pt | null>(null);
  const [b, setB] = useState<Pt | null>(null);
  const [calibCm, setCalibCm] = useState("100");
  const [error, setError] = useState("");

  const openCamera = async () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setError("");
    } catch (e) {
      setError("Could not open camera: " + (e as Error).message);
    }
  };

  useEffect(() => {
    openCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setPhase("snapped");
    }, "image/jpeg", 0.9);
  };

  const retake = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null); setA(null); setB(null); setPhase("idle");
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "snapped" || !overlayRef.current || !naturalSize) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nW = naturalSize.w, nH = naturalSize.h;
    const elAR = rect.width / rect.height;
    const natAR = nW / nH;
    let dispW: number, dispH: number, offX = 0, offY = 0;
    if (natAR > elAR) {
      dispW = rect.width; dispH = rect.width / natAR; offY = (rect.height - dispH) / 2;
    } else {
      dispH = rect.height; dispW = rect.height * natAR; offX = (rect.width - dispW) / 2;
    }
    if (x < offX || x > offX + dispW || y < offY || y > offY + dispH) return;
    const natX = ((x - offX) / dispW) * nW;
    const natY = ((y - offY) / dispH) * nH;
    const pt: Pt = { natX, natY, dispX: x, dispY: y };
    if (!a) setA(pt);
    else if (!b) setB(pt);
    else { setA(pt); setB(null); }
  };

  const pxPerCm = (() => {
    const cm = parseFloat(calibCm);
    if (!a || !b || !cm) return 0;
    const px = Math.hypot(b.natX - a.natX, b.natY - a.natY);
    return px / cm;
  })();

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
            <img src={photoUrl} alt="calibration" className="h-full w-full object-contain" />
            <div ref={overlayRef} onClick={handleClick} className="absolute inset-0 cursor-crosshair">
              {a && <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: a.dispX, top: a.dispY }} />}
              {b && <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: b.dispX, top: b.dispY }} />}
              {a && b && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <line x1={a.dispX} y1={a.dispY} x2={b.dispX} y2={b.dispY} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 3" />
                </svg>
              )}
            </div>
          </>
        )}
      </div>

      {phase === "snapped" && (
        <div className="space-y-2 bg-black/85 p-3 text-white">
          <p className="text-xs">
            {!a ? "1. Click the first end of the reference object."
              : !b ? "2. Click the second end."
              : "✓ Markers placed. Enter the real length and confirm."}
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

      <div className="flex gap-2 bg-black/80 p-3">
        {phase === "idle" && (
          <Button onClick={snap} className="flex-1 gradient-primary text-primary-foreground shadow-glow">
            <Camera className="mr-2 h-4 w-4" /> Capture photo
          </Button>
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
