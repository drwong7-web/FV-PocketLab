import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Users, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createPlayer, createTeam } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Step 1
  const [teamName, setTeamName] = useState("");
  const [sport, setSport] = useState("");

  // Step 2
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [mass, setMass] = useState("75");
  const [height, setHeight] = useState("");
  const [position, setPosition] = useState("");

  if (!user) return null;

  const submitTeam = (e: FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    const t = createTeam(user.organizationId, teamName.trim(), sport.trim() || undefined);
    setTeamId(t.id);
    setStep(2);
  };

  const submitPlayer = (e: FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    const m = parseFloat(mass);
    if (!first.trim() || !last.trim() || !m || m <= 0) {
      toast.error("Please fill name and a valid mass.");
      return;
    }
    createPlayer({
      teamId,
      organizationId: user.organizationId,
      firstName: first.trim(),
      lastName: last.trim(),
      mass: m,
      height: height ? parseFloat(height) : undefined,
      position: position.trim() || undefined,
    });
    toast.success("You're all set!");
    navigate("/app", { replace: true });
  };

  const skip = () => {
    toast.success("Team created — you can add players any time.");
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-[calc(100dvh-8rem)] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className={`h-1.5 w-10 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <span className={`h-1.5 w-10 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === 1 ? (
          <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Create your first team</h1>
                <p className="text-xs text-muted-foreground">Step 1 of 2</p>
              </div>
            </div>
            <form onSubmit={submitTeam} className="space-y-3 mt-5">
              <div>
                <Label htmlFor="tname">Team name</Label>
                <Input id="tname" autoFocus value={teamName} onChange={(e) => setTeamName(e.target.value)} required placeholder="U18 Sprinters" />
              </div>
              <div>
                <Label htmlFor="tsport">Sport (optional)</Label>
                <Input id="tsport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Athletics, Football, Rugby…" />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                <UserRound className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Add your first player</h1>
                <p className="text-xs text-muted-foreground">Step 2 of 2</p>
              </div>
            </div>
            <form onSubmit={submitPlayer} className="space-y-3 mt-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="f">First name</Label>
                  <Input id="f" autoFocus value={first} onChange={(e) => setFirst(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="l">Last name</Label>
                  <Input id="l" value={last} onChange={(e) => setLast(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="m">Mass (kg)</Label>
                  <Input id="m" type="number" step="0.1" value={mass} onChange={(e) => setMass(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="h">Height (cm)</Label>
                  <Input id="h" type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="pos">Position / role</Label>
                <Input id="pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Sprinter, Winger…" />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold">
                <Check className="w-4 h-4 mr-1" /> Finish
              </Button>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Back
                </button>
                <button type="button" onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
