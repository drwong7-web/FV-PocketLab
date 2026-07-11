import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listUnifiedTests } from "@/lib/unifiedTests";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";

export default function TestList() {
  const { user } = useAuth();
  const { t } = useSettings();
  if (!user) return <div className="min-h-[60vh]" aria-hidden />;
  const tests = listUnifiedTests(user.organizationId);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("allTests")}</h1>
          <p className="text-sm text-muted-foreground">{t("acrossOrg")}</p>
        </div>
        <Link to="/app/tests/new">
          <Button className="bg-gradient-primary text-primary-foreground font-bold uppercase tracking-wide">
            <Plus className="w-4 h-4 mr-1 stroke-[3]" /> {t("new")}
          </Button>
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("noTests")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((tt) => (
            <Link key={tt.id} to={`/app/tests/${tt.id}`} className="glass-card p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{tt.playerName}</div>
                <div className="text-xs text-muted-foreground mt-0.5 mono-num">
                  {new Date(tt.createdAt).toLocaleString()} · {tt.type === "jump" ? t("jump") : t("sprint")} · {tt.primary} · {tt.secondary}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
