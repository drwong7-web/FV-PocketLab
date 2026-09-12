import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { CenterFlickerTitle } from "./CenterFlickerTitle";
import { LandingSection } from "./LandingSection";

export function LandingCta() {
  const { t } = useSettings();

  return (
    <LandingSection className="pt-8 sm:pt-12">
      <div className="glass-card p-8 sm:p-12 text-center bg-gradient-to-br from-primary/10 to-transparent shadow-elevated">
        <CenterFlickerTitle
          text={t("landCtaTitle")}
          className="font-display text-3xl sm:text-4xl tracking-tight"
        />
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">{t("landCtaSub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href="#pricing">
              {t("getStarted")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </LandingSection>
  );
}
