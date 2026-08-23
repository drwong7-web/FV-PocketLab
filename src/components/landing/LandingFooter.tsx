import fvLogo from "@/assets/fv-logo.png";
import { useSettings } from "@/lib/settings";

export function LandingFooter() {
  const { t } = useSettings();
  const copy = t("landFooterCopy").replace("{y}", String(new Date().getFullYear()));

  return (
    <footer className="border-t border-border/60 mt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={fvLogo} alt="" className="engraved-logo h-8 w-8 object-contain" />
          <div>
            <p className="font-display text-sm">FV PocketLab</p>
            <p className="text-xs text-muted-foreground">{t("landFooterTag")}</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <a href="#features" className="min-h-11 inline-flex items-center hover:text-foreground">
            {t("landNavFeatures")}
          </a>
          <a href="#how" className="min-h-11 inline-flex items-center hover:text-foreground">
            {t("landNavHow")}
          </a>
          <a href="#pricing" className="min-h-11 inline-flex items-center hover:text-foreground">
            {t("landNavPricing")}
          </a>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 sm:px-6 pb-8 text-xs text-muted-foreground">{copy}</p>
    </footer>
  );
}
