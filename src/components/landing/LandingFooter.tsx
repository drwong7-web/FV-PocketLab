import { Link } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png";
import { useSettings } from "@/lib/settings";

const LINKS = [
  { to: "/privacy", key: "landFooterPrivacy" as const },
  { to: "/terms", key: "landFooterTerms" as const },
  { to: "/contact", key: "landFooterContact" as const },
];

export function LandingFooter() {
  const { t } = useSettings();
  const copy = t("landFooterCopy").replace("{y}", String(new Date().getFullYear()));

  return (
    <footer className="border-t border-border/60 mt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90">
          <img src={fvLogo} alt="" className="engraved-logo h-8 w-8 object-contain" />
          <div>
            <p className="font-display text-sm">FV PocketLab</p>
            <p className="text-xs text-muted-foreground">{t("landFooterTag")}</p>
          </div>
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="min-h-11 inline-flex items-center hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 sm:px-6 pb-8 text-xs text-muted-foreground">{copy}</p>
    </footer>
  );
}
