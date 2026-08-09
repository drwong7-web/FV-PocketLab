import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png";
import { Activity, Check, Download, Home, LogOut, Moon, RefreshCw, Settings as SettingsIcon, Sun, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings, type Lang, type Theme } from "@/lib/settings";

import {
  getPublicConfig,
  getSyncState,
  detectPreferredProvider,
  managedGoogleClientId,
  type SyncProvider,
} from "@/lib/sync/config";
import {
  connectGDrive,
  connectICloud,
  connectFileSync,
  disconnectCloud,
} from "@/lib/sync/adapters";
import { syncPushNow, syncPullNow, syncBothNow } from "@/lib/sync/manager";
import { resetOnboarding } from "@/lib/onboarding";
import type { PlanId, PlanStatus } from "@/lib/plan";

import { cn } from "@/lib/utils";

import type { TKey } from "@/lib/settings";

const navItems: { to: string; labelKey: TKey; icon: typeof Home; end?: boolean }[] = [
  { to: "/app", labelKey: "navDashboard", icon: Home, end: true },
  { to: "/app/teams", labelKey: "navTeams", icon: Users },
  { to: "/app/tests", labelKey: "navTests", icon: Activity },
];

const PLAN_LABEL: Record<PlanId, TKey> = {
  free: "planFree",
  pro_monthly: "planProMonthly",
  lifetime: "planLifetime",
};

const PLAN_STATUS_LABEL: Record<PlanStatus, TKey> = {
  active: "planStatusActive",
  trialing: "planStatusTrialing",
  past_due: "planStatusPastDue",
  canceled: "planStatusCanceled",
  expired: "planStatusExpired",
};

