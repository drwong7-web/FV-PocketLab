import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "fr" | "en" | "ar";
export type Theme = "dark" | "light";

type Settings = {
  lang: Lang;
  theme: Theme;
  accent: string; // hue 0-360
};

const DEFAULT: Settings = { lang: "en", theme: "dark", accent: "142" };
const KEY = "sprintlab_settings_v1";

type Ctx = Settings & {
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setAccent: (hue: string) => void;
  t: (k: TKey) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

const TR = {
  settings: { fr: "Paramètres", en: "Settings", ar: "الإعدادات" },
  language: { fr: "Langue", en: "Language", ar: "اللغة" },
  theme: { fr: "Thème", en: "Theme", ar: "المظهر" },
  appearance: { fr: "Apparence", en: "Appearance", ar: "المظهر العام" },
  dark: { fr: "Sombre", en: "Dark", ar: "داكن" },
  light: { fr: "Clair", en: "Light", ar: "فاتح" },
  accentColor: { fr: "Couleur d'accent", en: "Accent color", ar: "لون التمييز" },
  customHue: { fr: "Teinte personnalisée", en: "Custom hue", ar: "تدرج مخصص" },
  done: { fr: "Terminé", en: "Done", ar: "تم" },
  logout: { fr: "Déconnexion", en: "Sign out", ar: "تسجيل الخروج" },
  exportFolder: { fr: "Dossier d'export des rapports", en: "Reports export folder", ar: "مجلد تصدير التقارير" },
  chooseFolder: { fr: "Choisir un dossier", en: "Choose folder", ar: "اختر مجلداً" },
  resetFolder: { fr: "Réinitialiser", en: "Reset", ar: "إعادة تعيين" },
  defaultDownloads: { fr: "Téléchargements par défaut", en: "Default Downloads", ar: "التنزيلات الافتراضية" },
  folderNotSupported: { fr: "Non supporté sur ce navigateur — utilise Téléchargements", en: "Not supported in this browser — uses Downloads", ar: "غير مدعوم في هذا المتصفح — يستخدم التنزيلات" },
  savedTo: { fr: "Enregistré dans", en: "Saved to", ar: "تم الحفظ في" },
} as const;

export type TKey = keyof typeof TR;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
    const html = document.documentElement;
    if (s.theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
    html.lang = s.lang;
    html.dir = s.lang === "ar" ? "rtl" : "ltr";

    const H = Number(s.accent) || 0;
    const H2 = (H + 55) % 360;
    const H3 = (H + 25) % 360;
    const isDark = s.theme === "dark";
    const primaryL = isDark ? 55 : 42;
    const primaryS = isDark ? 90 : 70;
    const primary = `${H} ${primaryS}% ${primaryL}%`;
    const primaryGlow = `${H} 100% 65%`;
    const accent = `${H2} 90% 58%`;
    const success = `${H} 70% 48%`;
    const primaryFg = isDark ? "222 30% 8%" : "0 0% 100%";

    html.style.setProperty("--primary", primary);
    html.style.setProperty("--primary-foreground", primaryFg);
    html.style.setProperty("--primary-glow", primaryGlow);
    html.style.setProperty("--ring", primary);
    html.style.setProperty("--accent", accent);
    html.style.setProperty("--accent-foreground", primaryFg);
    html.style.setProperty("--velocity", accent);
    html.style.setProperty("--phase-accel", primary);
    html.style.setProperty("--phase-max", accent);
    html.style.setProperty("--success", success);
    html.style.setProperty("--sidebar-primary", primary);
    html.style.setProperty("--sidebar-primary-foreground", primaryFg);
    html.style.setProperty("--sidebar-ring", primary);

    html.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${H} ${primaryS}% ${primaryL}%) 0%, hsl(${H3} 80% 50%) 100%)`
    );
    html.style.setProperty(
      "--gradient-accent",
      `linear-gradient(135deg, hsl(${H2} 90% 58%) 0%, hsl(${(H2 + 24) % 360} 90% 60%) 100%)`
    );
    const heroA = isDark ? 0.18 : 0.10;
    const heroB = isDark ? 0.12 : 0.07;
    html.style.setProperty(
      "--gradient-hero",
      `radial-gradient(ellipse at top, hsl(${H} ${primaryS}% ${primaryL}% / ${heroA}), transparent 60%), radial-gradient(ellipse at bottom right, hsl(${H2} 90% 58% / ${heroB}), transparent 60%)`
    );
    html.style.setProperty("--shadow-glow", `0 0 40px hsl(${H} ${primaryS}% ${primaryL}% / 0.35)`);
  }, [s]);

  const t = useCallback<Ctx["t"]>((k) => (TR[k]?.[s.lang] ?? (k as string)), [s.lang]);

  const value: Ctx = {
    ...s,
    setLang: (lang) => setS((p) => ({ ...p, lang })),
    setTheme: (theme) => setS((p) => ({ ...p, theme })),
    setAccent: (accent) => setS((p) => ({ ...p, accent })),
    t,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
