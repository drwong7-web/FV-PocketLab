import { Check } from "lucide-react";
import { useSettings, type TKey } from "@/lib/settings";
import { LandingSection } from "./LandingSection";

const BULLETS: TKey[] = [
  "landValueBullet1",
  "landValueBullet2",
  "landValueBullet3",
  "landValueBullet4",
];

export function LandingValue() {
  const { t } = useSettings();

  return (
    <LandingSection id="how">
      <p className="section-label">{t("landValueOverline")}</p>
      <h2 className="font-display text-3xl sm:text-4xl tracking-tight mt-2 max-w-2xl">
        {t("landValueTitle")}
      </h2>
      <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">{t("landValueSub")}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {BULLETS.map((key) => (
          <li
            key={key}
            className="glass-card flex items-start gap-3 p-4 bg-gradient-to-br from-primary/10 to-transparent"
          >
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm leading-relaxed">{t(key)}</span>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
