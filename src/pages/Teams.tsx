import { useState, useRef, useEffect, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CoachMark } from "@/components/onboarding/CoachMark";
import { getTourStep, setTourStep } from "@/lib/onboardingTour";
import { ChevronRight, Plus, Trash2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createTeam, deleteTeam, listPlayers, listTeams } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { SPORT_GROUPS, getSportLabel } from "@/lib/sportTargets";

const GROUP_LABEL_KEYS: Record<(typeof SPORT_GROUPS)[number]["key"], string> = {
  team: "sportGroupTeam",
  athletics: "sportGroupAthletics",
  other_sports: "sportGroupOther",
  fallback: "sportGroupFallback",
};

export default function Teams() {
  const { user } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [, force] = useState(0);
  const newBtnRef = useRef<HTMLButtonElement>(null);
  const [showCoach, setShowCoach] = useState(false);

  useEffect(() => {
    if (getTourStep() === "team-create") setShowCoach(true);
  }, []);

  if (!user) return <div className="min-h-[60vh]" aria-hidden />;
  const teams = listTeams(user.organizationId);
  const allPlayers = listPlayers(undefined, user.organizationId);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const team = createTeam(user.organizationId, name.trim(), sport || undefined);
    setName(""); setSport(""); setOpen(false);
    force((n) => n + 1);
    toast.success(t("teamCreated"));
    if (getTourStep() === "team-create") {
      setShowCoach(false);
      setTourStep("player-add");
      const id = (team as any)?.id;
      if (id) navigate(`/app/teams/${id}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("teams")}</h1>
          <p className="text-sm text-muted-foreground">{t("teamsSubtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground font-bold uppercase tracking-wide">
              <Plus className="w-4 h-4 mr-1 stroke-[3]" /> {t("new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{t("createTeamTitle")}</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3 mt-2">
              <div>
                <Label htmlFor="tname">{t("teamName")}</Label>
                <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="tsport">{t("sport")}</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger
                    id="tsport"
                    className="bg-secondary/50 border-border text-foreground focus:ring-primary focus:border-primary"
                  >
                    <SelectValue placeholder={t("sportPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {SPORT_GROUPS.map((group, idx) => (
                      <SelectGroup key={group.key}>
                        <SelectLabel
                          className={`text-primary font-bold text-xs uppercase tracking-wider ${
                            idx > 0 ? "mt-1 border-t border-border/50 pt-2" : ""
                          }`}
                        >
                          ▸ {t(GROUP_LABEL_KEYS[group.key] as any)}
                        </SelectLabel>
                        {group.items.map((key) => (
                          <SelectItem
                            key={key}
                            value={key}
                            className="focus:bg-primary/15 focus:text-foreground"
                          >
                            {getSportLabel(key, t as any)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold">{t("create")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <div className="glass-card p-8 text-center bg-gradient-to-br from-primary/10 to-transparent">
          <Users className="w-8 h-8 mx-auto text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">{t("noTeamsYet")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((tm) => {
            const count = allPlayers.filter((p) => p.teamId === tm.id).length;
            const sportLabel = getSportLabel(tm.sport, t as any);
            return (
              <Link
                key={tm.id}
                to={`/app/teams/${tm.id}`}
                className="glass-card p-5 flex items-center justify-between group hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent"
              >
                <div>
                  <div className="font-semibold">{tm.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {sportLabel ? sportLabel + " · " : ""}{count} {count === 1 ? t("player").toLowerCase() : t("players").toLowerCase()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  <button
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm(`${t("deleteTeamConfirm")} — "${tm.name}"`)) {
                        deleteTeam(tm.id);
                        force((n) => n + 1);
                        toast.success(t("teamDeleted"));
                      }
                    }}
                    aria-label={t("deleteTeam")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
