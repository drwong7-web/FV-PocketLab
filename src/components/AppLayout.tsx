import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png.asset.json";
import { Activity, Check, Download, Home, LogOut, Moon, RefreshCw, Settings as SettingsIcon, Sun, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings, type Lang, type Theme } from "@/lib/settings";

import {
  getPublicConfig, setPublicConfig,
  getSyncState, detectPreferredProvider, managedGoogleClientId,
  type SyncProvider,
} from "@/lib/sync/config";
import { syncPushNow, syncPullNow, syncBothNow } from "@/lib/sync/manager";

import { cn } from "@/lib/utils";

import type { TKey } from "@/lib/settings";

const navItems: { to: string; labelKey: TKey; icon: typeof Home; end?: boolean }[] = [
  { to: "/app", labelKey: "navDashboard", icon: Home, end: true },
  { to: "/app/teams", labelKey: "navTeams", icon: Users },
  { to: "/app/tests", labelKey: "navTests", icon: Activity },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { lang, theme, accent, setLang, setTheme, setAccent, t } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportDir, setExportDir] = useState<string | null>(null);
  const [syncProvider, setSyncProviderState] = useState<SyncProvider>("none");
  const [syncBusy, setSyncBusy] = useState<null | "push" | "pull" | "both">(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>(undefined);
  const preferredProvider = detectPreferredProvider();
  const gdriveAvailable = !!managedGoogleClientId();

  useEffect(() => {
    if (settingsOpen) {
      const cfg = getPublicConfig();
      setSyncProviderState(cfg.provider);
      setLastSyncAt(getSyncState().lastSyncAt);
    }
  }, [settingsOpen]);

  const enableSync = (provider: Exclude<SyncProvider, "none">) => {
    setPublicConfig({ provider, fileName: "sprintlab.slfv" });
    setSyncProviderState(provider);
  };
  const disableSync = () => {
    setPublicConfig({ provider: "none" });
    setSyncProviderState("none");
  };

  const runSync = async (kind: "push" | "pull" | "both") => {
    setSyncBusy(kind);
    try {
      const fn = kind === "push" ? syncPushNow : kind === "pull" ? () => syncPullNow("merge") : syncBothNow;
      const res = await fn();
      if (!res.ok) { toast.error(res.error || t("syncError")); return; }
      setLastSyncAt(getSyncState().lastSyncAt);
      if (kind === "pull" && res.pulled) {
        toast.success(`${t("pulledOk")} — ${res.pulled.totalKeys} keys (${res.pulled.added} added)`);
      } else if (kind === "push") {
        toast.success(t("pushedOk"));
      } else {
        toast.success(t("syncDone"));
      }
    } finally { setSyncBusy(null); }
  };



  const swatches = [
    { hue: "142", label: "Green" },
    { hue: "165", label: "Emerald" },
    { hue: "200", label: "Cyan" },
    { hue: "250", label: "Blue" },
    { hue: "290", label: "Violet" },
    { hue: "330", label: "Magenta" },
    { hue: "25", label: "Red" },
    { hue: "45", label: "Orange" },
  ];

  const langs: { code: Lang; native: string }[] = [
    { code: "fr", native: "Français" },
    { code: "en", native: "English" },
    { code: "ar", native: "العربية" },
  ];

  const themes: { code: Theme; label: string; icon: React.ReactNode }[] = [
    { code: "light", label: t("light"), icon: <Sun className="h-4 w-4" /> },
    { code: "dark", label: t("dark"), icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-svh flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 max-w-5xl">
          <Link to="/app" className="group flex items-center gap-2.5">
            <img
              src={fvLogo.url}
              alt="FV logo"
              className="engraved-logo w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="leading-tight">
              <div className="font-display text-sm tracking-tight">PocketLab</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground -mt-0.5">F–V Profile</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground hidden sm:block mr-2">{user?.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("settings")}
            >
              <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              aria-label={t("logout")}
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </header>


      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl uppercase tracking-wide">{t("settings")}</DialogTitle>
            <DialogDescription>{"\n"}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <section className="space-y-3 glass-card p-5 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <h3 className="text-lg uppercase">{t("language")}</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {langs.map((l) => {
                  const active = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "border-primary bg-primary/10 text-primary shadow-glow"
                          : "border-border bg-background hover:border-primary/40"
                      )}
                    >
                      {l.native}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 glass-card p-5 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <h3 className="text-lg uppercase">{t("theme")}</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {themes.map((th) => {
                  const active = theme === th.code;
                  return (
                    <button
                      key={th.code}
                      onClick={() => setTheme(th.code)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "border-primary bg-primary/10 text-primary shadow-glow"
                          : "border-border bg-background hover:border-primary/40"
                      )}
                    >
                      {th.icon}
                      {th.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{"\n"}</p>
                <div className="grid grid-cols-8 gap-2.5 py-1">
                  {swatches.map((s) => {
                    const active = accent === s.hue;
                    return (
                      <button
                        key={s.hue}
                        onClick={() => setAccent(s.hue)}
                        aria-label={s.label}
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-full outline-none transition-all duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          active && "scale-110"
                        )}
                        style={{
                          background: `radial-gradient(circle at 30% 25%, hsl(${s.hue} 100% 78%) 0%, hsl(${s.hue} 92% 55%) 45%, hsl(${s.hue} 85% 42%) 100%)`,
                          boxShadow: active
                            ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(${s.hue} 90% 55%), 0 6px 18px hsl(${s.hue} 90% 55% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.35), inset 0 -3px 6px hsl(0 0% 0% / 0.25)`
                            : `0 4px 12px hsl(${s.hue} 90% 55% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.3), inset 0 -3px 6px hsl(0 0% 0% / 0.22), inset 0 0 0 1px hsl(0 0% 100% / 0.12)`,
                        }}
                      >
                        {active && (
                          <Check
                            className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                            strokeWidth={3.5}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{"\n"}</span>
                  <span className="font-mono">{"\n"}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={Number(accent)}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, hsl(0 90% 55%), hsl(60 90% 55%), hsl(120 90% 55%), hsl(180 90% 55%), hsl(240 90% 55%), hsl(300 90% 55%), hsl(360 90% 55%))",
                  }}
                />
              </div>
            </section>



            <section className="space-y-3 glass-card p-5 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <h3 className="text-lg uppercase">{t("cloudBackup")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{"\n"}</p>

              {syncProvider === "none" ? (
                <div className="space-y-2">
                  {preferredProvider === "icloud" ? (
                    <Button
                      onClick={() => enableSync("icloud")}
                      className="w-full bg-gradient-primary text-primary-foreground"
                    >
                      {t("backupICloud")}
                    </Button>
                  ) : (
                    <button
                      onClick={() => enableSync("gdrive")}
                      disabled={!gdriveAvailable}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-all hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("backupGDrive")}
                    </button>
                  )}
                  {preferredProvider === "gdrive" && !gdriveAvailable && (
                    <p className="text-[11px] text-muted-foreground">{"\n"}</p>
                  )}
                  <button
                    onClick={() => enableSync("file")}
                    className="w-full text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2"
                  >
                    {""}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("provider")} :{" "}
                      <span className="text-foreground font-medium">
                        {syncProvider === "gdrive" && "Google Drive"}
                        {syncProvider === "icloud" && "iCloud Drive"}
                        {syncProvider === "file" && ".slfv"}
                      </span>
                    </span>
                    <button onClick={disableSync} className="text-muted-foreground hover:text-destructive underline underline-offset-2">
                      {t("disable")}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button variant="outline" size="sm" disabled={!!syncBusy} onClick={() => runSync("pull")}>
                      <Download className="h-3.5 w-3.5 mr-1" /> {t("pull")}
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!syncBusy} onClick={() => runSync("push")}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> {t("push")}
                    </Button>
                    <Button size="sm" disabled={!!syncBusy || syncProvider !== "gdrive"} onClick={() => runSync("both")} className="bg-gradient-primary text-primary-foreground">
                      <RefreshCw className={cn("h-3.5 w-3.5 mr-1", syncBusy === "both" && "animate-spin")} /> {t("sync")}
                    </Button>
                  </div>

                  {syncProvider === "icloud" && (
                    <p className="text-[11px] text-muted-foreground">{t("iCloudHint")}</p>
                  )}
                  {lastSyncAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("lastSync")} : {new Date(lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </section>


          </div>


          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)} className="bg-gradient-primary text-primary-foreground">
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="flex-1 container max-w-5xl pb-28 pt-4 min-h-[calc(100svh-3.5rem)] bg-background">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="container max-w-5xl grid grid-cols-3 [perspective:800px]">
          {navItems.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group relative flex flex-col items-center gap-1 py-3 text-[11px] font-bold uppercase tracking-wide transition-all duration-300 [transform-style:preserve-3d]",
                  isActive
                    ? "text-primary [transform:translateY(-4px)_rotateX(12deg)] drop-shadow-[0_6px_10px_hsl(var(--primary)/0.45)]"
                    : "text-muted-foreground hover:text-foreground hover:[transform:translateY(-2px)_rotateX(8deg)]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-6 top-1 h-10 rounded-2xl bg-gradient-primary opacity-20 blur-md -z-10"
                    />
                  )}
                  <Icon
                    strokeWidth={2}
                    className={cn(
                      "h-[22px] w-[22px] transition-all duration-300",
                      isActive && "scale-110 drop-shadow-[0_3px_6px_hsl(var(--primary)/0.6)]"
                    )}
                  />
                  {t(labelKey)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
