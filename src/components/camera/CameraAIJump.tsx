import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CircleStop, RotateCcw, Sparkles, Upload, X, Loader2 } from "lucide-react";
import { getPoseLandmarker, PL, LOWER_BODY_CONNECTIONS, type FrameSample } from "@/lib/poseDetector";
import { detectJump, type JumpDetectionResult } from "@/lib/jumpDetection";

interface CameraAIJumpProps {
  onConfirm: (result: { jumpHeight: number; flightTime: number }) => void;
  onClose: () => void;
  initialMode?: "camera" | "upload";
}

type Phase = "idle" | "recording" | "analyzing" | "review";

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${m}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

export function CameraAIJump({ onConfirm, onClose, initialMode = "camera" }: CameraAIJumpProps) {
  const liveRef = useRef<HTMLVideoElement | null>(null);
  const playRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const samplesRef = useRef<FrameSample[]>([]);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trimBarRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captureFps, setCaptureFps] = useState(60);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<JumpDetectionResult | null>(null);
  const [error, setError] = useState("");
  const [adjustOffset, setAdjustOffset] = useState({ takeoff: 0, landing: 0 });
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [dragging, setDragging] = useState<null | "start" | "end">(null);

  const openCamera = async () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, min: 30 } },
        audio: false,
      });
      const s = stream.getVideoTracks()[0]?.getSettings();
      if (s?.frameRate) setCaptureFps(Math.round(s.frameRate));
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }
      setError("");
    } catch (e) {
      setError("Camera access denied or unavailable: " + (e as Error).message);
    }
  };

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
  };

  useEffect(() => {
    if (initialMode === "upload") {
      // Trigger file picker on mount, don't open the camera
      setTimeout(() => fileInputRef.current?.click(), 50);
    } else {
      openCamera();
    }
    getPoseLandmarker("heavy").catch(() => getPoseLandmarker("lite").catch(() => {}));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => setElapsed((performance.now() - startTimeRef.current) / 1000), 50);
    return () => window.clearInterval(id);
  }, [phase]);

  const pickMime = () => {
    for (const t of ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"])
      if (MediaRecorder.isTypeSupported(t)) return t;
    return "";
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = pickMime();
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      loadVideoBlob(URL.createObjectURL(blob));
    };
    rec.start();
    recorderRef.current = rec;
    startTimeRef.current = performance.now();
    setElapsed(0);
    setPhase("recording");
  };

  const stopRecording = () => recorderRef.current?.stop();

  const loadVideoBlob = (url: string) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(url);
    setPhase("review");
    setResult(null);
    setAdjustOffset({ takeoff: 0, landing: 0 });
    setDuration(0);
    setTrim({ start: 0, end: 0 });
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) {
      // user cancelled — if upload mode and no video yet, fall back to camera
      if (initialMode === "upload" && !videoUrl) openCamera();
      return;
    }
    stopCameraStream();
    setCaptureFps((fps) => fps || 30);
    loadVideoBlob(URL.createObjectURL(f));
  };

  const restart = async () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setResult(null);
    setElapsed(0);
    setProgress(0);
    setPhase("idle");
    setDuration(0);
    setTrim({ start: 0, end: 0 });
    samplesRef.current = [];
    const alive = streamRef.current?.getVideoTracks().some((t) => t.readyState === "live");
    if (!alive) await openCamera();
  };

  const onLoadedMetadata = () => {
    const v = playRef.current; if (!v) return;
    const d = isFinite(v.duration) ? v.duration : 0;
    setDuration(d);
    setTrim({ start: 0, end: d });
  };

  const analyze = async () => {
    const v = playRef.current;
    if (!v || !videoUrl) return;
    setError("");
    setPhase("analyzing");
    setProgress(0);
    samplesRef.current = [];

    let landmarker;
    try {
      landmarker = await getPoseLandmarker("heavy");
    } catch {
      try { landmarker = await getPoseLandmarker("lite"); }
      catch (e) { setError("Failed to load AI model: " + (e as Error).message); setPhase("review"); return; }
    }

    if (v.readyState < 1) await new Promise<void>((res) => { v.onloadedmetadata = () => res(); });
    const dur = v.duration;
    if (!isFinite(dur) || dur <= 0) {
      setError("Cannot read video duration. Try again.");
      setPhase("review");
      return;
    }

    const tStart = Math.max(0, Math.min(trim.start, dur));
    const tEnd = Math.min(dur, Math.max(trim.end, tStart + 0.05));
    const range = tEnd - tStart;
    const stepSec = 1 / (captureFps || 30);
    v.pause();
    v.muted = true;

    const seekTo = (time: number) =>
      new Promise<void>((resolve) => {
        const onSeeked = () => { v.removeEventListener("seeked", onSeeked); resolve(); };
        v.addEventListener("seeked", onSeeked);
        v.currentTime = Math.min(time, Math.max(0, dur - 0.001));
      });

    let t = tStart;
    let firstT: number | null = null;
    while (t <= tEnd - stepSec / 2) {
      await seekTo(t);
      try {
        const res = landmarker.detectForVideo(v, performance.now());
        const lm = res.landmarks?.[0] ?? null;
        if (lm) {
          const ids = [PL.LEFT_ANKLE, PL.RIGHT_ANKLE, PL.LEFT_HEEL, PL.RIGHT_HEEL, PL.LEFT_FOOT_INDEX, PL.RIGHT_FOOT_INDEX];
          const pts = ids.map((i) => lm[i]).filter(Boolean);
          const vis = pts.reduce((s, p) => s + (p.visibility ?? 0), 0) / Math.max(1, pts.length);
          const footY = pts.reduce((s, p) => s + p.y, 0) / Math.max(1, pts.length);
          const ankleY = ((lm[PL.LEFT_ANKLE]?.y ?? 0) + (lm[PL.RIGHT_ANKLE]?.y ?? 0)) / 2;
          if (firstT === null) firstT = t;
          samplesRef.current.push({ t: t - firstT, footY, ankleY, visibility: vis, landmarks: lm });
        }
      } catch {
        // skip
      }
      setProgress(Math.min(1, (t - tStart) / Math.max(0.001, range)));
      t += stepSec;
    }

    const det = detectJump(samplesRef.current);
    if (!det) {
      setError("Could not detect a jump. Make sure the athlete is fully visible (feet to head) in side view.");
      setPhase("review");
      return;
    }
    setResult(det);
    setPhase("review");
    setAdjustOffset({ takeoff: 0, landing: 0 });
    await seekTo(tStart + det.apexT);
    drawOverlay(det.apexIdx);
  };

  const drawOverlay = (sampleIdx: number) => {
    const c = canvasRef.current;
    const v = playRef.current;
    if (!c || !v) return;
    const w = v.clientWidth, h = v.clientHeight;
    if (!w || !h) return;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const sample = samplesRef.current[sampleIdx];
    if (!sample?.landmarks) return;

    const nW = v.videoWidth, nH = v.videoHeight;
    const elAR = w / h, natAR = nW / nH;
    let dW: number, dH: number, oX = 0, oY = 0;
    if (natAR > elAR) { dW = w; dH = w / natAR; oY = (h - dH) / 2; }
    else { dH = h; dW = h * natAR; oX = (w - dW) / 2; }

    const toPx = (lm: { x: number; y: number }) => ({ x: oX + lm.x * dW, y: oY + lm.y * dH });

    ctx.strokeStyle = "hsl(160, 84%, 50%)";
    ctx.lineWidth = 2;
    for (const [a, b] of LOWER_BODY_CONNECTIONS) {
      const la = sample.landmarks[a], lb = sample.landmarks[b];
      if (!la || !lb) continue;
      if ((la.visibility ?? 0) < 0.3 || (lb.visibility ?? 0) < 0.3) continue;
      const pa = toPx(la), pb = toPx(lb);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
    ctx.fillStyle = "hsl(160, 84%, 60%)";
    for (const i of [PL.LEFT_HIP, PL.RIGHT_HIP, PL.LEFT_KNEE, PL.RIGHT_KNEE, PL.LEFT_ANKLE, PL.RIGHT_ANKLE, PL.LEFT_HEEL, PL.RIGHT_HEEL, PL.LEFT_FOOT_INDEX, PL.RIGHT_FOOT_INDEX]) {
      const lm = sample.landmarks[i];
      if (!lm || (lm.visibility ?? 0) < 0.3) continue;
      const p = toPx(lm);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  };

  const adjusted = result
    ? (() => {
        const ft = Math.max(0, (result.landingT + adjustOffset.landing) - (result.takeoffT + adjustOffset.takeoff));
        return { flightTime: ft, height: (9.81 * ft * ft) / 8 };
      })()
    : null;

  const confirm = () => {
    if (!adjusted) return;
    onConfirm({ jumpHeight: adjusted.height, flightTime: adjusted.flightTime });
  };

  const seekToTime = (timeAbs: number) => {
    const v = playRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration - 0.001, timeAbs));
  };

  // ---- Trim bar interaction ----
  const trimFromClientX = (clientX: number) => {
    const el = trimBarRef.current;
    if (!el || duration <= 0) return 0;
    const r = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return ratio * duration;
  };

  const onTrimPointerDown = (which: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(which);
  };

  const onTrimPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const t = trimFromClientX(e.clientX);
    setTrim((cur) => {
      const min = 0.1;
      if (dragging === "start") return { start: Math.min(t, cur.end - min), end: cur.end };
      return { start: cur.start, end: Math.max(t, cur.start + min) };
    });
    if (playRef.current) playRef.current.currentTime = t;
  };

  const onTrimPointerUp = () => setDragging(null);

  const onTrackClick = (e: React.PointerEvent) => {
    if (dragging) return;
    const t = trimFromClientX(e.clientX);
    const dStart = Math.abs(t - trim.start);
    const dEnd = Math.abs(t - trim.end);
    setTrim((cur) => {
      if (dStart < dEnd) return { start: Math.min(t, cur.end - 0.1), end: cur.end };
      return { start: cur.start, end: Math.max(t, cur.start + 0.1) };
    });
  };

  const startPct = duration > 0 ? (trim.start / duration) * 100 : 0;
  const endPct = duration > 0 ? (trim.end / duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ height: "100svh" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFilePicked}
      />

      <div className="flex items-center justify-between bg-black/80 px-3 py-2 text-white">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="font-display text-sm uppercase">AI jump detection</span></div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-white hover:bg-white/10"><X className="h-5 w-5" /></Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {phase !== "review" && phase !== "analyzing" && <video ref={liveRef} playsInline muted className="h-full w-full object-cover" />}
        {(phase === "review" || phase === "analyzing") && videoUrl && (
          <>
            <video
              ref={(el) => { playRef.current = el; }}
              src={videoUrl}
              playsInline
              controls={phase === "review"}
              onLoadedMetadata={onLoadedMetadata}
              className="h-full w-full object-contain"
              onTimeUpdate={() => {
                if (!result) return;
                const v = playRef.current; if (!v) return;
                const tRel = v.currentTime - trim.start;
                let bestI = 0, bestD = Infinity;
                for (let i = 0; i < samplesRef.current.length; i++) {
                  const d = Math.abs(samplesRef.current[i].t - tRel);
                  if (d < bestD) { bestD = d; bestI = i; }
                }
                drawOverlay(bestI);
              }}
            />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          </>
        )}

        {phase === "recording" && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-mono font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {elapsed.toFixed(2)}s
            </div>
          </div>
        )}

        {phase === "analyzing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="font-display text-sm uppercase">Analyzing pose…</div>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
              <div className="h-full bg-primary transition-all" style={{ width: `${(progress * 100).toFixed(0)}%` }} />
            </div>
            <div className="font-mono text-xs opacity-70">{(progress * 100).toFixed(0)}%</div>
          </div>
        )}
      </div>

      {phase === "review" && duration > 0 && (
        <div className="bg-black/80 px-3 pt-2 text-white">
          <div className="mb-1 flex items-center justify-between text-[10px] font-mono opacity-80">
            <span>⤒ {fmtTime(trim.start)}</span>
            <span className="opacity-60">analysis range · {fmtTime(trim.end - trim.start)}</span>
            <span>⤓ {fmtTime(trim.end)}</span>
          </div>
          <div
            ref={trimBarRef}
            className="relative h-6 w-full touch-none select-none"
            onPointerMove={onTrimPointerMove}
            onPointerUp={onTrimPointerUp}
            onPointerCancel={onTrimPointerUp}
            onPointerDown={onTrackClick}
          >
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/60"
              style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
            />
            <div
              role="slider"
              aria-label="Trim start"
              className="absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm bg-primary shadow"
              style={{ left: `${startPct}%` }}
              onPointerDown={onTrimPointerDown("start")}
            />
            <div
              role="slider"
              aria-label="Trim end"
              className="absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm bg-primary shadow"
              style={{ left: `${endPct}%` }}
              onPointerDown={onTrimPointerDown("end")}
            />
          </div>
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => setTrim({ start: 0, end: duration })}
              className="text-[10px] uppercase tracking-wide text-white/60 hover:text-white"
            >
              Reset range
            </button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <Card className="m-2 rounded-lg">
          <div className="space-y-2 p-3 text-xs">
            {!result && (
              <p className="text-muted-foreground">
                Drag the handles to choose the segment containing the jump, then tap <strong>Analyze with AI</strong>.
              </p>
            )}
            {result && adjusted && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-primary/15 p-2">
                    <div className="font-mono text-base text-primary">{(adjusted.height * 100).toFixed(1)} cm</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Jump height (flight time)</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="font-mono text-base">{(adjusted.flightTime * 1000).toFixed(0)} ms</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Flight time · conf {(result.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button onClick={() => seekToTime(trim.start + result.takeoffT + adjustOffset.takeoff)} className="rounded-md bg-white/10 px-2 py-1 text-white">⤒ Takeoff</button>
                  <button onClick={() => seekToTime(trim.start + result.apexT)} className="rounded-md bg-white/10 px-2 py-1 text-white">▲ Apex</button>
                  <button onClick={() => seekToTime(trim.start + result.landingT + adjustOffset.landing)} className="rounded-md bg-white/10 px-2 py-1 text-white">⤓ Landing</button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Takeoff fine-tune</span>
                    <span className="font-mono">{(adjustOffset.takeoff * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setAdjustOffset((a) => ({ ...a, takeoff: a.takeoff - 1 / captureFps }))} className="flex-1 rounded-md bg-white/10 px-2 py-1 text-white">−1f</button>
                    <button onClick={() => setAdjustOffset((a) => ({ ...a, takeoff: 0 }))} className="rounded-md bg-white/10 px-2 py-1 text-white">reset</button>
                    <button onClick={() => setAdjustOffset((a) => ({ ...a, takeoff: a.takeoff + 1 / captureFps }))} className="flex-1 rounded-md bg-white/10 px-2 py-1 text-white">+1f</button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Landing fine-tune</span>
                    <span className="font-mono">{(adjustOffset.landing * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setAdjustOffset((a) => ({ ...a, landing: a.landing - 1 / captureFps }))} className="flex-1 rounded-md bg-white/10 px-2 py-1 text-white">−1f</button>
                    <button onClick={() => setAdjustOffset((a) => ({ ...a, landing: 0 }))} className="rounded-md bg-white/10 px-2 py-1 text-white">reset</button>
                    <button onClick={() => setAdjustOffset((a) => ({ ...a, landing: a.landing + 1 / captureFps }))} className="flex-1 rounded-md bg-white/10 px-2 py-1 text-white">+1f</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {error && <p className="bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">{error}</p>}

      <div className="flex gap-2 bg-black/80 p-3">
        {phase === "idle" && (
          <>
            <Button onClick={startRecording} className="flex-1 gradient-primary text-primary-foreground shadow-glow">
              <Camera className="mr-2 h-4 w-4" /> Record
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
              <Upload className="mr-2 h-4 w-4" /> Import video
            </Button>
          </>
        )}
        {phase === "recording" && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1"><CircleStop className="mr-2 h-4 w-4" /> Stop</Button>
        )}
        {phase === "review" && (
          <>
            <Button onClick={restart} variant="outline" size="icon" aria-label="Redo"><RotateCcw className="h-4 w-4" /></Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="icon" aria-label="Import another video"><Upload className="h-4 w-4" /></Button>
            {!result && (
              <Button onClick={analyze} className="flex-1 gradient-primary text-primary-foreground">
                <Sparkles className="mr-2 h-4 w-4" /> Analyze with AI
              </Button>
            )}
            {result && adjusted && (
              <Button onClick={confirm} className="flex-1 gradient-primary text-primary-foreground">
                Confirm ({(adjusted.height * 100).toFixed(1)} cm)
              </Button>
            )}
          </>
        )}
        {phase === "analyzing" && (
          <Button disabled className="flex-1"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</Button>
        )}
      </div>
    </div>
  );
}
