import { useState } from "react";
import { Link } from "react-router-dom";
import { MethodNoteDialog } from "@/components/landing/MethodNoteDialog";
import { useSettings } from "@/lib/settings";

const LINKS = [
  { to: "/privacy", key: "landFooterPrivacy" as const },
  { to: "/terms", key: "landFooterTerms" as const },
  { to: "/contact", key: "landFooterContact" as const },
];

const linkClass = "min-h-11 inline-flex items-center whitespace-nowrap hover:text-foreground";

export function LandingFooter() {
  const { t } = useSettings();
  const [methodOpen, setMethodOpen] = useState(false);
  const copy = t("landFooterCopy").replace("{y}", String(new Date().getFullYear()));

  return (
    <footer className="border-t border-border/60 mt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4" dir="ltr">
        <nav className="flex flex-wrap gap-x-4 text-sm text-muted-foreground min-w-0">
          <button type="button" className={linkClass} onClick={() => setMethodOpen(true)}>
            {t("landFooterMethod")}
          </button>
          {LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass}>
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground text-end whitespace-nowrap shrink-0">{copy}</p>
      </div>
      <MethodNoteDialog open={methodOpen} onOpenChange={setMethodOpen} />
    </footer>
  );
}
