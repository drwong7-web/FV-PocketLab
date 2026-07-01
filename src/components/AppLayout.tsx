import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Activity, Check, Cloud, CloudOff, Download, Folder, Home, Key, Languages, Moon, Palette, RefreshCw, Settings as SettingsIcon, Sun, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings, type Lang, type Theme } from "@/lib/settings";
import { clearExportDirectory, getExportDirectoryLabel, isDirectoryPickerSupported, isInIframe, pickExportDirectory } from "@/lib/exportTarget";
import { getAIKey, setAIKey, getAIModel, setAIModel } from "@/lib/ai/client";
import {
  getPublicConfig, setPublicConfig, getSecretConfig, setSecretConfig,
  getSyncState, type SyncProvider,
} from "@/lib/sync/config";
import { syncPushNow, syncPullNow, syncBothNow } from "@/lib/sync/manager";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Dashboard", icon: Home, end: true },
  { to: "/app/teams", label: "Teams", icon: Users },
  { to: "/app/tests", label: "Tests", icon: Activity },
];

export default function AppLayout() {
  const { user } = useAuth();
  const { lang, theme, accent, setLang, setTheme, setAccent, t } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportDir, setExportDir] = useState<string | null>(null);
  const [aiKey, setAIKeyState] = useState("");
  const [aiModel, setAIModelState] = useState("gemini-2.5-pro");
  const [showKey, setShowKey] = useState(false);
  const [syncProvider, setSyncProviderState] = useState<SyncProvider>("none");
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUser, setWebdavUser] = useState("");
  const [webdavPass, setWebdavPass] = useState("");
  const [webdavPath, setWebdavPath] = useState("/SprintLab/snapshot.slfv");
  const [gdriveClientId, setGdriveClientId] = useState("");
  const [gdriveFileName, setGdriveFileName] = useState("sprintlab.slfv");
  const [syncBusy, setSyncBusy] = useState<null | "push" | "pull" | "both">(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>(undefined);
  const pickerSupported = isDirectoryPickerSupported();
  const inIframe = isInIframe();

  useEffect(() => {
    if (settingsOpen) {
      setExportDir(getExportDirectoryLabel());
      setAIKeyState(getAIKey());
      setAIModelState(getAIModel());
      setShowKey(false);
      const cfg = getPublicConfig();
      setSyncProviderState(cfg.provider);
      setWebdavUrl(cfg.webdavUrl || "");
      setWebdavUser(cfg.webdavUser || "");
      setWebdavPath(cfg.webdavPath || "/SprintLab/snapshot.slfv");
      setGdriveClientId(cfg.gdriveClientId || "");
      setGdriveFileName(cfg.gdriveFileName || "sprintlab.slfv");
      setLastSyncAt(getSyncState().lastSyncAt);
      getSecretConfig().then((s) => setWebdavPass(s.webdavPassword || ""));
    }
  }, [settingsOpen]);

  const saveSyncSettings = async () => {
    try {
      setPublicConfig({
        provider: syncProvider,
        webdavUrl: webdavUrl.trim() || undefined,
        webdavUser: webdavUser.trim() || undefined,
        webdavPath: webdavPath.trim() || undefined,
        gdriveClientId: gdriveClientId.trim() || undefined,
        gdriveFileName: gdriveFileName.trim() || undefined,
      });
      const prev = await getSecretConfig();
      await setSecretConfig({ ...prev, webdavPassword: webdavPass || undefined });
      toast.success("Configuration sync enregistrée");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runSync = async (kind: "push" | "pull" | "both") => {
    setSyncBusy(kind);
    try {
      const fn = kind === "push" ? syncPushNow : kind === "pull" ? () => syncPullNow("merge") : syncBothNow;
      const res = await fn();
      if (!res.ok) { toast.error(res.error || "Erreur de synchronisation"); return; }
      setLastSyncAt(getSyncState().lastSyncAt);
      if (kind === "pull" && res.pulled) {
        toast.success(`Pull OK — ${res.pulled.totalKeys} clés (${res.pulled.added} ajoutées)`);
      } else if (kind === "push") {
        toast.success("Push OK");
      } else {
        toast.success("Sync OK");
      }
    } finally { setSyncBusy(null); }
  };

  const saveAISettings = async () => {
    try {
      await setAIKey(aiKey.trim());
      setAIModel(aiModel.trim() || "gemini-2.5-pro");
      toast.success(aiKey.trim() ? "Clé IA enregistrée" : "Clé IA supprimée");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };



  const handlePickFolder = async () => {
    const res = await pickExportDirectory();
    if (res.ok === true) {
      setExportDir(res.name);
      toast.success(`${t("savedTo")} ${res.name}`);
      return;
    }
    switch (res.reason) {
      case "cancelled": toast(t("pickerCancelled")); break;
      case "iframe-blocked": toast.error(t("iframeBlocked")); break;
      case "unsupported": toast.error(t("browserUnsupported")); break;
      default: toast.error(res.message || t("browserUnsupported"));
    }
  };
  const handleResetFolder = async () => {
    await clearExportDirectory();
    setExportDir(null);
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
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 max-w-5xl">
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary shadow-glow flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm tracking-tight">SprintLab</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">FV Pro</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground hidden sm:block mr-1">{user?.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("settings")}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>


      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl uppercase tracking-wide">{t("settings")}</DialogTitle>
            <DialogDescription>{t("appearance")} · {t("language")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4 text-primary" />
                <h3>{t("language")}</h3>
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
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      {l.native}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Palette className="h-4 w-4 text-primary" />
                <h3>{t("theme")}</h3>
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
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      {th.icon}
                      {th.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("accentColor")}</p>
                <div className="grid grid-cols-8 gap-2">
                  {swatches.map((s) => {
                    const active = accent === s.hue;
                    return (
                      <button
                        key={s.hue}
                        onClick={() => setAccent(s.hue)}
                        aria-label={s.label}
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                          active ? "border-foreground" : "border-transparent"
                        )}
                        style={{ background: `hsl(${s.hue} 90% 55%)` }}
                      >
                        {active && <Check className="h-4 w-4 text-background" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("customHue")}</span>
                  <span className="font-mono">{accent}°</span>
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

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Folder className="h-4 w-4 text-primary" />
                <h3>{t("exportFolder")}</h3>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{exportDir ?? t("defaultDownloads")}</span>
              </div>
              {pickerSupported ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePickFolder} className="flex-1">
                    {t("chooseFolder")}
                  </Button>
                  {exportDir && (
                    <Button variant="ghost" size="sm" onClick={handleResetFolder}>
                      {t("resetFolder")}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("folderNotSupported")}</p>
              )}
              {pickerSupported && inIframe && (
                <p className="text-xs text-muted-foreground">
                  {t("iframeBlocked")}{" "}
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {t("openInNewTab")}
                  </a>
                </p>
              )}
            </section>


            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {syncProvider === "none" ? <CloudOff className="h-4 w-4 text-primary" /> : <Cloud className="h-4 w-4 text-primary" />}
                <h3>Sync (BYOC — Bring Your Own Cloud)</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Vos données restent sur l'appareil. Choisissez où exporter une copie de sauvegarde.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {([
                  { id: "none", label: "Aucun" },
                  { id: "file", label: "Fichier" },
                  { id: "webdav", label: "WebDAV" },
                  { id: "gdrive", label: "Drive" },
                ] as { id: SyncProvider; label: string }[]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSyncProviderState(p.id)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs font-medium transition-all",
                      syncProvider === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {syncProvider === "webdav" && (
                <div className="space-y-2">
                  <Input value={webdavUrl} onChange={(e) => setWebdavUrl(e.target.value)} placeholder="https://cloud.example.com/remote.php/dav/files/user" className="h-9 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={webdavUser} onChange={(e) => setWebdavUser(e.target.value)} placeholder="Utilisateur" className="h-9 text-xs" />
                    <Input type="password" value={webdavPass} onChange={(e) => setWebdavPass(e.target.value)} placeholder="Mot de passe / App password" className="h-9 text-xs" />
                  </div>
                  <Input value={webdavPath} onChange={(e) => setWebdavPath(e.target.value)} placeholder="/SprintLab/snapshot.slfv" className="h-9 text-xs font-mono" />
                </div>
              )}

              {syncProvider === "gdrive" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Créez un OAuth Client ID Web sur{" "}
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a>
                    {" "}avec l'origin <code className="font-mono">{window.location.origin}</code> autorisée. Scope utilisé : <code className="font-mono">drive.appdata</code>.
                  </p>
                  <Input value={gdriveClientId} onChange={(e) => setGdriveClientId(e.target.value)} placeholder="123…apps.googleusercontent.com" className="h-9 text-xs font-mono" />
                  <Input value={gdriveFileName} onChange={(e) => setGdriveFileName(e.target.value)} placeholder="sprintlab.slfv" className="h-9 text-xs font-mono" />
                </div>
              )}

              {syncProvider !== "none" && (
                <Button variant="outline" size="sm" onClick={saveSyncSettings} className="w-full">
                  Enregistrer la configuration
                </Button>
              )}

              {syncProvider !== "none" && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button variant="outline" size="sm" disabled={!!syncBusy} onClick={() => runSync("pull")}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Pull
                  </Button>
                  <Button variant="outline" size="sm" disabled={!!syncBusy} onClick={() => runSync("push")}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> Push
                  </Button>
                  <Button size="sm" disabled={!!syncBusy || syncProvider === "file"} onClick={() => runSync("both")} className="bg-gradient-primary text-primary-foreground">
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1", syncBusy === "both" && "animate-spin")} /> Sync
                  </Button>
                </div>
              )}

              {lastSyncAt && (
                <p className="text-[11px] text-muted-foreground">
                  Dernière synchronisation : {new Date(lastSyncAt).toLocaleString()}
                </p>
              )}
            </section>





            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Key className="h-4 w-4 text-primary" />
                <h3>Clé IA (Google Gemini)</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Vos clés et données restent sur votre appareil. Obtenez une clé gratuite sur{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary underline">aistudio.google.com/apikey</a>.
              </p>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={aiKey}
                  onChange={(e) => setAIKeyState(e.target.value)}
                  placeholder="AIza…"
                  className="font-mono text-xs"
                  autoComplete="off"
                />
                <Button variant="outline" size="sm" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? "Masquer" : "Voir"}
                </Button>
              </div>
              <Input
                value={aiModel}
                onChange={(e) => setAIModelState(e.target.value)}
                placeholder="gemini-2.5-pro"
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={saveAISettings} className="w-full">
                Enregistrer la clé IA
              </Button>
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
        <div className="container max-w-5xl grid grid-cols-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
