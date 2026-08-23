import { FileText, Shield, Smartphone, Video } from "lucide-react";
import { useSettings, type TKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { LandingSection } from "./LandingSection";

const FEATURES: { icon: typeof Video; title: TKey; body: TKey }[] = [
  { icon: Video, title: "landFeatVideoTitle", body: "landFeatVideoBody" },
  { icon: Smartphone, title: "landFeatLocalTitle", body: "landFeatLocalBody" },
  { icon: FileText, title: "landFeatReportTitle", body: "landFeatReportBody" },
  { icon: Shield, title: "landFeatBackupTitle", body: "landFeatBackupBody" },
];

export function LandingFeatures() {
  const { t } = useSettings();

  return (
    <LandingSection id="features">
      <p className="section-label">{t("landFeatOverline")}</p>
      <h2 className="font-display text-3xl sm:text-4xl tracking-tight mt-2 max-w-2xl">
        {t("landFeatTitle")}
      </h2>
      <div className="mt-10 space-y-6">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <article
            key={title}
            className={cn(
              "glass-card p-5 sm:p-8 bg-gradient-to-br from-primary/10 to-transparent grid gap-6 md:grid-cols-2 md:items-center",
              i % 2 === 1 && "md:[&>*:first-child]:order-2"
            )}
          >
            <div>
              <h3 className="font-display text-xl">{t(title)}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t(body)}</p>
            </div>
            <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-border/60 bg-background/30">
              <div className="logo-well inline-flex h-16 w-16 items-center justify-center">
                <Icon className="h-7 w-7 text-primary" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}
