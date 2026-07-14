import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listPlayers, listTeams, getPlayer } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Check, Plus, Ruler, Sparkles, Trash2 } from "lucide-react";
import logoJump from "@/assets/logo-jump-neon.png";
import { calculateJumpProfile, type JumpTrial } from "@/lib/fvCalculations";
import { CameraDistance } from "@/components/camera/CameraDistance";
import { CameraCalibration } from "@/components/camera/CameraCalibration";
import { CameraAIJump } from "@/components/camera/CameraAIJump";
import {
  saveLocalTest, getSessionCalibration, setSessionCalibration, consumeTestDraft,
} from "@/lib/localHistory";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";

export default function JumpTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useSettings();
  const [params] = useSearchParams();
  const initialAthleteId = params.get("athleteId") ?? params.get("playerId") ?? "";

  const players = useMemo(() => (user ? listPlayers(undefined, user.organizationId) : []), [user]);
  const teams = useMemo(() => (user ? listTeams(user.organizationId) : []), [user]);

  const [teamId, setTeamId] = useState<string>("");
  const [athleteId, setAthleteId] = useState(initialAthleteId);
  const [bodyMass, setBodyMass] = useState("");
  const [pushOff, setPushOff] = useState("0.30");
  const [trials, setTrials] = useState<JumpTrial[]>([
    { load: 0, jumpHeight: 0 },
    { load: 0, jumpHeight: 0 },
    { load: 0, jumpHeight: 0 },
    { load: 0, jumpHeight: 0 },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cameraIndex, setCameraIndex] = useState<number | null>(null);
  const [aiIndex, setAiIndex] = useState<number | null>(null);
  const [pxPerCm, setPxPerCm] = useState<number>(0);
  const [calibrating, setCalibrating] = useState(false);
  const [measuringHpo, setMeasuringHpo] = useState(false);

  useEffect(() => {
    const saved = getSessionCalibration();
    if (saved > 0) setPxPerCm(saved);
  }, []);

  useEffect(() => {
    if (!athleteId || teamId) return;
    const a = players.find((p) => p.id === athleteId);
    if (a?.teamId) setTeamId(a.teamId);
  }, [athleteId, players, teamId]);

  const filteredAthletes = teamId ? players.filter((p) => p.teamId === teamId) : players;

  useEffect(() => {
    const a = getPlayer(athleteId);
    if (a?.mass) {
      setBodyMass(String(a.mass));
    }
    if (a?.height) setPushOff(((a.height / 100) * 0.4).toFixed(2));
  }, [athleteId]);


  useEffect(() => {
    if (!athleteId) return;
    const draft = consumeTestDraft("jump", athleteId);
    if (!draft) return;
    const r = draft.rawData as { bodyMass?: number; pushOffDistance?: number; trials?: { load: number; jumpHeight: number }[] };
    if (r.bodyMass) setBodyMass(String(r.bodyMass));
    if (r.pushOffDistance) setPushOff(String(r.pushOffDistance));
    if (r.trials?.length) setTrials(r.trials.map((tr) => ({ load: tr.load, jumpHeight: tr.jumpHeight * 100 })));
  }, [athleteId]);

  const updateTrial = (i: number, field: keyof JumpTrial, value: string) => {
    const next = [...trials];
    next[i] = { ...next[i], [field]: parseFloat(value) || 0 };
    setTrials(next);
  };

  const submit = async () => {
    setError("");
    if (!user || !athleteId) { setError(t("selectAthleteFirst")); return; }
    const mass = parseFloat(bodyMass);
    const hPO = parseFloat(pushOff);
    const valid = trials.filter((tr) => tr.jumpHeight > 0);
    if (valid.length < 2 || !mass || !hPO) { setError(t("needJumps")); return; }

    setBusy(true);
    try {
      const jumpsM = valid.map((tr) => ({ load: tr.load, jumpHeight: tr.jumpHeight / 100 }));
      const results = calculateJumpProfile({ bodyMass: mass, pushOffDistance: hPO, trials: jumpsM });
      const rawData = { bodyMass: mass, pushOffDistance: hPO, trials: jumpsM };
      const athlete = players.find((p) => p.id === athleteId);
      const local = saveLocalTest({
        type: "jump",
        test_date: new Date().toISOString(),
        athlete_id: athleteId,
        athlete_snapshot: {
          first_name: athlete?.firstName ?? "",
          last_name: athlete?.lastName ?? "",
          sport: null,
          body_mass: mass,
        },
        raw_data: rawData,
        results,
      });
      navigate(`/app/tests/${local.id}`);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <img src={logoJump} alt={t("verticalJump")} loading="eager" decoding="async" fetchPriority="high" className="logo-themed h-14 w-14 object-contain flex-shrink-0" />
        <div>
          <h1 className="font-display text-2xl font-bold uppercase">{t("jumpTestTitle")}</h1>
          <p className="text-xs text-muted-foreground">{t("jumpTestSubtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t("cameraCalib")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("cameraCalibOptional")}</p>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCalibrating(true)} variant={pxPerCm ? "outline" : "default"} className={pxPerCm ? "" : "gradient-primary text-primary-foreground shadow-glow"}>
              <Ruler className="mr-2 h-4 w-4" />
              {pxPerCm ? t("recalibrate") : t("startCalibration")}
            </Button>
            {pxPerCm > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 font-mono text-xs text-primary">
                <Check className="h-3 w-3" /> {pxPerCm.toFixed(2)} px/cm
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t("athleteParams")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("team")}</Label>
            <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setAthleteId(""); }}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
              <option value="">{t("selectTeam")}</option>
              {teams.map((te) => (<option key={te.id} value={te.id}>{te.name}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("athlete")}</Label>
            <select required value={athleteId} onChange={(e) => setAthleteId(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
              <option value="">{t("selectEllipsis")}</option>
              {filteredAthletes.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("bodyMass")}</Label>
              <Input type="number" step="0.1" value={bodyMass} onChange={(e) => setBodyMass(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("hpo")}</Label>
              <div className="flex gap-1.5">
                <Input type="number" step="0.01" value={pushOff} onChange={(e) => setPushOff(e.target.value)} />
                <Button type="button" size="icon" variant="outline" onClick={() => setMeasuringHpo(true)} disabled={!pxPerCm} aria-label={t("measureHpo")}>
                  <Camera className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("hpoHint")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">{t("trials")}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setTrials([...trials, { load: 0, jumpHeight: 0 }])}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
            <span>{t("loadKg")}</span>
            <span>{t("jumpHeightCm")}</span>
            <span></span>
          </div>
          {trials.map((tr, i) => (
            <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center">
              <Input type="number" step="0.5" placeholder="kg" value={tr.load || ""} onChange={(e) => updateTrial(i, "load", e.target.value)} />
              <Input type="number" step="0.1" placeholder="cm" value={tr.jumpHeight || ""} onChange={(e) => updateTrial(i, "jumpHeight", e.target.value)} />
              <Button size="icon" variant="outline" onClick={() => setAiIndex(i)} aria-label={t("aiAutoDetect")} title={t("aiAutoDetect")}>
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setCameraIndex(i)} aria-label={t("camera")} disabled={!pxPerCm}>
                <Camera className="h-4 w-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setTrials(trials.filter((_, j) => j !== i))} aria-label={t("delete")}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">{t("aiHint")}</p>
        </CardContent>
      </Card>

      {calibrating && (
        <CameraCalibration
          onClose={() => setCalibrating(false)}
          onConfirm={(px) => { setPxPerCm(px); setSessionCalibration(px); setCalibrating(false); }}
        />
      )}

      {measuringHpo && (
        <CameraDistance
          pxPerCm={pxPerCm}
          title={t("measureHpo")}
          point1Label="ankle (low squat position)"
          point2Label="ankle (full extension)"
          onClose={() => setMeasuringHpo(false)}
          onConfirm={(meters) => { setPushOff(meters.toFixed(2)); setMeasuringHpo(false); }}
        />
      )}

      {cameraIndex !== null && (
        <CameraDistance
          pxPerCm={pxPerCm}
          onClose={() => setCameraIndex(null)}
          onConfirm={(heightMeters) => {
            const next = [...trials];
            next[cameraIndex] = { ...next[cameraIndex], jumpHeight: parseFloat((heightMeters * 100).toFixed(1)) };
            setTrials(next);
            setCameraIndex(null);
          }}
        />
      )}

      {aiIndex !== null && (
        <CameraAIJump
          onClose={() => setAiIndex(null)}
          onConfirm={({ jumpHeight }) => {
            const next = [...trials];
            next[aiIndex] = { ...next[aiIndex], jumpHeight: parseFloat((jumpHeight * 100).toFixed(1)) };
            setTrials(next);
            setAiIndex(null);
            toast.success(`${t("jumpDetected")}: ${(jumpHeight * 100).toFixed(1)} cm`);
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow h-12">
        {busy ? t("computing") : t("computeProfile")}
      </Button>
    </div>
  );
}
