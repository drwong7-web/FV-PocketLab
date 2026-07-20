import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listPlayers, listTeams } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Plus, Trash2, Sparkles, Video, MapPin, Loader2, RefreshCw, AlertTriangle, Wind } from "lucide-react";
import { Link } from "react-router-dom";
import logoSprint from "@/assets/logo-sprint-neon.png";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { fetchCurrentWeather, getBrowserPosition } from "@/lib/weather";
import {
  calculateSprintProfile,
  defaultSplitsForDistance,
  SPRINT_DEMO,
  SHOE_LABELS,
  airDensity,
  frontalArea,
  simulateSplitTime,
  type ShoeType,
  type SprintSplit,
} from "@/lib/fvCalculations";
import { CameraTimer } from "@/components/camera/CameraTimer";
import { SprintVideoAnalyzer } from "@/components/camera/SprintVideoAnalyzer";
import { saveLocalTest, consumeTestDraft } from "@/lib/localHistory";
import { useSettings } from "@/lib/settings";

type SplitRow = SprintSplit & {
  source?: "manual" | "video" | "ai";
  confidence?: number;
};

type TestDistance = 30 | 40 | 60;
type StartType = "standing" | "three_point" | "blocks";
type Surface = "track" | "grass" | "synthetic" | "indoor";

