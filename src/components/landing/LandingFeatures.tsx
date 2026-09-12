import { FileText, Shield, Smartphone, Video } from "lucide-react";
import { useSettings, type TKey } from "@/lib/settings";
import { CenterFlickerTitle } from "./CenterFlickerTitle";
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
    <LandingSection id="how">
      <p className="section-label text-center">{t("landProtoOverline")}</p>
      <CenterFlickerTitle
        text={t("landFeatTitle")}
        className="font-display text-3xl sm:text-4xl tracking-tight mt-2 flex w-full flex-wrap items-center justify-center leading-none"
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="glass-card p-5 sm:p-8 bg-gradient-to-br from-primary/10 to-transparent"
          >
            <div className="logo-well inline-flex h-24 w-24 items-center justify-center p-2">
              <Icon
                className="engraved-logo h-[85%] w-[85%] text-primary-glow"
                strokeWidth={1.15}
              />
            </div>
            <h3 className="font-display text-xl mt-4">{t(title)}</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t(body)}</p>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}
