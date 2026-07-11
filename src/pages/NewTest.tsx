import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoJump from "@/assets/logo-jump-neon.png";
import logoSprint from "@/assets/logo-sprint-neon.png";
import { useSettings } from "@/lib/settings";

export default function NewTest() {
  const [params] = useSearchParams();
  const { t } = useSettings();
  const athleteId = params.get("playerId") ?? params.get("athleteId") ?? "";
  const qs = athleteId ? `?athleteId=${athleteId}` : "";

  return (
    <div className="space-y-6">
      <Link to="/app" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3 mr-1" /> {t("dashboard")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("launchTest")}</h1>
        <p className="text-sm text-muted-foreground">{t("chooseTestType")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to={`/app/tests/new/jump${qs}`} className="glass-card overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-28 w-28">
              <img src={logoJump} alt={t("verticalJump")} className="engraved-logo h-full w-auto object-contain" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="font-display text-lg font-bold uppercase text-center">{t("verticalJump")}</h2>
            </div>
          </div>
        </Link>

        <Link to={`/app/tests/new/sprint${qs}`} className="glass-card overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-28 w-28">
              <img src={logoSprint} alt={t("linearSprint")} className="engraved-logo h-full w-auto object-contain" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="font-display text-lg font-bold uppercase text-center">{t("linearSprint")}</h2>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
