import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Circle, Crosshair, Flag, Pause, Play, Sparkles, Square, Upload, Video, X } from "lucide-react";
import { trackPelvisX, computeSplitTimesFromSamples, type PoseSample } from "@/lib/poseDetection";

export interface AnalyzerSplitResult {
  distance: number;
  time: number;
  source: "video" | "ai";
  confidence: number;
}

export interface AnalyzerConfirmPayload {
  splits: AnalyzerSplitResult[];
  videoFps?: number;
}

interface Props {
  distances: number[];
  testDistance: number;
  onClose: () => void;
  onConfirm: (payload: AnalyzerConfirmPayload) => void;
}

type VideoFrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, metadata: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

type CalibStep = "none" | "set0" | "setRef";

const FRAME_STEP = 1 / 60;

type Mode = "choose" | "record";

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function SprintVideoAnalyzer({ distances, testDistance, onClose, onConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [recError, setRecError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startOffset, setStartOffset] = useState<number | null>(null);
  const [tags, setTags] = useState<Record<number, { time: number; source: "video" | "ai"; confidence: number }>>({});
  const [calibStep, setCalibStep] = useState<CalibStep>("none");
  const [calib, setCalib] = useState<{ x0?: number; xRef?: number; refMeters: number }>({ refMeters: testDistance });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiError, setAiError] = useState("");
  const [samples, setSamples] = useState<PoseSample[] | null>(null);
  const [measuredFps, setMeasuredFps] = useState<number | undefined>(undefined);
  const [draggingMarker, setDraggingMarker] = useState<"x0" | "xRef" | null>(null);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(0);
  const [draggingCrop, setDraggingCrop] = useState<"start" | "end" | null>(null);
  const cropTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setCropStart(0); setCropEnd(duration || 0); }, [duration]);
  const fpsMeasuredRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Fluid timeline: drive currentTime via rAF while playing
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    const loop = () => {
      const v = videoRef.current;
      if (v) setCurrentTime(v.currentTime);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [playing]);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  useEffect(() => { setCalib((c) => ({ ...c, refMeters: testDistance })); }, [testDistance]);

  useEffect(() => () => { stopStream(); }, []);

  const stopStream = () => {
    if (recTimerRef.current !== null) { window.clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async (preferredId?: string) => {
    setRecError("");
    try {
      stopStream();
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: preferredId
          ? { deviceId: { exact: preferredId } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, frameRate: { ideal: 60 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      const settings = stream.getVideoTracks()[0]?.getSettings();
      const active = settings?.deviceId;
      if (active) setDeviceId(active);
      if (settings?.frameRate) setMeasuredFps(Math.round(settings.frameRate));
    } catch (e) {
      const err = e as DOMException;
      if (err.name === "NotAllowedError") setRecError("Autorisez l'accès caméra dans le navigateur.");
      else if (err.name === "NotFoundError") setRecError("Aucune caméra détectée.");
      else setRecError(err.message || "Impossible d'ouvrir la caméra.");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setRecError("");
    chunksRef.current = [];
    const mimeType = pickMimeType();
    try {
      const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
        chunksRef.current = [];
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStartOffset(null);
        setTags({});
        setSamples(null);
        setCalib({ refMeters: testDistance });
        stopStream();
        setMode("choose");
      };
      recorderRef.current = rec;
      rec.start(250);
      setRecording(true);
      const startedAt = performance.now();
      setRecElapsed(0);
      recTimerRef.current = window.setInterval(() => {
        setRecElapsed((performance.now() - startedAt) / 1000);
      }, 100);
    } catch (e) {
      setRecError((e as Error).message || "MediaRecorder indisponible.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setRecording(false);
    if (recTimerRef.current !== null) { window.clearInterval(recTimerRef.current); recTimerRef.current = null; }
  };

  const enterRecordMode = async () => {
    setMode("record");
    await new Promise((r) => setTimeout(r, 0));
    await openCamera();
  };

  const cancelRecord = () => {
    if (recording) {
      try { recorderRef.current?.stop(); } catch { /* noop */ }
      setRecording(false);
    }
    stopStream();
    setMode("choose");
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(f));
    setStartOffset(null);
    setTags({});
    setSamples(null);
    setCalib({ refMeters: testDistance });
  };

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const stepFrame = (delta: number) => {
    const v = videoRef.current; if (!v) return;
    v.pause(); setPlaying(false);
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + delta));
  };

  const markStart = () => {
    const v = videoRef.current; if (!v) return;
    setStartOffset(v.currentTime);
    setTags({});
  };

  const tagDistance = (d: number) => {
    const v = videoRef.current; if (!v) return;
    if (startOffset === null) return;
    const t = v.currentTime - startOffset;
    if (t <= 0) return;
    setTags((prev) => ({ ...prev, [d]: { time: t, source: "video", confidence: 1 } }));
  };

  const onOverlayClick = (e: React.MouseEvent) => {
    if (draggingMarker) return;
    if (calibStep === "none") return;
    const el = overlayRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const xNorm = (e.clientX - rect.left) / rect.width;
    if (calibStep === "set0") {
      setCalib((c) => ({ ...c, x0: xNorm }));
      setCalibStep("setRef");
    } else if (calibStep === "setRef") {
      setCalib((c) => ({ ...c, xRef: xNorm }));
      setCalibStep("none");
    }
  };

  const getOverlayXNorm = (clientX: number): number | null => {
    const el = overlayRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const onMarkerPointerDown = (which: "x0" | "xRef") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingMarker(which);
  };
  const onMarkerPointerMove = (which: "x0" | "xRef") => (e: React.PointerEvent) => {
    if (draggingMarker !== which) return;
    const x = getOverlayXNorm(e.clientX); if (x === null) return;
    setCalib((c) => ({ ...c, [which]: x }));
  };
  const onMarkerPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    setDraggingMarker(null);
  };
  const onMarkerKeyDown = (which: "x0" | "xRef") => (e: React.KeyboardEvent) => {
    const el = overlayRef.current; if (!el) return;
    const px = 1 / el.getBoundingClientRect().width;
    const cur = calib[which]; if (cur === undefined) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); setCalib((c) => ({ ...c, [which]: Math.max(0, cur - px) })); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setCalib((c) => ({ ...c, [which]: Math.min(1, cur + px) })); }
  };

  // Crop timeline drag
  const getCropTime = (clientX: number): number => {
    const el = cropTrackRef.current; if (!el || !duration) return 0;
    const rect = el.getBoundingClientRect();
    const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return r * duration;
  };
  const onCropHandleDown = (which: "start" | "end") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingCrop(which);
  };
  const onCropHandleMove = (which: "start" | "end") => (e: React.PointerEvent) => {
    if (draggingCrop !== which) return;
    const t = getCropTime(e.clientX);
    if (which === "start") setCropStart(Math.min(t, cropEnd - 0.1));
    else setCropEnd(Math.max(t, cropStart + 0.1));
  };
  const onCropHandleUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    setDraggingCrop(null);
  };
  const onTrackClick = (e: React.MouseEvent) => {
    if (draggingCrop) return;
    const t = getCropTime(e.clientX);
    if (t < cropStart || t > cropEnd) return;
    const v = videoRef.current; if (v) v.currentTime = t;
  };

  const runAI = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (calib.x0 === undefined || calib.xRef === undefined) {
      setAiError("Configurez la calibration vidéo (0 m + distance de référence) avant l'analyse IA.");
      return;
    }
    if (startOffset === null) {
      setAiError("Marquez l'instant de départ (0 m) sur la timeline avant l'analyse IA.");
      return;
    }
    setAiError("");
    setAiBusy(true);
    setAiProgress(0);
    try {
      const collected = await trackPelvisX(v, { sampleRateHz: 30, onProgress: setAiProgress, startTime: cropStart, endTime: cropEnd });
      setSamples(collected);
      const computed = computeSplitTimesFromSamples(
        collected,
        distances,
        { x0Norm: calib.x0, xRefNorm: calib.xRef, refMeters: calib.refMeters },
        startOffset,
      );
      const next: typeof tags = {};
      for (const c of computed) {
        next[c.distance] = { time: c.time, source: "ai", confidence: c.confidence };
      }
      setTags((prev) => ({ ...prev, ...next }));
    } catch (e) {
      setAiError((e as Error).message || "Erreur d'analyse IA");
    } finally {
      setAiBusy(false);
    }
  };

  const measureFpsFromVideo = () => {
    if (fpsMeasuredRef.current) return;
    const v = videoRef.current as VideoFrameCallbackVideo | null;
    if (!v || typeof v.requestVideoFrameCallback !== "function") return;
    fpsMeasuredRef.current = true;
    let frames = 0;
    let firstTs = 0;
    const tick = (now: number) => {
      if (!firstTs) firstTs = now;
      frames++;
      const elapsed = (now - firstTs) / 1000;
      if (elapsed < 1 && frames < 120) {
        v.requestVideoFrameCallback!(tick);
      } else {
        const fps = elapsed > 0 ? Math.round(frames / elapsed) : 0;
        if (fps > 0) setMeasuredFps(fps);
      }
    };
    v.requestVideoFrameCallback!(tick);
  };

  const confirm = () => {
    const out: AnalyzerSplitResult[] = distances
      .map((d) => {
        const t = tags[d];
        return t ? { distance: d, time: parseFloat(t.time.toFixed(3)), source: t.source, confidence: t.confidence } : null;
      })
      .filter((x): x is AnalyzerSplitResult => x !== null);
    onConfirm({ splits: out, videoFps: measuredFps });
  };

  const tagsCount = Object.keys(tags).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <Card className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold uppercase">Analyse vidéo IA — Sprint</h2>
          </div>
          <Button size="icon" variant="ghost" onClick={() => { stopStream(); onClose(); }}><X className="h-4 w-4" /></Button>
        </div>
        <CardContent className="flex-1 space-y-3 overflow-y-auto p-3">
          {mode === "record" ? (
            <div className="space-y-3">
              <div className="relative w-full overflow-hidden rounded-md bg-black">
                <video ref={liveRef} className="block w-full" playsInline autoPlay muted />
                {recording && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    REC {recElapsed.toFixed(1)}s
                  </div>
                )}
              </div>
              {devices.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Caméra</Label>
                  <select
                    value={deviceId}
                    onChange={(e) => { setDeviceId(e.target.value); openCamera(e.target.value); }}
                    disabled={recording}
                    className="flex-1 rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                  >
                    {devices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Caméra ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              )}
              {recError && <p className="text-xs text-destructive">{recError}</p>}
              <div className="flex justify-between gap-2">
                <Button variant="outline" size="sm" onClick={cancelRecord}>Annuler</Button>
                {!recording ? (
                  <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={startRecording} disabled={!streamRef.current}>
                    <Circle className="mr-1.5 h-3.5 w-3.5 fill-current" /> Démarrer l'enregistrement
                  </Button>
                ) : (
                  <Button size="sm" onClick={stopRecording}>
                    <Square className="mr-1.5 h-3.5 w-3.5 fill-current" /> Arrêter
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Place la caméra perpendiculaire à la course, à hauteur de hanche. Idéalement 60 fps — le navigateur peut limiter à 30 fps.
              </p>
            </div>
          ) : !videoUrl ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={enterRecordMode}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input py-10 text-sm text-muted-foreground hover:border-primary"
              >
                <Video className="h-6 w-6 text-primary" />
                <span className="font-medium text-foreground">Filmer maintenant</span>
                <span className="text-center text-xs">Ouvre la webcam / caméra du téléphone et enregistre directement</span>
              </button>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input py-10 text-sm text-muted-foreground hover:border-primary">
                <Upload className="h-6 w-6 text-primary" />
                <span className="font-medium text-foreground">Importer une vidéo</span>
                <span className="text-center text-xs">MP4, MOV depuis la galerie ou l'ordinateur</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          ) : (
            <>
              <div className="flex justify-center rounded-md bg-black overflow-hidden">
                <div ref={overlayRef} className="relative inline-block" onClick={onOverlayClick}>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="block max-h-[50vh] w-auto max-w-full"
                    playsInline
                    onLoadedMetadata={(e) => { setDuration((e.target as HTMLVideoElement).duration); }}
                    onTimeUpdate={(e) => { if (!playing) setCurrentTime((e.target as HTMLVideoElement).currentTime); }}
                    onPlay={() => { setPlaying(true); measureFpsFromVideo(); }}
                    onPause={() => setPlaying(false)}
                  />
                  {calib.x0 !== undefined && (
                    <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary" style={{ left: `${calib.x0 * 100}%` }}>
                      <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">0m</span>
                    </div>
                  )}
                  {calib.xRef !== undefined && (
                    <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-destructive" style={{ left: `${calib.xRef * 100}%` }}>
                      <span className="absolute left-1 top-1 rounded bg-destructive px-1 text-[10px] font-bold text-white">{calib.refMeters}m</span>
                    </div>
                  )}
                  {calibStep !== "none" && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-center text-xs font-medium text-white">
                      Cliquez sur la position du repère {calibStep === "set0" ? "0 m" : `${calib.refMeters} m`} dans la vidéo
                    </div>
                  )}
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={FRAME_STEP}
                value={currentTime}
                onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = parseFloat(e.target.value); }}
                className="w-full accent-primary"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" onClick={() => stepFrame(-FRAME_STEP)} aria-label="Frame -1"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" onClick={togglePlay} aria-label="Play/Pause">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                  <Button size="icon" variant="outline" onClick={() => stepFrame(FRAME_STEP)} aria-label="Frame +1"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{currentTime.toFixed(3)}s / {duration.toFixed(2)}s</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-md border p-2">
                  <div className="text-xs font-bold uppercase text-muted-foreground">Pointage manuel</div>
                  <Button size="sm" variant={startOffset !== null ? "outline" : "default"} className="w-full" onClick={markStart}>
                    <Flag className="mr-1.5 h-3.5 w-3.5" />
                    {startOffset !== null ? `Départ marqué à ${startOffset.toFixed(3)}s — re-marquer` : "Marquer le départ (0 m)"}
                  </Button>
                  <div className="grid grid-cols-2 gap-1.5">
                    {distances.map((d) => {
                      const tag = tags[d];
                      return (
                        <Button
                          key={d}
                          size="sm"
                          variant={tag ? "secondary" : "outline"}
                          disabled={startOffset === null}
                          onClick={() => tagDistance(d)}
                          className="justify-between text-xs"
                        >
                          <span>{d}m</span>
                          <span className="font-mono">{tag ? `${tag.time.toFixed(2)}s${tag.source === "ai" ? " IA" : ""}` : "—"}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border p-2">
                  <div className="text-xs font-bold uppercase text-muted-foreground">Calibration + IA</div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Distance de réf.</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={calib.refMeters}
                      onChange={(e) => setCalib((c) => ({ ...c, refMeters: parseFloat(e.target.value) || 0 }))}
                      className="h-7 w-20 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button size="sm" variant={calib.x0 !== undefined ? "secondary" : "outline"} onClick={() => setCalibStep("set0")}>
                      <Crosshair className="mr-1 h-3 w-3" /> Repère 0 m
                    </Button>
                    <Button size="sm" variant={calib.xRef !== undefined ? "secondary" : "outline"} onClick={() => setCalibStep("setRef")}>
                      <Crosshair className="mr-1 h-3 w-3" /> Repère {calib.refMeters}m
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gradient-primary text-primary-foreground"
                    disabled={aiBusy || calib.x0 === undefined || calib.xRef === undefined || startOffset === null}
                    onClick={runAI}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {aiBusy ? `Analyse… ${(aiProgress * 100).toFixed(0)}%` : "Lancer l'analyse IA pose"}
                  </Button>
                  {samples && (
                    <p className="text-[10px] text-muted-foreground">{samples.length} échantillons pose détectés</p>
                  )}
                  {aiError && <p className="text-[10px] text-destructive">{aiError}</p>}
                </div>
              </div>
            </>
          )}
        </CardContent>
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
          <span className="text-xs text-muted-foreground">{tagsCount} / {distances.length} splits renseignés</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" disabled={tagsCount === 0} onClick={confirm}>Valider les splits</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
