import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import logoJump from "@/assets/logo-jump-neon.png";
import logoSprint from "@/assets/logo-sprint-neon.png";
import { useSettings } from "@/lib/settings";

export default function NewTest() {
  const [params] = useSearchParams();
  const { t } = useSettings();
  const athleteId = params.get("playerId") ?? params.get("athleteId") ?? "";
  const qs = athleteId ? `?athleteId=${athleteId}` : "";

  useEffect(() => {
    [logoJump, logoSprint].forEach((href) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      link.fetchPriority = "high";
      document.head.appendChild(link);
    });
  }, []);

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
        <Link to={`/app/tests/new/jump${qs}`} className="glass-card engraved-surface overflow-hidden group hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-28 w-28">
              <img src={logoJump} alt={t("verticalJump")} loading="eager" decoding="async" fetchPriority="high" className="engraved-logo h-full w-full object-contain" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="engraved font-display text-lg font-bold uppercase text-center">{t("verticalJump")}</h2>
            </div>
          </div>
        </Link>

        <Link to={`/app/tests/new/sprint${qs}`} className="glass-card engraved-surface overflow-hidden group hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/10 to-transparent">
          <div className="p-4 flex items-center gap-4">
            <div className="logo-well flex-shrink-0 flex items-center justify-center h-28 w-28 p-2">
              <img src={logoSprint} alt={t("linearSprint")} loading="eager" decoding="async" fetchPriority="high" className="engraved-logo h-full w-full object-contain" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="engraved font-display text-lg font-bold uppercase text-center">{t("linearSprint")}</h2>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
