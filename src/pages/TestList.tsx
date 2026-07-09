import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listUnifiedTests } from "@/lib/unifiedTests";
import { Button } from "@/components/ui/button";

export default function TestList() {
  const { user } = useAuth();
  if (!user) return <div className="min-h-[60vh]" aria-hidden />;
  const tests = listUnifiedTests(user.organizationId);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All tests</h1>
          <p className="text-sm text-muted-foreground">Across your organisation.</p>
        </div>
        <Link to="/app/tests/new">
          <Button className="bg-gradient-primary text-primary-foreground font-bold uppercase tracking-wide">
            Add new
          </Button>
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No tests recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((t) => (
            <Link key={t.id} to={`/app/tests/${t.id}`} className="glass-card p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{t.playerName}</div>
                <div className="text-xs text-muted-foreground mt-0.5 mono-num">
                  {new Date(t.createdAt).toLocaleString()} · {t.type === "jump" ? "Jump" : "Sprint"} · {t.primary} · {t.secondary}
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