export default function SprintTest() {
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
  const [height, setHeight] = useState("");
  const [airTemp, setAirTemp] = useState("20");
  const [airPressure, setAirPressure] = useState("760");
  const [windSpeed, setWindSpeed] = useState("0");
  const [windDir, setWindDir] = useState<"tail" | "head" | "none">("none");
  const signedWind = () => {
    if (windDir === "none") return 0;
    const v = Math.abs(parseFloat(windSpeed) || 0);
    return windDir === "head" ? -v : v;
  };
  const [testDistance, setTestDistance] = useState<TestDistance>(30);
  const [startType, setStartType] = useState<StartType>("standing");
  const [surface, setSurface] = useState<Surface>("track");
  const [shoeType, setShoeType] = useState<ShoeType>("spikes");
  const [notes, setNotes] = useState("");
  const [splits, setSplits] = useState<SplitRow[]>(
    defaultSplitsForDistance(30).map((d) => ({ distance: d, time: 0, source: "manual", confidence: 1 })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [videoFps, setVideoFps] = useState<number | undefined>(undefined);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoInfo, setGeoInfo] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const autofillWeather = async () => {
    setGeoBusy(true);
    setGeoError(null);
    try {
      const pos = await getBrowserPosition();
      const w = await fetchCurrentWeather(pos.coords.latitude, pos.coords.longitude);
      setAirTemp(w.temperatureC.toFixed(1));
      setAirPressure(Math.round(w.pressureHpa).toString());
      setWindSpeed(Math.abs(w.windSpeedMs).toFixed(1));
      const observed = new Date(w.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setGeoInfo(`${w.locationName} — ${observed}.`);
      toast.success(t("weatherImported"));
    } catch (e) {
      const err = e as GeolocationPositionError | Error;
      let msg = t("weatherError");
      if ("code" in err) {
        if (err.code === 1) msg = t("allowLocation");
        else if (err.code === 3) msg = t("timeoutRetry");
      } else if (err.message) {
        msg = err.message;
      }
      setGeoError(msg);
      toast.error(msg);
    } finally {
      setGeoBusy(false);
    }
  };

  useEffect(() => {
    if (!athleteId || teamId) return;
    const a = players.find((p) => p.id === athleteId);
    if (a?.teamId) setTeamId(a.teamId);
  }, [athleteId, players, teamId]);

  const filteredAthletes = teamId ? players.filter((p) => p.teamId === teamId) : players;

  useEffect(() => {
    const a = players.find((p) => p.id === athleteId);
    if (a?.mass) setBodyMass(String(a.mass));
    if (a?.height) setHeight((a.height / 100).toFixed(2));
  }, [athleteId, players]);

  useEffect(() => {
    if (!athleteId) return;
    const draft = consumeTestDraft("sprint", athleteId);
    if (!draft) return;
    const r = draft.rawData as { bodyMass?: number; height?: number; airTemperature?: number; airPressure?: number; windSpeed?: number; splits?: SprintSplit[] };
    if (r.bodyMass) setBodyMass(String(r.bodyMass));
    if (r.height) setHeight(String(r.height));
    if (r.airTemperature !== undefined) setAirTemp(String(r.airTemperature));
    if (r.airPressure !== undefined) setAirPressure(String(r.airPressure));
    if (r.windSpeed !== undefined) {
      const w = r.windSpeed;
      setWindSpeed(String(Math.abs(w)));
      setWindDir(w > 0.001 ? "tail" : w < -0.001 ? "head" : "none");
    }
    if (r.splits?.length) setSplits(r.splits.map((s) => ({ ...s, source: "manual", confidence: 1 })));
  }, [athleteId]);

  const updateSplit = (i: number, field: keyof SprintSplit, value: string) => {
    const next = [...splits];
    next[i] = { ...next[i], [field]: parseFloat(value) || 0, source: "manual", confidence: 1 };
    setSplits(next);
  };

  const changeTestDistance = (d: TestDistance) => {
    setTestDistance(d);
    setSplits(defaultSplitsForDistance(d).map((dist) => {
      const existing = splits.find((s) => s.distance === dist);
      return existing ?? { distance: dist, time: 0, source: "manual", confidence: 1 };
    }));
  };

  const loadDemo = () => {
    setBodyMass(String(SPRINT_DEMO.athlete.bodyMass));
    setHeight(String(SPRINT_DEMO.athlete.height));
    setTestDistance(30);
    setSplits(SPRINT_DEMO.splits.map((s) => ({ ...s, source: "manual", confidence: 1 })));
  };

  const submit = async () => {
    setError("");
    if (!user || !athleteId) { setError(t("selectAthlete")); return; }
    const mass = parseFloat(bodyMass);
    const h = parseFloat(height);
    const valid = splits.filter((s) => s.time > 0 && s.distance > 0);
    if (valid.length < 3 || !mass || !h) { setError(t("needSplits")); return; }

    setBusy(true);
    try {
      const inputs = {
        bodyMass: mass,
        height: h,
        splits: valid.map(({ distance, time }) => ({ distance, time })),
        airTemperature: parseFloat(airTemp) || 20,
        airPressure: parseFloat(airPressure) || 760,
        windSpeed: signedWind(),
        testDistance,
        startType,
        surface,
        shoeType,
        notes: notes || undefined,
        videoFps,
      };
      const results = calculateSprintProfile(inputs);
      const athlete = players.find((p) => p.id === athleteId);
      const athleteTeam = athlete ? teams.find((te) => te.id === athlete.teamId) : undefined;
      const local = saveLocalTest({
        type: "sprint",
        test_date: new Date().toISOString(),
        athlete_id: athleteId,
        athlete_snapshot: {
          first_name: athlete?.firstName ?? "",
          last_name: athlete?.lastName ?? "",
          sport: athleteTeam?.sport ?? null,
          body_mass: mass,
        },
        raw_data: inputs,
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={logoSprint} alt="Sprint" loading="eager" decoding="async" fetchPriority="high" className="logo-themed h-14 w-14 object-contain flex-shrink-0" />
          <div>
            <h1 className="font-display text-lg font-bold uppercase">{t("sprintTestTitle")}</h1>
            <p className="text-xs text-muted-foreground">{t("sprintTestSubtitle")}</p>
          </div>
        </div>
        <Button size="sm" onClick={loadDemo} title={t("loadDemoTitle")} className="bg-gradient-primary text-primary-foreground font-semibold">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t("demo")}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">{t("step1Athlete")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("team")}</Label>
            <select
              value={teamId}
              onChange={(e) => { setTeamId(e.target.value); setAthleteId(""); }}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">{t("selectTeam")}</option>
              {teams.map((te) => (<option key={te.id} value={te.id}>{te.name}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("athlete")}</Label>
            <select
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">{t("selectEllipsis")}</option>
              {filteredAthletes.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("bodyMass")}</Label>
              <Input type="number" step="0.1" value={bodyMass} onChange={(e) => setBodyMass(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("heightM")}</Label>
              <Input type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">{t("step2Protocol")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("testDistance")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {([30, 40, 60] as TestDistance[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => changeTestDistance(d)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    testDistance === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/50"
                  }`}
                >
                  {d} m
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("startType")}</Label>
              <select
                value={startType}
                onChange={(e) => setStartType(e.target.value as StartType)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="standing">{t("standing")}</option>
                <option value="three_point">{t("threePoint")}</option>
                <option value="blocks">{t("blocks")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("surface")}</Label>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value as Surface)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="track">{t("track")}</option>
                <option value="grass">{t("grass")}</option>
                <option value="synthetic">{t("synthetic")}</option>
                <option value="indoor">{t("indoor")}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("shoeType")}</Label>
            <select
              value={shoeType}
              onChange={(e) => setShoeType(e.target.value as ShoeType)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              {(Object.keys(SHOE_LABELS) as ShoeType[]).map((k) => (
                <option key={k} value={k}>{t(k === "spikes" ? "shoeSpikes" : k === "cleats" ? "shoeCleats" : "shoeSprint")}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">{t("shoeCorrection")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-display text-lg">{t("step3Conditions")}</CardTitle>
            <Button size="sm" onClick={autofillWeather} disabled={geoBusy} className="bg-gradient-primary text-primary-foreground font-semibold">
              {geoBusy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : geoInfo ? (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
              )}
              {geoInfo ? t("refresh") : t("locate")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("temperature")}</Label>
              <Input type="number" value={airTemp} onChange={(e) => setAirTemp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("pressure")}</Label>
              <Input type="number" value={airPressure} onChange={(e) => setAirPressure(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("windMs")}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value)}
                disabled={windDir === "none"}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Wind className="h-3 w-3" /> {t("windDirection")}</Label>
            <ToggleGroup
              type="single"
              value={windDir}
              onValueChange={(v) => v && setWindDir(v as "tail" | "head" | "none")}
              className="grid grid-cols-3 gap-2"
              variant="protocol"
              size="default"
            >
              <ToggleGroupItem value="tail" aria-label={t("tailwind")} className="w-full">
                {t("tailwind")}
              </ToggleGroupItem>
              <ToggleGroupItem value="none" aria-label={t("neutral")} className="w-full">
                {t("neutral")}
              </ToggleGroupItem>
              <ToggleGroupItem value="head" aria-label={t("headwind")} className="w-full">
                {t("headwind")}
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-[11px] text-muted-foreground whitespace-pre-line">{t("windHint")}</p>
          </div>
          <ConditionsRecap
            tempC={parseFloat(airTemp)}
            pressureHpa={parseFloat(airPressure)}
            windMs={signedWind()}
            heightM={parseFloat(height)}
            bodyMassKg={parseFloat(bodyMass)}
            testDistance={testDistance}
          />
          {geoInfo && !geoError && (
            <p className="mt-2 text-[11px] text-muted-foreground">{geoInfo}</p>
          )}
          {geoError && <p className="mt-2 text-[11px] text-destructive">{geoError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">{t("step4Splits")}</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setCameraOpen(true)} aria-label={t("camera")}>
                <Camera className="h-4 w-4 text-primary" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAnalyzerOpen(true)} aria-label={t("videoAi")}>
                <Video className="h-4 w-4 text-primary" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSplits([...splits, { distance: 0, time: 0 }])}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr_70px_auto] gap-2 text-xs font-medium text-muted-foreground">
            <span>{t("distanceM")}</span>
            <span>{t("timeS")}</span>
            <span className="text-center"></span>
            <span></span>
          </div>
          {splits.map((s, i) => (
            <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_70px_auto] items-center gap-2">
              <Input type="number" step="0.5" value={s.distance || ""} onChange={(e) => updateSplit(i, "distance", e.target.value)} />
              <Input type="number" step="0.01" value={s.time || ""} onChange={(e) => updateSplit(i, "time", e.target.value)} />
              <span className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.source === "video" ? t("video") : s.source === "ai" ? t("ai") : ""}
              </span>
              <Button size="icon" variant="ghost" onClick={() => setSplits(splits.filter((_, j) => j !== i))} aria-label={t("delete")}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">{t("splitsHint")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">{t("step5Notes")}</CardTitle></CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("notesPlaceholder")}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </CardContent>
      </Card>

      {cameraOpen && (
        <CameraTimer
          markerLabels={[
            "Départ (0m)",
            ...splits.filter((s) => s.distance > 0).map((s) => `Passage ${s.distance}m`),
          ]}
          onClose={() => setCameraOpen(false)}
          onConfirm={(markers) => {
            const next = [...splits];
            let mi = 1;
            for (let i = 0; i < next.length; i++) {
              if (next[i].distance > 0 && mi < markers.length) {
                next[i] = {
                  ...next[i],
                  time: parseFloat(markers[mi].time.toFixed(3)),
                  source: "video",
                  confidence: 0.9,
                };
                mi++;
              }
            }
            setSplits(next);
            setCameraOpen(false);
          }}
        />
      )}

      {analyzerOpen && (
        <SprintVideoAnalyzer
          distances={splits.filter((s) => s.distance > 0).map((s) => s.distance)}
          testDistance={testDistance}
          onClose={() => setAnalyzerOpen(false)}
          onConfirm={({ splits: results, videoFps: fps }) => {
            const next = [...splits];
            for (const r of results) {
              const i = next.findIndex((s) => s.distance === r.distance);
              if (i >= 0) next[i] = { ...next[i], time: r.time, source: r.source, confidence: r.confidence };
            }
            setSplits(next);
            if (fps) setVideoFps(fps);
            setAnalyzerOpen(false);
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow h-12">
        {busy ? t("computing") : t("computeSprint")}
      </Button>
    </div>
  );
}

function ConditionsRecap({
  tempC,
  pressureHpa,
  windMs,
  heightM,
  bodyMassKg,
  testDistance,
}: {
  tempC: number;
  pressureHpa: number;
  windMs: number;
  heightM: number;
  bodyMassKg: number;
  testDistance: number;
}) {
  const tOk = Number.isFinite(tempC);
  const pOk = Number.isFinite(pressureHpa) && pressureHpa > 0;
  const wOk = Number.isFinite(windMs);
  if (!tOk || !pOk || !wOk) return null;
  const rho = airDensity(tempC, pressureHpa);
  const illegal = Math.abs(windMs) > 2;

  let windDelta: number | null = null;
  if (heightM > 0 && bodyMassKg > 0 && Math.abs(windMs) > 0.05) {
    const A = frontalArea(heightM, bodyMassKg);
    const k = 0.5 * rho * A * 0.9;
    const Vmax = 9.5;
    const tau = 1.1;
    const tNo = simulateSplitTime(testDistance, Vmax, tau, k, bodyMassKg, 0);
    const tWith = simulateSplitTime(testDistance, Vmax, tau, k, bodyMassKg, windMs);
    windDelta = tWith - tNo;
  }

  return (
    <div className="mt-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>ρ = <span className="font-mono text-foreground">{rho.toFixed(3)} kg/m³</span></span>
        {windDelta !== null && (
          <span>
            Effet vent sur {testDistance} m :{" "}
            <span className="font-mono text-foreground">
              {windDelta >= 0 ? "+" : ""}{windDelta.toFixed(3)} s
            </span>
          </span>
        )}
      </div>
      {illegal && (
        <div className="mt-1 flex items-center gap-1 text-amber-500">
          <AlertTriangle className="h-3 w-3" />
          Vent &gt; 2 m/s — performance non homologable (IAAF).
        </div>
      )}
    </div>
  );
}
