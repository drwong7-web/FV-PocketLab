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

export default function Teams() {
  const { user } = useAuth();
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
    toast.success("Team created");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">Group athletes by squad or session.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground font-bold uppercase tracking-wide">
              <Plus className="w-4 h-4 mr-1 stroke-[3]" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Create team</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3 mt-2">
              <div>
                <Label htmlFor="tname">Team name</Label>
                <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="tsport">Sport</Label>
                <Input id="tsport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Athletics, Football, Rugby…" />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <div className="glass-card p-8 text-center bg-gradient-to-br from-primary/10 to-transparent">
          <Users className="w-8 h-8 mx-auto text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">No teams yet — create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((t) => {
            const count = allPlayers.filter((p) => p.teamId === t.id).length;
            return (
              <div key={t.id} className="glass-card flex items-center group">
                <Link to={`/app/teams/${t.id}`} className="flex-1 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.sport ? t.sport + " · " : ""}{count} player{count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <button
                  className="p-3 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => {
                    if (confirm(`Delete team "${t.name}" and its players?`)) {
                      deleteTeam(t.id);
                      force((n) => n + 1);
                      toast.success("Team deleted");
                    }
                  }}
                  aria-label="Delete team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
