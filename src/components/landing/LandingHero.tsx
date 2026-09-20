import { ArrowRight } from "lucide-react";
import fvLogo from "@/assets/fv-logo.png";
import logoJump from "@/assets/logo-jump-neon.png";
import logoSprint from "@/assets/logo-sprint-neon.png";
import { Button } from "@/components/ui/button";
import { useSettings, type TKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CenterFlickerTitle } from "./CenterFlickerTitle";
import { HeroFVProfiles } from "./HeroFVProfiles";

const FIELD: { key: TKey; className: string; delay: string }[] = [
  { key: "landVerbProfile", className: "top-[6%] left-[4%] text-xl sm:text-3xl", delay: "0s" },
  { key: "landVerbTest", className: "top-[10%] right-[8%] text-lg sm:text-2xl", delay: "0.7s" },
  { key: "landVerbAnalyze", className: "top-[28%] left-[2%] text-base sm:text-xl", delay: "1.4s" },
  { key: "landVerbSprint", className: "bottom-[22%] left-[6%] text-lg sm:text-2xl", delay: "2.1s" },
  { key: "landVerbJump", className: "bottom-[18%] right-[6%] text-xl sm:text-3xl", delay: "2.8s" },
  { key: "landVerbExport", className: "top-[42%] right-[3%] text-base sm:text-xl", delay: "3.5s" },
  { key: "landVerbCalibrate", className: "bottom-[8%] left-[28%] text-sm sm:text-lg", delay: "1.1s" },
  { key: "landVerbRecord", className: "top-[4%] left-[38%] text-sm sm:text-lg", delay: "1.8s" },
  { key: "landVerbSplit", className: "bottom-[6%] right-[30%] text-sm sm:text-lg", delay: "2.4s" },
  { key: "landVerbReport", className: "top-[34%] right-[18%] hidden sm:block text-lg", delay: "0.4s" },
  { key: "landVerbRoster", className: "bottom-[36%] left-[14%] hidden md:block text-lg", delay: "3.1s" },
  { key: "landVerbMeasure", className: "top-[18%] left-[22%] hidden md:block text-base", delay: "4.2s" },
];

export function LandingHero() {
  const { t } = useSettings();

  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {FIELD.map((item) => (
          <span
            key={item.key}
            className={cn(
              "absolute font-display text-muted-foreground select-none animate-landing-verb motion-reduce:animate-none motion-reduce:opacity-30",
              item.className
            )}
            style={{ animationDelay: item.delay }}
          >
            {t(item.key)}
          </span>
        ))}
        <img
          src={logoSprint}
          alt=""
          className="engraved-logo absolute top-[12%] right-[22%] hidden lg:block h-14 w-14 object-contain opacity-40 animate-landing-verb motion-reduce:animate-none"
          style={{ animationDelay: "1.6s" }}
        />
        <img
          src={logoJump}
          alt=""
          className="engraved-logo absolute bottom-[14%] left-[18%] hidden lg:block h-14 w-14 object-contain opacity-40 animate-landing-verb motion-reduce:animate-none"
          style={{ animationDelay: "3.2s" }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6 text-center lg:text-start">
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2">
                <div className="logo-well inline-flex h-20 w-20 items-center justify-center p-2">
                  <img
                    src={fvLogo}
                    alt=""
                    className="engraved-logo h-full w-full object-contain animate-landing-letter motion-reduce:animate-none"
                    style={{ animationDelay: "0s" }}
                  />
                </div>
                <span className="font-display text-2xl tracking-tight inline-flex" aria-label="PocketLab">
                  {Array.from("PocketLab").map((ch, i) => (
                    <span
                      key={`${ch}-${i}`}
                      className="inline-block animate-landing-letter motion-reduce:animate-none"
                      style={{ animationDelay: `${(i + 1) * 0.14}s` }}
                      aria-hidden
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <CenterFlickerTitle
              as="h1"
              text={t("landHeroTitle")}
              className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] tracking-tight"
            />
            <div className="text-muted-foreground text-center lg:text-start max-w-xl mx-auto lg:mx-0 leading-snug">
              <p>{t("landHeroSub")}</p>
              <p>{t("landHeroSub2")}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Button asChild size="lg">
                <a href="#pricing">
                  {t("getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6 bg-gradient-to-br from-primary/10 to-transparent shadow-elevated">
            <HeroFVProfiles />
          </div>
        </div>
      </div>
    </section>
  );
}
