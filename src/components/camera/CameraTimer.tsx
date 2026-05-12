import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CircleStop, Play, RotateCcw, Video, X } from "lucide-react";

export type Marker = { label: string; time: number };

interface CameraTimerProps {
  markerLabels: string[];
  onConfirm: (markers: Marker[]) => void;
  onClose: () => void;
}

export function CameraTimer({ markerLabels, onConfirm, onClose }: CameraTimerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [reviewMarkers, setReviewMarkers] = useState<number[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [captureFps, setCaptureFps] = useState<number>(60);

  const openCamera = async () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: captureFps, min: 30 } },
        audio: false,
      });
      const settings = stream.getVideoTracks()[0]?.getSettings();
      if (settings?.frameRate) setCaptureFps(Math.round(settings.frameRate));
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
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
    if (phase !== "review" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

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
    };
    recorder.start();
    recorderRef.current = recorder;
    startTimeRef.current = performance.now();
    setElapsed(0);
    setReviewMarkers([]);
    setPhase("recording");
  };

  const stopRecording = () => recorderRef.current?.stop();

  const restart = async () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setReviewMarkers([]);
    setElapsed(0);
    setCurrentTime(0);
    setPhase("idle");
    const tracksAlive = streamRef.current?.getVideoTracks().some((t) => t.readyState === "live");
    if (!tracksAlive) await openCamera();
    else if (videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play().catch(() => {});
    }
  };

  const captureReviewMarker = () => setReviewMarkers((m) => (m.length < markerLabels.length ? [...m, currentTime] : m));
  const undoLastReview = () => setReviewMarkers((m) => m.slice(0, -1));

  const confirm = () => {
    if (reviewMarkers.length !== markerLabels.length) {
      setError(`Missing ${markerLabels.length - reviewMarkers.length} marker(s).`);
      return;
    }
    const t0 = reviewMarkers[0];
    onConfirm(markerLabels.map((label, i) => ({ label, time: reviewMarkers[i] - t0 })));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 px-3 py-2 text-white">
        <div className="flex items-center gap-2"><Video className="h-4 w-4" /><span className="font-display text-sm uppercase">Camera chrono</span></div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-white hover:bg-white/10"><X className="h-5 w-5" /></Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {phase !== "review" && <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />}
        {phase === "review" && videoUrl && (
          <video ref={(el) => { playbackRef.current = el; if (el) el.playbackRate = playbackRate; }}
            src={videoUrl} playsInline controls
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
            className="h-full w-full object-contain" />
        )}

        {phase === "recording" && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-mono font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {elapsed.toFixed(2)}s
            </div>
          </div>
        )}

        {phase === "review" && (
          <div className="absolute inset-x-0 bottom-0 space-y-2 bg-black/80 p-3">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-mono">t = {currentTime.toFixed(3)}s</span>
              <span className="font-mono opacity-70">{captureFps} fps · {playbackRate}×</span>
              <span>{reviewMarkers.length}/{markerLabels.length}</span>
            </div>
            <div className="flex gap-1">
              {[0.1, 0.25, 0.5, 1].map((r) => (
                <button key={r} onClick={() => { setPlaybackRate(r); if (playbackRef.current) playbackRef.current.playbackRate = r; }}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${playbackRate === r ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>
                  {r === 1 ? "1×" : `${r}×`}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => { if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current.currentTime = Math.max(0, playbackRef.current.currentTime - 1 / captureFps); } }}
                className="flex-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white">◀ -1 frame</button>
              <button onClick={() => { if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current.currentTime = playbackRef.current.currentTime + 1 / captureFps; } }}
                className="flex-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white">+1 frame ▶</button>
            </div>
            <div className="flex gap-2">
              <Button onClick={captureReviewMarker} disabled={reviewMarkers.length >= markerLabels.length} className="flex-1 gradient-primary text-primary-foreground">
                Mark: {reviewMarkers.length < markerLabels.length ? markerLabels[reviewMarkers.length] : "✓"}
              </Button>
              <Button onClick={undoLastReview} variant="outline" disabled={reviewMarkers.length === 0}>Undo</Button>
            </div>
          </div>
        )}
      </div>

      {reviewMarkers.length > 0 && (
        <Card className="m-2 rounded-lg">
          <div className="space-y-1 p-2">
            {markerLabels.map((label, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-medium">{label}</span>
                <span className="font-mono text-muted-foreground">{reviewMarkers[i] !== undefined ? `${reviewMarkers[i].toFixed(3)}s` : "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && <p className="bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">{error}</p>}

      <div className="flex gap-2 bg-black/80 p-3">
        {phase === "idle" && (
          <Button onClick={startRecording} className="flex-1 gradient-primary text-primary-foreground shadow-glow">
            <Camera className="mr-2 h-4 w-4" /> Start recording
          </Button>
        )}
        {phase === "recording" && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1"><CircleStop className="mr-2 h-4 w-4" /> Stop</Button>
        )}
        {phase === "review" && (
          <>
            <Button onClick={restart} variant="outline" className="flex-1"><RotateCcw className="mr-2 h-4 w-4" /> Redo</Button>
            <Button onClick={confirm} disabled={reviewMarkers.length !== markerLabels.length} className="flex-1 gradient-primary text-primary-foreground">
              <Play className="mr-2 h-4 w-4" /> Confirm
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
