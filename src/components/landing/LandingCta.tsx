import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { LandingSection } from "./LandingSection";

export function LandingCta() {
  const { t } = useSettings();

  return (
    <LandingSection className="pt-8 sm:pt-12">
      <div className="glass-card p-8 sm:p-12 text-center bg-gradient-to-br from-primary/10 to-transparent shadow-elevated">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight">{t("landCtaTitle")}</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">{t("landCtaSub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth?mode=signup">
              {t("landStartFree")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth?mode=login">{t("landSignIn")}</Link>
          </Button>
        </div>
      </div>
    </LandingSection>
  );
}