export default function AppLayout() {
  const { user, signOut, entitlements, offlineMode, refreshEntitlements } = useAuth();
  const { lang, theme, accent, setLang, setTheme, setAccent, t } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [exportDir, setExportDir] = useState<string | null>(null);
  const [syncProvider, setSyncProviderState] = useState<SyncProvider>("none");
  const [syncBusy, setSyncBusy] = useState<null | "push" | "pull" | "both" | "connect">(null);
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

  const refreshSyncUi = () => {
    const cfg = getPublicConfig();
    setSyncProviderState(cfg.provider);
    setLastSyncAt(getSyncState().lastSyncAt);
  };

  const connectCloud = async () => {
    setSyncBusy("connect");
    try {
      if (preferredProvider === "icloud") {
        connectICloud();
        toast.success(t("syncConnected"));
      } else if (gdriveAvailable) {
        await connectGDrive();
        toast.success(t("syncConnected"));
      } else {
        connectFileSync();
        toast.success(t("syncConnectedFile"));
      }
      refreshSyncUi();
    } catch (err) {
      toast.error((err as Error).message || t("syncError"));
    } finally {
      setSyncBusy(null);
    }
  };

  const connectFileOnly = () => {
    connectFileSync();
    toast.success(t("syncConnectedFile"));
    refreshSyncUi();
  };

  const disableSync = async () => {
    setSyncBusy("connect");
    try {
      await disconnectCloud();
      refreshSyncUi();
      toast.success(t("syncDisconnected"));
    } catch (err) {
      toast.error((err as Error).message || t("syncError"));
    } finally {
      setSyncBusy(null);
    }
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
          <Link to="/app" className="group flex items-center gap-1">
            <img
              src={fvLogo}
              alt="FV logo"
              className="engraved-logo w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="font-display text-sm tracking-tight">PocketLab</div>
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
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg uppercase font-semibold">{t("account")}</h3>
                {offlineMode && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                    {t("offlineBadge")}
                  </span>
                )}
              </div>

              {user && (
                <p className="text-xs text-muted-foreground">
                  {t("signedInAs")} <span className="text-foreground">{user.email || user.name}</span>
                </p>
              )}

              <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="section-label">{t("planLabel")}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      entitlements.fullAccess
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t(PLAN_LABEL[entitlements.plan])}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{t(PLAN_STATUS_LABEL[entitlements.status])}</span>
                  {entitlements.periodEnd && (
                    <span className="mono-num">
                      {t("planRenewsOn")}{" "}
                      {new Date(entitlements.periodEnd).toLocaleDateString(lang)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {entitlements.fullAccess ? t("planFullAccessNote") : t("planLimitedNote")}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {offlineMode ? t("planOfflineNote") : t("planUpgradeSoon")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={planBusy || offlineMode}
                  onClick={async () => {
                    setPlanBusy(true);
                    try {
                      await refreshEntitlements();
                    } finally {
                      setPlanBusy(false);
                    }
                  }}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", planBusy && "animate-spin")} />
                  {t("planRefresh")}
                </Button>
              </div>
            </section>

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
                  className="hue-slider h-2.5 w-full cursor-pointer appearance-none rounded-full shadow-inner"
                  style={{
                    background:
                      "linear-gradient(to right, hsl(0 90% 55%), hsl(60 90% 55%), hsl(120 90% 55%), hsl(180 90% 55%), hsl(240 90% 55%), hsl(300 90% 55%), hsl(360 90% 55%))",
                    ["--thumb-hue" as any]: String(accent),
                  }}
                />
              </div>
            </section>

            <section className="space-y-3 glass-card p-5 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <h3 className="text-lg uppercase">{t("cloudBackup")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{t("cloudBackupDesc")}</p>

              {syncProvider === "none" ? (
                <div className="space-y-2">
                  {preferredProvider === "icloud" ? (
                    <Button
                      onClick={() => connectCloud()}
                      disabled={!!syncBusy}
                      className="w-full bg-gradient-primary text-primary-foreground"
                    >
                      {syncBusy === "connect" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        t("connectICloud")
                      )}
                    </Button>
                  ) : gdriveAvailable ? (
                    <Button
                      onClick={() => connectCloud()}
                      disabled={!!syncBusy}
                      className="w-full bg-gradient-primary text-primary-foreground"
                    >
                      {syncBusy === "connect" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        t("connectGDrive")
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => connectFileOnly()}
                        disabled={!!syncBusy}
                        className="w-full bg-gradient-primary text-primary-foreground"
                      >
                        {t("useSlfvFile")}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">{t("gdriveUnavailable")}</p>
                    </>
                  )}
                  {(preferredProvider === "icloud" || gdriveAvailable) && (
                    <button
                      type="button"
                      onClick={() => connectFileOnly()}
                      disabled={!!syncBusy}
                      className="w-full text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2 disabled:opacity-50"
                    >
                      {t("useSlfvFile")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {syncProvider === "gdrive" && "Google Drive"}
                        {syncProvider === "icloud" && "iCloud Drive"}
                        {syncProvider === "file" && ".slfv"}
                      </span>
                      {" · "}
                      <span className="text-primary">{t("syncConnectedStatus")}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => disableSync()}
                      disabled={!!syncBusy}
                      className="text-muted-foreground hover:text-destructive underline underline-offset-2 disabled:opacity-50"
                    >
                      {t("disconnectCloud")}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button variant="outline" size="sm" disabled={!!syncBusy} onClick={() => runSync("pull")}>
                      <Download className="h-3.5 w-3.5 mr-1" /> {t("pull")}
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!syncBusy} onClick={() => runSync("push")}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> {t("push")}
                    </Button>
                    <Button size="sm" disabled={!!syncBusy} onClick={() => runSync("both")} className="bg-gradient-primary text-primary-foreground">
                      <RefreshCw className={cn("h-3.5 w-3.5 mr-1", syncBusy === "both" && "animate-spin")} /> {t("sync")}
                    </Button>
                  </div>

                  {syncProvider === "icloud" && (
                    <p className="text-[11px] text-muted-foreground">{t("iCloudHint")}</p>
                  )}
                  {syncProvider === "file" && (
                    <p className="text-[11px] text-muted-foreground">{t("fileSyncHint")}</p>
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


          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                resetOnboarding();
                setSettingsOpen(false);
                if (window.location.pathname !== "/app") {
                  window.location.assign("/app");
                } else {
                  window.location.reload();
                }
              }}
            >
              {t("onbReplay")}
            </Button>
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
