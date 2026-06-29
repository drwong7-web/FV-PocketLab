import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, Check, Folder, Home, Key, Languages, LogOut, Moon, Palette, Settings as SettingsIcon, Sun, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings, type Lang, type Theme } from "@/lib/settings";
import { clearExportDirectory, getExportDirectoryLabel, isDirectoryPickerSupported, isInIframe, pickExportDirectory } from "@/lib/exportTarget";
import { getAIKey, setAIKey, getAIModel, setAIModel } from "@/lib/ai/client";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Dashboard", icon: Home, end: true },
  { to: "/app/teams", label: "Teams", icon: Users },
  { to: "/app/tests", label: "Tests", icon: Activity },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, theme, accent, setLang, setTheme, setAccent, t } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportDir, setExportDir] = useState<string | null>(null);
  const [aiKey, setAIKeyState] = useState("");
  const [aiModel, setAIModelState] = useState("gemini-2.5-pro");
  const [showKey, setShowKey] = useState(false);
  const pickerSupported = isDirectoryPickerSupported();
  const inIframe = isInIframe();

  useEffect(() => {
    if (settingsOpen) {
      setExportDir(getExportDirectoryLabel());
      setAIKeyState(getAIKey());
      setAIModelState(getAIModel());
      setShowKey(false);
    }
  }, [settingsOpen]);

  const saveAISettings = () => {
    setAIKey(aiKey.trim());
    setAIModel(aiModel.trim() || "gemini-2.5-pro");
    toast.success(aiKey.trim() ? "Clé IA enregistrée" : "Clé IA supprimée");
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
            <span className="text-xs text-muted-foreground hidden sm:block mr-1">{user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("settings")}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { signOut(); navigate("/auth"); }}
              aria-label={t("logout")}
            >
              <LogOut className="w-4 h-4" />
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
