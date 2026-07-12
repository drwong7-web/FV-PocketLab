import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Trash2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createTeam, deleteTeam, listPlayers, listTeams } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";

export default function Teams() {
  const { user } = useAuth();
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [, force] = useState(0);

  if (!user) return <div className="min-h-[60vh]" aria-hidden />;
  const teams = listTeams(user.organizationId);
  const allPlayers = listPlayers(undefined, user.organizationId);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTeam(user.organizationId, name.trim(), sport.trim() || undefined);
    setName(""); setSport(""); setOpen(false);
    force((n) => n + 1);
    toast.success(t("teamCreated"));
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
                <Input id="tsport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder={t("sportPlaceholder")} />
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
            return (
              <Link
                key={tm.id}
                to={`/app/teams/${tm.id}`}
                className="glass-card p-5 flex items-center justify-between group hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent"
              >
                <div>
                  <div className="font-semibold">{tm.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {tm.sport ? tm.sport + " · " : ""}{count} {count === 1 ? t("player").toLowerCase() : t("players").toLowerCase()}
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
