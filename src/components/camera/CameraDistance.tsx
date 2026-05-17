import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

import { Camera, CircleStop, RotateCcw, Upload, Video, X } from "lucide-react";

interface CameraDistanceProps {
  pxPerCm: number;
  onConfirm: (heightMeters: number) => void;
  onClose: () => void;
  title?: string;
  point1Label?: string;
  point2Label?: string;
}

export function CameraDistance({
  pxPerCm, onConfirm, onClose,
  title = "Measure jump height — ankle",
  point1Label = "ankle at takeoff",
  point2Label = "ankle at apex",
}: CameraDistanceProps) {
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captureFps, setCaptureFps] = useState<number>(60);
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const [error, setError] = useState("");

  // Sliding horizontal markers — ratio 0..1 on the overlay height
  const [yTakeoff, setYTakeoff] = useState<number>(0.7);
  const [yApex, setYApex] = useState<number>(0.3);
  const [dragging, setDragging] = useState<"takeoff" | "apex" | null>(null);

  const openCamera = async () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: captureFps, min: 30 } },
        audio: false,
      });
      const settings = stream.getVideoTracks()[0]?.getSettings();
      if (settings?.frameRate) setCaptureFps(Math.round(settings.frameRate));
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setError("");
    } catch (e) {
      setError((e as Error).message.includes("Permission") ? "Allow camera access in your browser." : "Could not open camera: " + (e as Error).message);
    }
  };

  useEffect(() => {
    openCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => setElapsed((performance.now() - startTimeRef.current) / 1000), 50);
    return () => window.clearInterval(id);
  }, [phase]);

  const pickMimeType = () => {
    const candidates = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (const t of candidates) if (MediaRecorder.isTypeSupported(t)) return t;
    return "";
  };

  const resetMarkers = () => {
    setYTakeoff(0.7);
    setYApex(0.3);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      setPhase("review");
      resetMarkers();
    };
    recorder.start();
    recorderRef.current = recorder;
    startTimeRef.current = performance.now();
    setElapsed(0);
    setPhase("recording");
  };

  const stopRecording = () => recorderRef.current?.stop();

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoUrl(URL.createObjectURL(file));
    resetMarkers();
    setError("");
    setPhase("review");
  };

  const restart = async () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    resetMarkers();
    setElapsed(0);
    setPhase("idle");
    const tracksAlive = streamRef.current?.getVideoTracks().some((t) => t.readyState === "live");
    if (!tracksAlive) await openCamera();
  };

  useEffect(() => {
    if (phase === "review") return;
    const v = liveVideoRef.current;
    if (!v || !streamRef.current) return;
    if (v.srcObject !== streamRef.current) v.srcObject = streamRef.current;
    v.play().catch(() => {});
  }, [phase, videoUrl]);

  // Compute the displayed video area inside the overlay (object-contain)
  const getDisplayBox = () => {
    const v = playbackRef.current;
    const overlay = overlayRef.current;
    if (!v || !overlay) return null;
    const rect = overlay.getBoundingClientRect();
    const nW = v.videoWidth, nH = v.videoHeight;
    if (!nW || !nH) return { offY: 0, dispH: rect.height, rect, nH: rect.height };
    const elAR = rect.width / rect.height;
    const natAR = nW / nH;
    let dispH: number, offY: number;
    if (natAR > elAR) { dispH = rect.width / natAR; offY = (rect.height - dispH) / 2; }
    else { dispH = rect.height; offY = 0; }
    return { offY, dispH, rect, nH };
  };

  const heightM = (() => {
    const box = getDisplayBox();
    if (!box || !pxPerCm) return null;
    const verticalDispPx = Math.abs(yTakeoff - yApex) * box.dispH;
    // Convert displayed px → natural px
    const naturalPx = box.nH ? verticalDispPx * (box.nH / box.dispH) : verticalDispPx;
    return naturalPx / pxPerCm / 100;
  })();

  const confirm = () => {
    if (heightM == null || heightM <= 0) { setError("Adjust the markers on the video first."); return; }
    onConfirm(heightM);
  };

  const onHandlePointerDown = (which: "takeoff" | "apex") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(which);
  };
  const onHandlePointerMove = (which: "takeoff" | "apex") => (e: React.PointerEvent) => {
    if (dragging !== which) return;
    const overlay = overlayRef.current; if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    if (which === "takeoff") setYTakeoff(y); else setYApex(y);
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    setDragging(null);
  };
  const onHandleKeyDown = (which: "takeoff" | "apex") => (e: React.KeyboardEvent) => {
    const overlay = overlayRef.current; if (!overlay) return;
    const step = 1 / overlay.getBoundingClientRect().height;
    const cur = which === "takeoff" ? yTakeoff : yApex;
    const set = which === "takeoff" ? setYTakeoff : setYApex;
    if (e.key === "ArrowUp") { e.preventDefault(); set(Math.max(0, cur - step)); }
    else if (e.key === "ArrowDown") { e.preventDefault(); set(Math.min(1, cur + step)); }
  };

  const renderMarker = (which: "takeoff" | "apex", yRatio: number, colorClass: string, label: string) => {
    const box = getDisplayBox();
    const topPx = box ? box.offY + yRatio * box.dispH : yRatio * 100;
    const isPx = !!box;
    return (
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={isPx ? { top: `${topPx}px` } : { top: `${yRatio * 100}%` }}
      >
        <div className={`h-0.5 w-full ${colorClass}`} />
        <div
          role="slider"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(yRatio * 100)}
          tabIndex={0}
          onPointerDown={onHandlePointerDown(which)}
          onPointerMove={onHandlePointerMove(which)}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onKeyDown={onHandleKeyDown(which)}
          className={`pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-6 w-6 cursor-ns-resize touch-none rounded-full border-2 border-white shadow-lg ${colorClass}`}
          style={{ touchAction: "none" }}
        />
        <span className={`absolute right-1 -top-5 rounded-sm px-1 text-[10px] font-mono text-white ${colorClass}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 px-3 py-2 text-white">
        <div className="flex items-center gap-2"><Video className="h-4 w-4" /><span className="font-display text-sm uppercase">{title}</span></div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-white hover:bg-white/10"><X className="h-5 w-5" /></Button>
      </div>

      {!pxPerCm && <p className="bg-amber-500/20 px-3 py-2 text-xs text-amber-300">⚠ Calibration missing. Calibrate first from the previous screen.</p>}

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {phase !== "review" && <video ref={liveVideoRef} playsInline muted className="h-full w-full object-cover" />}
        {phase === "review" && videoUrl && (
          <>
            <video
              ref={(el) => { playbackRef.current = el; if (el) el.playbackRate = playbackRate; }}
              src={videoUrl} playsInline controls className="h-full w-full object-contain"
            />
            <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
              {renderMarker("takeoff", yTakeoff, "bg-destructive", point1Label)}
              {renderMarker("apex", yApex, "bg-primary", point2Label)}
            </div>
          </>
        )}

        {phase === "recording" && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-mono font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {elapsed.toFixed(2)}s
            </div>
          </div>
        )}
      </div>

      {phase === "review" && (
        <div className="max-h-[45vh] shrink-0 space-y-2 overflow-y-auto bg-black/85 p-3">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-medium">Slide the two horizontal lines to the ankle position.</span>
              <span className="font-mono opacity-70">{captureFps} fps · {playbackRate}×</span>
            </div>

            {heightM != null && <div className="rounded-md bg-primary/20 px-2 py-1 text-center font-mono text-sm text-primary">h = {(heightM * 100).toFixed(1)} cm</div>}

            <div className="flex gap-1">
              {[0.1, 0.25, 0.5, 1].map((r) => (
                <button key={r} onClick={() => { setPlaybackRate(r); if (playbackRef.current) playbackRef.current.playbackRate = r; }}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${playbackRate === r ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>{r}×</button>
              ))}
            </div>

            <div className="flex gap-1">
              <button onClick={() => { if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current.currentTime = Math.max(0, playbackRef.current.currentTime - 1 / captureFps); } }}
                className="flex-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white">◀ -1 frame</button>
              <button onClick={() => { if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current.currentTime = playbackRef.current.currentTime + 1 / captureFps; } }}
                className="flex-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white">+1 frame ▶</button>
            </div>
        </div>
      )}
      {error && <p className="bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">{error}</p>}

      <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={onFileChosen} />

      <div className="flex gap-2 bg-black/80 p-3">
        {phase === "idle" && (
          <>
            <Button onClick={startRecording} className="flex-1 gradient-primary text-primary-foreground shadow-glow" disabled={!pxPerCm}>
              <Camera className="mr-2 h-4 w-4" /> Record
            </Button>
            <Button onClick={onUploadClick} variant="outline" className="flex-1" disabled={!pxPerCm}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </>
        )}
        {phase === "recording" && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1"><CircleStop className="mr-2 h-4 w-4" /> Stop</Button>
        )}
        {phase === "review" && (
          <>
            <Button onClick={restart} variant="outline" className="flex-1"><RotateCcw className="mr-2 h-4 w-4" /> Redo</Button>
            <Button onClick={confirm} disabled={heightM == null} className="flex-1 gradient-primary text-primary-foreground">
              Confirm {heightM != null ? `(${(heightM * 100).toFixed(1)} cm)` : ""}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
