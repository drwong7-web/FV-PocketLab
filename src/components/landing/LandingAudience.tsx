import { useSettings, type TKey } from "@/lib/settings";
import { LandingSection } from "./LandingSection";

const CHIPS: TKey[] = [
  "landWhoCoach",
  "landWhoSC",
  "landWhoLab",
  "landWhoClub",
  "landWhoResearch",
  "landWhoAthlete",
];

export function LandingAudience() {
  const { t } = useSettings();

  const renderRow = (copy: number) => (
    <div key={copy} className="flex items-center gap-3 pr-3" aria-hidden={copy === 1}>
      {CHIPS.map((key) => (
        <span
          key={`${copy}-${key}`}
          className="shrink-0 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-sm text-foreground"
        >
          {t(key)}
        </span>
      ))}
    </div>
  );

  return (
    <LandingSection className="py-10 sm:py-14">
      <p className="section-label text-center">{t("landWhoOverline")}</p>
      <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-center mt-2">
        {t("landWhoTitle")}
      </h2>
      <div className="mt-8 overflow-hidden" dir="ltr">
        <div className="flex w-max animate-landing-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
          {renderRow(0)}
          {renderRow(1)}
        </div>
      </div>
    </LandingSection>
  );
}
