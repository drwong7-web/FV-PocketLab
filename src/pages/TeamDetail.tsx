import { useState, useRef, useEffect, FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createPlayer, deletePlayer, getTeam, listPlayers } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ImportPlayersDialog from "@/components/players/ImportPlayersDialog";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { getSportLabel } from "@/lib/sportTargets";
import { CoachMark } from "@/components/onboarding/CoachMark";
import { getTourStep, clearTour } from "@/lib/onboardingTour";

export default function TeamDetail() {
  const { teamId = "" } = useParams();
  const { user } = useAuth();
  const { t } = useSettings();
  const team = getTeam(teamId);
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [mass, setMass] = useState("75");
  const [height, setHeight] = useState("");
  const [, force] = useState(0);
  const addWrapRef = useRef<HTMLDivElement>(null);
  const [showCoach, setShowCoach] = useState(false);

  useEffect(() => {
    if (getTourStep() === "player-add") setShowCoach(true);
  }, []);

  if (!team || !user) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{t("teamNotFound")}</p>
        <Link to="/app/teams"><Button variant="ghost" className="mt-3"><ArrowLeft className="w-4 h-4 mr-1" /> {t("back")}</Button></Link>
      </div>
    );
  }

  const players = listPlayers(team.id, user.organizationId);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(mass);
    if (!first.trim() || !last.trim() || !m || m <= 0) {
      toast.error(t("fillNameAndMass"));
      return;
    }
    createPlayer({
      teamId: team.id,
      organizationId: user.organizationId,
      firstName: first.trim(),
      lastName: last.trim(),
      mass: m,
      height: height ? parseFloat(height) : undefined,
    });
    setFirst(""); setLast(""); setMass("75"); setHeight(""); setOpen(false);
    force((n) => n + 1);
    toast.success(t("playerAdded"));
  };

  return (
    <div className="space-y-5">
      <Link to="/app/teams" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3 mr-1" /> {t("teams")}
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-sm text-muted-foreground">{getSportLabel(team.sport, t as any) || t("sportNotSet")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportPlayersDialog
            teamId={team.id}
            organizationId={user.organizationId}
            onImported={() => force((n) => n + 1)}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground font-semibold">
                <Plus className="w-4 h-4 mr-1" /> {t("player")}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{t("addPlayer")}</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="f">{t("firstName")}</Label>
                  <Input id="f" value={first} onChange={(e) => setFirst(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="l">{t("lastName")}</Label>
                  <Input id="l" value={last} onChange={(e) => setLast(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="m">{t("massKg")}</Label>
                  <Input id="m" type="number" step="0.1" value={mass} onChange={(e) => setMass(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="h">{t("heightCm")}</Label>
                  <Input id="h" type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold">{t("add")}</Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <UserRound className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("noPlayers")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="glass-card flex items-center">
              <Link to={`/app/players/${p.id}`} className="flex-1 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{p.firstName} {p.lastName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.mass} kg
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
              <button
                className="p-3 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => {
                  if (confirm(`${t("deletePlayerConfirm")} ${p.firstName} ${p.lastName}`)) {
                    deletePlayer(p.id);
                    force((n) => n + 1);
                    toast.success(t("playerDeleted"));
                  }
                }}
                aria-label={t("deletePlayer")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
