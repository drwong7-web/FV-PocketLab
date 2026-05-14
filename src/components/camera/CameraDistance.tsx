import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

import { Camera, CircleStop, Hand, MousePointer2, Play, RotateCcw, Upload, Video, X } from "lucide-react";

interface CameraDistanceProps {
  pxPerCm: number;
  onConfirm: (heightMeters: number) => void;
  onClose: () => void;
  title?: string;
  point1Label?: string;
  point2Label?: string;
}

type Pt = { natX: number; natY: number; dispX: number; dispY: number };

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

  const [marking, setMarking] = useState(false);
  const [ankleTakeoff, setAnkleTakeoff] = useState<Pt | null>(null);
  const [ankleApex, setAnkleApex] = useState<Pt | null>(null);

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
      setMarking(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    startTimeRef.current = performance.now();
    setElapsed(0);
    setAnkleTakeoff(null);
    setAnkleApex(null);
    setPhase("recording");
  };

  const stopRecording = () => recorderRef.current?.stop();

  const restart = async () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setAnkleTakeoff(null);
    setAnkleApex(null);
    setElapsed(0);
    setPhase("idle");
    setMarking(false);
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

  const toNatural = (clientX: number, clientY: number): Pt | null => {
    const v = playbackRef.current;
    const overlay = overlayRef.current;
    if (!v || !overlay) return null;
    const rect = overlay.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const nW = v.videoWidth, nH = v.videoHeight;
    if (!nW || !nH) return null;
    const elAR = rect.width / rect.height;
    const natAR = nW / nH;
    let dispW: number, dispH: number, offX = 0, offY = 0;
    if (natAR > elAR) { dispW = rect.width; dispH = rect.width / natAR; offY = (rect.height - dispH) / 2; }
    else { dispH = rect.height; dispW = rect.height * natAR; offX = (rect.width - dispW) / 2; }
    if (x < offX || x > offX + dispW || y < offY || y > offY + dispH) return null;
    return { natX: ((x - offX) / dispW) * nW, natY: ((y - offY) / dispH) * nH, dispX: x, dispY: y };
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!marking) return;
    const pt = toNatural(e.clientX, e.clientY);
    if (!pt) return;
    if (!ankleTakeoff) setAnkleTakeoff(pt);
    else setAnkleApex(pt);
  };

  const computeHeight = (): number | null => {
    if (!ankleTakeoff || !ankleApex || !pxPerCm) return null;
    const verticalPxNat = Math.abs(ankleTakeoff.natY - ankleApex.natY);
    return verticalPxNat / pxPerCm / 100;
  };
  const heightM = computeHeight();

  const confirm = () => {
    if (heightM == null) { setError("Mark the ankle at takeoff and apex."); return; }
    onConfirm(heightM);
  };

  const undoLast = () => {
    if (ankleApex) setAnkleApex(null);
    else if (ankleTakeoff) setAnkleTakeoff(null);
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
            <div ref={overlayRef} onClick={handleOverlayClick} className={`absolute inset-0 ${marking ? "cursor-crosshair" : "pointer-events-none"}`}>
              {ankleTakeoff && <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-destructive" style={{ left: ankleTakeoff.dispX, top: ankleTakeoff.dispY }} />}
              {ankleApex && <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-destructive" style={{ left: ankleApex.dispX, top: ankleApex.dispY }} />}
              {ankleTakeoff && ankleApex && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <line x1={ankleTakeoff.dispX} y1={ankleTakeoff.dispY} x2={ankleTakeoff.dispX} y2={ankleApex.dispY} stroke="hsl(var(--destructive))" strokeWidth={2} />
                </svg>
              )}
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
            <div className="flex gap-1">
              <button onClick={() => setMarking(false)} className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium ${!marking ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>
                <Play className="h-3.5 w-3.5" /> Playback
              </button>
              <button onClick={() => setMarking(true)} className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium ${marking ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>
                <MousePointer2 className="h-3.5 w-3.5" /> Mark
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-medium">
                {!ankleTakeoff ? `Mark: ${point1Label}` : !ankleApex ? `Mark: ${point2Label}` : "✓ Markers placed"}
              </span>
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

            <Button onClick={undoLast} variant="outline" size="sm" disabled={!ankleTakeoff && !ankleApex} className="w-full">
              <Hand className="mr-1 h-3.5 w-3.5" /> Undo last marker
            </Button>
        </div>
      )}
      {error && <p className="bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">{error}</p>}

      <div className="flex gap-2 bg-black/80 p-3">
        {phase === "idle" && (
          <Button onClick={startRecording} className="flex-1 gradient-primary text-primary-foreground shadow-glow" disabled={!pxPerCm}>
            <Camera className="mr-2 h-4 w-4" /> Start recording
          </Button>
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
