import { useState, useRef, useEffect, FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { canCreatePlayer } from "@/lib/freeLimits";
import { isFreeLimitError } from "@/lib/plan";
import { notifyFreeLimit } from "@/lib/upgradePrompt";
import { createPlayer, deletePlayer, getTeam, listPlayers, updateTeam } from "@/lib/storage";
import { ImagePicker } from "@/components/ImagePicker";
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
  const [mass, setMass] = useState("");
  const [height, setHeight] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
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
  const allowNewPlayer = canCreatePlayer(team.id);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(mass);
    if (!first.trim() || !last.trim() || !m || m <= 0) {
      toast.error(t("fillNameAndMass"));
      return;
    }
    try {
      createPlayer({
        teamId: team.id,
        organizationId: user.organizationId,
        firstName: first.trim(),
        lastName: last.trim(),
        mass: m,
        height: height ? parseFloat(height) : undefined,
        photoDataUrl,
      });
    } catch (err) {
      if (isFreeLimitError(err)) {
        notifyFreeLimit(t, err.reason);
        setOpen(false);
        return;
      }
      throw err;
    }
    setFirst(""); setLast(""); setMass(""); setHeight(""); setPhotoDataUrl(undefined); setOpen(false);
    force((n) => n + 1);
    toast.success(t("playerAdded"));
    if (getTourStep() === "player-add") { clearTour(); setShowCoach(false); }
  };

  return (
    <div className="space-y-5">
      <Link to="/app/teams" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3 mr-1" /> {t("teams")}
      </Link>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ImagePicker
            value={team.logoDataUrl}
            onChange={(url) => {
              updateTeam(team.id, { logoDataUrl: url });
              force((n) => n + 1);
            }}
            label={t("teamLogo")}
            shape="square"
            size="lg"
          />
          <h1 className="text-2xl font-bold tracking-tight mt-3">{team.name}</h1>
          <p className="text-sm text-muted-foreground">{getSportLabel(team.sport, t as any) || t("sportNotSet")}</p>
        </div>
        <div ref={addWrapRef} className="flex items-center gap-2">
          <ImportPlayersDialog
            teamId={team.id}
            organizationId={user.organizationId}
            onImported={() => {
              force((n) => n + 1);
              if (getTourStep() === "player-add") { clearTour(); setShowCoach(false); }
            }}
          />
          <Dialog
            open={open}
            onOpenChange={(v) => {
              if (v && !allowNewPlayer) {
                notifyFreeLimit(t, "athlete");
                return;
              }
              if (!v) { setFirst(""); setLast(""); setMass(""); setHeight(""); setPhotoDataUrl(undefined); }
              setOpen(v);
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!allowNewPlayer} className="bg-gradient-primary text-primary-foreground font-semibold">
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
              <div>
                <Label>{t("athletePhoto")}</Label>
                <div className="mt-2">
                  <ImagePicker
                    value={photoDataUrl}
                    onChange={setPhotoDataUrl}
                    label={t("athletePhoto")}
                    fallback={first.trim() && last.trim() ? `${first[0]}${last[0]}`.toUpperCase() : undefined}
                    shape="circle"
                    size="md"
                  />
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
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    {p.photoDataUrl ? (
                      <img src={p.photoDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <>{p.firstName[0]}{p.lastName[0]}</>
                    )}
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
      {showCoach && (
        <CoachMark
          targetRef={addWrapRef}
          titleKey="onbTourPlayerTitle"
          descKey="onbTourPlayerDesc"
          onDismiss={() => { clearTour(); setShowCoach(false); }}
        />
      )}
    </div>
  );
}
