import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useAuth } from "@/lib/auth";
import { deleteTest, getPlayer, getTeam, updatePlayer } from "@/lib/storage";
import { ImagePicker } from "@/components/ImagePicker";
import { listUnifiedTests } from "@/lib/unifiedTests";
import { deleteLocalTest } from "@/lib/localHistory";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { canSaveTest } from "@/lib/freeLimits";
import { notifyFreeLimit } from "@/lib/upgradePrompt";

export default function PlayerDetail() {
  const { playerId = "" } = useParams();
  const { user } = useAuth();
  const { t } = useSettings();
  const [, force] = useState(0);

  const player = getPlayer(playerId);
  if (!player || !user) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{t("playerNotFound")}</p>
        <Link to="/app/teams"><Button variant="ghost" className="mt-3"><ArrowLeft className="w-4 h-4 mr-1" /> {t("back")}</Button></Link>
      </div>
    );
  }
  const team = getTeam(player.teamId);
  const tests = listUnifiedTests(user.organizationId, player.id);
  const allowNewTest = canSaveTest(player.id);

  const guardNewTest = (e: MouseEvent) => {
    if (!allowNewTest) {
      e.preventDefault();
      notifyFreeLimit(t, "test");
    }
  };

  return (
    <div className="space-y-5">
      <Link to={`/app/teams/${player.teamId}`} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3 mr-1" /> {team?.name ?? t("team")}
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <ImagePicker
            value={player.photoDataUrl}
            onChange={(url) => {
              updatePlayer(player.id, { photoDataUrl: url });
              force((n) => n + 1);
            }}
            label={t("athletePhoto")}
            fallback={`${player.firstName[0]}${player.lastName[0]}`}
            shape="circle"
            size="lg"
          />
          <h1 className="text-xl font-bold tracking-tight mt-3">{player.firstName} {player.lastName}</h1>
          <p className="text-xs text-muted-foreground">
            {player.mass} kg{player.height ? ` · ${player.height} cm` : ""}
          </p>
        </div>
        <Link to={`/app/tests/new?playerId=${player.id}`} onClick={guardNewTest}>
          <Button className="bg-gradient-primary text-primary-foreground font-semibold">
            {t("test")}
          </Button>
        </Link>
      </div>


      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t("testHistory")} ({tests.length})
        </h2>
        {tests.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("noTestsYet")}</p>
            <Link to={`/app/tests/new?playerId=${player.id}`} onClick={guardNewTest}>
              <Button className="mt-3 bg-gradient-primary text-primary-foreground font-bold uppercase tracking-wide">
                <Plus className="w-4 h-4 mr-1 stroke-[3]" /> {t("newTest")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map((tt) => (
              <div key={tt.id} className="glass-card flex items-center">
                <Link to={`/app/tests/${tt.id}`} className="flex-1 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tt.createdAt).toLocaleString()} · {tt.type === "jump" ? t("verticalJump") : t("sprint")}
                    </div>
                    <div className="font-semibold mt-1 mono-num">
                      {tt.primary} · {tt.secondary}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <button
                  className="p-3 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => {
                    if (confirm(t("deleteTestConfirm"))) {
                      if (tt.source === "local") deleteLocalTest(tt.id);
                      else deleteTest(tt.id);
                      force((n) => n + 1);
                      toast.success(t("testDeleted"));
                    }
                  }}
                  aria-label={t("deleteTest")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
