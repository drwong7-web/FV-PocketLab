import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Check, Moon, Sun, Timer, Upload, Users, X, Zap } from "lucide-react";
import fvLogo from "@/assets/fv-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { useSettings, type Lang, type Theme, type TKey } from "@/lib/settings";
import { markOnboardingDone, setOnboardingResume } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const SWATCHES = [
  { hue: "142", label: "Green" },
  { hue: "165", label: "Emerald" },
  { hue: "200", label: "Cyan" },
  { hue: "250", label: "Blue" },
  { hue: "290", label: "Violet" },
  { hue: "330", label: "Magenta" },
  { hue: "25", label: "Red" },
  { hue: "45", label: "Orange" },
];

const LANGS: { code: Lang; native: string }[] = [
  { code: "fr", native: "Français" },
  { code: "en", native: "English" },
  { code: "ar", native: "العربية" },
];

export function OnboardingCarousel({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang, theme, setTheme, accent, setAccent } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const total = 5;

  const finish = () => {
    markOnboardingDone();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, total - 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goto = (path: string) => {
    if (path === "/app/teams") {
      setOnboardingResume("teams-create");
    } else {
      markOnboardingDone();
    }
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
      <button
        onClick={finish}
        className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        aria-label={t("onbSkip")}
      >
        <X className="w-3.5 h-3.5" />
        {t("onbSkip")}
      </button>

      <div className="w-full max-w-lg glass-card p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-transparent shadow-elevated">
        <div className="min-h-[420px] flex flex-col">
          <div className="flex-1">
            {step === 0 && (
              <SlideWelcome titleKey="onb1Title" subKey="onb1Sub" />
            )}
            {step === 1 && (
              <SlideLangTheme
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                accent={accent}
                setAccent={setAccent}
                t={t}
              />
            )}
            {step === 2 && (
              <SlideAction
                titleKey="onb3Title"
                subKey="onb3Sub"
                icon={<Users className="w-8 h-8" strokeWidth={1.75} />}
                ctaLabel={t("onb3Cta")}
                onCta={() => goto("/app/teams")}
              />
            )}
            {step === 3 && <SlideTests t={t} onCta={() => goto("/app/tests/new")} />}
            {step === 4 && (
              <SlideBackup titleKey="onb5Title" subKey="onb5Sub" />
            )}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Step ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
                className="disabled:opacity-30"
              >
                {t("onbPrev")}
              </Button>
              {step < total - 1 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  {t("onbNext")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={finish}
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  {t("onbStart")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideWelcome({ titleKey, subKey }: { titleKey: TKey; subKey: TKey }) {
  const { t } = useSettings();
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-4">
      <img src={fvLogo.url} alt="FV" className="engraved-logo w-24 h-24 object-contain" />
      <h2 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-md whitespace-pre-line">{t(subKey)}</p>
    </div>
  );
}

function SlideLangTheme({
  lang, setLang, theme, setTheme, accent, setAccent, t,
}: {
  lang: Lang; setLang: (l: Lang) => void;
  theme: Theme; setTheme: (th: Theme) => void;
  accent: string; setAccent: (h: string) => void;
  t: (k: TKey) => string;
}) {
  const themes: { code: Theme; label: string; icon: React.ReactNode }[] = [
    { code: "light", label: t("light"), icon: <Sun className="h-4 w-4" /> },
    { code: "dark", label: t("dark"), icon: <Moon className="h-4 w-4" /> },
  ];
  return (
    <div className="space-y-5 pt-2">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight">{t("onb2Title")}</h2>
        <p className="text-xs text-muted-foreground">{t("onb2Sub")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("language")}</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                  active ? "border-primary bg-primary/10 text-primary shadow-glow" : "border-border bg-background hover:border-primary/40"
                )}
              >
                {l.native}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("theme")}</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((th) => {
            const active = theme === th.code;
            return (
              <button
                key={th.code}
                onClick={() => setTheme(th.code)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  active ? "border-primary bg-primary/10 text-primary shadow-glow" : "border-border bg-background hover:border-primary/40"
                )}
              >
                {th.icon}
                {th.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("accentColor")}</p>
        <div className="grid grid-cols-8 gap-2 py-1">
          {SWATCHES.map((s) => {
            const active = accent === s.hue;
            return (
              <button
                key={s.hue}
                onClick={() => setAccent(s.hue)}
                aria-label={s.label}
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full outline-none transition-all",
                  active && "scale-110"
                )}
                style={{
                  background: `radial-gradient(circle at 30% 25%, hsl(${s.hue} 100% 78%) 0%, hsl(${s.hue} 92% 55%) 45%, hsl(${s.hue} 85% 42%) 100%)`,
                  boxShadow: active
                    ? `0 0 0 2px hsl(var(--background)), 0 0 0 3px hsl(${s.hue} 90% 55%), 0 4px 12px hsl(${s.hue} 90% 55% / 0.5)`
                    : `0 3px 8px hsl(${s.hue} 90% 55% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.3)`,
                }}
              >
                {active && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SlideAction({
  titleKey, subKey, icon, ctaLabel, onCta,
}: {
  titleKey: TKey; subKey: TKey; icon: React.ReactNode; ctaLabel: string; onCta: () => void;
}) {
  const { t } = useSettings();
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
        {icon}
      </div>
      <h2 className="text-xl font-bold tracking-tight">{t(titleKey)}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{t(subKey)}</p>
      <Button variant="outline" onClick={onCta} className="mt-2">
        {ctaLabel}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function SlideTests({ t, onCta }: { t: (k: TKey) => string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-2">
      <h2 className="text-xl font-bold tracking-tight">{t("onb4Title")}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{t("onb4Sub")}</p>
      <div className="grid grid-cols-2 gap-3 w-full mt-2">
        <div className="glass-card p-4 bg-gradient-to-br from-primary/10 to-transparent flex flex-col items-center gap-2">
          <Activity className="w-7 h-7 text-primary" strokeWidth={1.75} />
          <div className="text-sm font-semibold">{t("verticalJump")}</div>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-primary/10 to-transparent flex flex-col items-center gap-2">
          <Timer className="w-7 h-7 text-primary" strokeWidth={1.75} />
          <div className="text-sm font-semibold">{t("linearSprint")}</div>
        </div>
      </div>
      <Button variant="outline" onClick={onCta} className="mt-2">
        {t("onb4Cta")}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function SlideBackup({ titleKey, subKey }: { titleKey: TKey; subKey: TKey }) {
  const { t } = useSettings();
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
        <Upload className="w-8 h-8" strokeWidth={1.75} />
      </div>
      <h2 className="text-xl font-bold tracking-tight">{t(titleKey)}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{t(subKey)}</p>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-widest">
        <Zap className="w-3.5 h-3.5" /> Google Drive · iCloud · .slfv · Word · PDF
      </div>
    </div>
  );
}
