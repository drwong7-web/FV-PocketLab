import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listPlayers, listTeams, getPlayer } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Plus, Trash2, TrendingUp } from "lucide-react";
import { calculateSprintProfile, type SprintSplit } from "@/lib/fvCalculations";
import { CameraTimer } from "@/components/camera/CameraTimer";
import { saveLocalTest, consumeTestDraft } from "@/lib/localHistory";
import { toast } from "sonner";

export default function SprintTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [splits, setSplits] = useState<SprintSplit[]>([
    { distance: 5, time: 0 },
    { distance: 10, time: 0 },
    { distance: 20, time: 0 },
    { distance: 30, time: 0 },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!athleteId || teamId) return;
    const a = players.find((p) => p.id === athleteId);
    if (a?.teamId) setTeamId(a.teamId);
  }, [athleteId, players, teamId]);

  const filteredAthletes = teamId ? players.filter((p) => p.teamId === teamId) : players;

  useEffect(() => {
    const a = getPlayer(athleteId);
    if (a?.mass) setBodyMass(String(a.mass));
    if (a?.height) setHeight((a.height / 100).toFixed(2));
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) return;
    const draft = consumeTestDraft("sprint", athleteId);
    if (!draft) return;
    const r = draft.rawData as { bodyMass?: number; height?: number; airTemperature?: number; airPressure?: number; windSpeed?: number; splits?: SprintSplit[] };
    if (r.bodyMass) setBodyMass(String(r.bodyMass));
    if (r.height) setHeight(String(r.height));
    if (r.airTemperature !== undefined) setAirTemp(String(r.airTemperature));
    if (r.airPressure !== undefined) setAirPressure(String(r.airPressure));
    if (r.windSpeed !== undefined) setWindSpeed(String(r.windSpeed));
    if (r.splits?.length) setSplits(r.splits);
  }, [athleteId]);

  const updateSplit = (i: number, field: keyof SprintSplit, value: string) => {
    const next = [...splits];
    next[i] = { ...next[i], [field]: parseFloat(value) || 0 };
    setSplits(next);
  };

  const submit = async () => {
    setError("");
    if (!user || !athleteId) { setError("Select an athlete first."); return; }
    const mass = parseFloat(bodyMass);
    const h = parseFloat(height);
    const valid = splits.filter((s) => s.time > 0 && s.distance > 0);
    if (valid.length < 2 || !mass || !h) { setError("Provide at least 2 splits + mass + height."); return; }

    setBusy(true);
    try {
      const inputs = {
        bodyMass: mass, height: h, splits: valid,
        airTemperature: parseFloat(airTemp) || 20,
        airPressure: parseFloat(airPressure) || 760,
        windSpeed: parseFloat(windSpeed) || 0,
      };
      const results = calculateSprintProfile(inputs);
      const athlete = players.find((p) => p.id === athleteId);
      const local = saveLocalTest({
        type: "sprint",
        test_date: new Date().toISOString(),
        athlete_id: athleteId,
        athlete_snapshot: {
          first_name: athlete?.firstName ?? "",
          last_name: athlete?.lastName ?? "",
          sport: null,
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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase">Sprint test</h1>
          <p className="text-xs text-muted-foreground">Morin–Samozino horizontal F-V profile.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">1. Athlete</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Team</Label>
            <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setAthleteId(""); }}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
              <option value="">Select a team</option>
              {teams.map((te) => (<option key={te.id} value={te.id}>{te.name}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Athlete</Label>
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
              <option value="">Select…</option>
              {filteredAthletes.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Body mass (kg)</Label>
              <Input type="number" step="0.1" value={bodyMass} onChange={(e) => setBodyMass(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Height (m)</Label>
              <Input type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Conditions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Temp (°C)</Label>
              <Input type="number" value={airTemp} onChange={(e) => setAirTemp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pressure (hPa)</Label>
              <Input type="number" value={airPressure} onChange={(e) => setAirPressure(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Wind (m/s)</Label>
              <Input type="number" step="0.1" value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">Splits</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setCameraOpen(true)} aria-label="Camera">
                <Camera className="h-4 w-4 text-primary" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSplits([...splits, { distance: 0, time: 0 }])}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
            <span>Distance (m)</span>
            <span>Time (s)</span>
            <span></span>
          </div>
          {splits.map((s, i) => (
            <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input type="number" step="0.5" value={s.distance || ""} onChange={(e) => updateSplit(i, "distance", e.target.value)} />
              <Input type="number" step="0.01" value={s.time || ""} onChange={(e) => updateSplit(i, "time", e.target.value)} />
              <Button size="icon" variant="ghost" onClick={() => setSplits(splits.filter((_, j) => j !== i))} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">Tip: use the camera chrono to extract split times from a recorded sprint.</p>
        </CardContent>
      </Card>

      {cameraOpen && (
        <CameraTimer
          markerLabels={["Start (0m)", ...splits.filter((s) => s.distance > 0).map((s) => `Pass ${s.distance}m`)]}
          onClose={() => setCameraOpen(false)}
          onConfirm={(markers) => {
            const next = [...splits];
            let mi = 1;
            for (let i = 0; i < next.length; i++) {
              if (next[i].distance > 0 && mi < markers.length) {
                next[i] = { ...next[i], time: parseFloat(markers[mi].time.toFixed(3)) };
                mi++;
              }
            }
            setSplits(next);
            setCameraOpen(false);
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow h-12">
        {busy ? "Computing…" : "Compute profile"}
      </Button>
    </div>
  );
}
