import { Link } from "react-router-dom";
import { Activity, ArrowRight, Plus, User, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listPlayers, listTeams, getOrganization } from "@/lib/storage";
import { listUnifiedTests } from "@/lib/unifiedTests";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return <div className="min-h-[60vh]" aria-hidden />;
  const org = getOrganization(user.organizationId);
  const teams = listTeams(user.organizationId);
  const players = listPlayers(undefined, user.organizationId);
  const tests = listUnifiedTests(user.organizationId);

  const lastTest = tests[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{org?.name}</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          Hello, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your performance lab, in your pocket.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Teams" value={teams.length} accent="primary" icon={<Users className="w-4 h-4" />} />
        <MetricCard label={"PLAYERS\u00a0"} value={players.length} accent="accent" icon={<User className="w-4 h-4" />} />
        <MetricCard label="Tests" value={tests.length} accent="success" icon={<Activity className="w-4 h-4" />} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/app/teams" className="group glass-card p-6 flex items-center justify-between hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent">
          <div>
            <div className="font-bold text-lg tracking-tight">Manage Teams</div>
          </div>
          <ArrowRight className="w-6 h-6 text-foreground stroke-[2.5]" />

        </Link>
        <Link to="/app/tests/new" className="group glass-card p-6 flex items-center justify-between hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent">
          <div>
            <div className="font-bold text-lg tracking-tight">New Test</div>
          </div>
          <ArrowRight className="w-6 h-6 text-primary stroke-[2.5]" />
        </Link>

      </div>

      {lastTest && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Latest test
          </h2>
          <Link
            to={`/app/tests/${lastTest.id}`}
            className="glass-card p-5 block hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {new Date(lastTest.createdAt).toLocaleString()} · {lastTest.type === "jump" ? "Vertical jump" : "Sprint"}
                </div>
                <div className="font-semibold mt-1">
                  {lastTest.playerName} · {lastTest.primary}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        </div>
      )}

      {teams.length === 0 && (
        <div className="glass-card p-6 text-center bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors">
          <h3 className="font-semibold">Get started</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first team to start adding players and tests.
          </p>
          <Link to="/app/teams">
            <Button className="bg-gradient-primary text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-1" /> Create a team
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
