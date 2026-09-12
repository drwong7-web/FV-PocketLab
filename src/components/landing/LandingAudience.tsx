import { useSettings, type TKey } from "@/lib/settings";
import { CenterFlickerTitle } from "./CenterFlickerTitle";
import { LandingSection } from "./LandingSection";

const CHIPS: TKey[] = [
  "landWhoCoach",
  "landWhoSC",
  "landWhoLab",
  "landWhoClub",
  "landWhoResearch",
  "landWhoAthlete",
];

const COPIES = 6;

export function LandingAudience() {
  const { t } = useSettings();

  return (
    <LandingSection className="py-10 sm:py-14">
      <p className="section-label text-center">{t("landWhoOverline")}</p>
      <CenterFlickerTitle
        text={t("landWhoTitle")}
        className="font-display text-2xl sm:text-3xl tracking-tight mt-2 flex w-full flex-wrap items-center justify-center leading-none"
      />
      <div
        className="mt-8 -mx-4 sm:-mx-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        dir="ltr"
      >
        <div className="flex w-max gap-5 pe-5 animate-landing-marquee motion-reduce:animate-none hover:[animation-play-state:paused] will-change-transform">
          {Array.from({ length: COPIES }, (_, copy) =>
            CHIPS.map((key) => (
              <span
                key={`${copy}-${key}`}
                aria-hidden={copy > 0}
                className="shrink-0 rounded-full border border-accent/35 bg-gradient-to-br from-accent/25 to-transparent px-6 py-3 sm:px-8 sm:py-3.5 text-base sm:text-lg font-medium text-foreground"
              >
                {t(key)}
              </span>
            ))
          )}
        </div>
      </div>
    </LandingSection>
  );
}
