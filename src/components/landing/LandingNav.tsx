import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Menu, X } from "lucide-react";
import fvLogo from "@/assets/fv-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InstallModal from "@/components/pwa/InstallModal";
import { toast } from "@/hooks/use-toast";
import {
  canPromptInstall,
  isStandalone,
  onInstallStateChange,
  promptInstall,
} from "@/lib/pwa/install";
import { useSettings, type Lang } from "@/lib/settings";
import { cn } from "@/lib/utils";

const LANGS: { code: Lang; native: string }[] = [
  { code: "fr", native: "FR" },
  { code: "en", native: "EN" },
  { code: "ar", native: "AR" },
];

const NAV = [
  { href: "#features", key: "landNavFeatures" as const },
  { href: "#how", key: "landNavHow" as const },
  { href: "#pricing", key: "landNavPricing" as const },
];

export function LandingNav() {
  const { t, lang, setLang } = useSettings();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [standalone, setStandalone] = useState(() => isStandalone());
  const [canPrompt, setCanPrompt] = useState(() => canPromptInstall());

  useEffect(() => {
    const sync = () => {
      setStandalone(isStandalone());
      setCanPrompt(canPromptInstall());
    };
    sync();
    return onInstallStateChange(sync);
  }, []);

  const onInstall = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast({ title: t("installedToast") });
        setStandalone(true);
        return;
      }
    }
    setModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a href="#top" className="flex min-h-11 items-center gap-2 shrink-0">
          <img src={fvLogo} alt="" className="engraved-logo h-8 w-8 object-contain" />
          <span className="font-display text-sm tracking-tight">PocketLab</span>
        </a>

        <nav className="hidden md:flex items-center gap-1 mx-auto" aria-label="Landing">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="sm:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-primary/10"
                aria-label={t("landLangMenu")}
              >
                <Globe className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(lang === l.code && "bg-primary/10 text-primary")}
                >
                  {l.native}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden sm:flex items-center rounded-lg border border-border bg-background/40 p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={cn(
                  "min-h-9 min-w-9 rounded-md px-2 text-xs font-semibold transition-colors",
                  lang === l.code
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.native}
              </button>
            ))}
          </div>
          {!standalone && (
            <Button type="button" size="sm" onClick={onInstall}>
              {t("installBannerCta")}
            </Button>
          )}
          <button
            type="button"
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-primary/10"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? t("landCloseMenu") : t("landMenu")}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 px-4 py-3 space-y-1">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm text-foreground hover:bg-primary/10"
            >
              {t(item.key)}
            </a>
          ))}
          <Link
            to="/contact"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm text-foreground hover:bg-primary/10"
          >
            {t("landFooterContact")}
          </Link>
        </div>
      )}
      {modalOpen && <InstallModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </header>
  );
}
