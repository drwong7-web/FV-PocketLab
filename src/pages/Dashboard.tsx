import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Plus, User, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listPlayers, listTeams, getOrganization } from "@/lib/storage";
import { listUnifiedTests } from "@/lib/unifiedTests";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { useSettings } from "@/lib/settings";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { isOnboardingDone } from "@/lib/onboarding";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!isOnboardingDone()) setShowOnboarding(true);
  }, []);

  if (!user) return <div className="min-h-[60vh]" aria-hidden />;
  const org = getOrganization(user.organizationId);
  const teams = listTeams(user.organizationId);
  const players = listPlayers(undefined, user.organizationId);
  const tests = listUnifiedTests(user.organizationId);

  const lastTest = tests[0];

  return (
    <div className="space-y-6">
      {showOnboarding && <OnboardingCarousel onClose={() => setShowOnboarding(false)} />}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{t("performanceDashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("hello")}, {user.name.split(" ")[0]} · {t("tagline")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label={t("teams")} value={teams.length} accent="primary" icon={<Users className="w-4 h-4" />} />
        <MetricCard label={t("players")} value={players.length} accent="accent" icon={<User className="w-4 h-4" />} />
        <MetricCard label={t("tests")} value={tests.length} accent="success" icon={<Activity className="w-4 h-4" />} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/app/teams" className="group glass-card p-6 flex items-center justify-between hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent">
          <div>
            <div className="font-bold text-lg tracking-tight">{t("manageTeams")}</div>
          </div>
          <ArrowRight className="w-6 h-6 text-foreground stroke-[2.5]" />
        </Link>
        <Link to="/app/tests/new" className="group glass-card p-6 flex items-center justify-between hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent">
          <div>
            <div className="font-bold text-lg tracking-tight">{t("newTest")}</div>
          </div>
          <ArrowRight className="w-6 h-6 text-foreground stroke-[2.5]" />
        </Link>
      </div>

      {lastTest && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t("latestTest")}
          </h2>
          <Link
            to={`/app/tests/${lastTest.id}`}
            className="glass-card p-5 block hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {new Date(lastTest.createdAt).toLocaleString()} · {lastTest.type === "jump" ? t("verticalJump") : t("sprint")}
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
          <h3 className="font-semibold">{t("getStarted")}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{t("getStartedDesc")}</p>
          <Link to="/app/teams">
            <Button className="bg-gradient-primary text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-1" /> {t("createTeam")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
