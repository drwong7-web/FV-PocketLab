import type { ReactNode } from "react";
import fvLogo from "@/assets/fv-logo.png";
import logoJump from "@/assets/logo-jump-neon.png";
import logoSprint from "@/assets/logo-sprint-neon.png";
import { useSettings, type TKey } from "@/lib/settings";
import { LandingSection } from "./LandingSection";

const PROTOCOLS: { title: TKey; body: TKey; visual: ReactNode }[] = [
  {
    title: "landProtoSprintTitle",
    body: "landProtoSprintBody",
    visual: (
      <img src={logoSprint} alt="" className="engraved-logo h-full w-full object-contain" />
    ),
  },
  {
    title: "landProtoJumpTitle",
    body: "landProtoJumpBody",
    visual: <img src={logoJump} alt="" className="engraved-logo h-full w-full object-contain" />,
  },
  {
    title: "landProtoReportTitle",
    body: "landProtoReportBody",
    visual: <img src={fvLogo} alt="" className="engraved-logo h-full w-full object-contain" />,
  },
];

export function LandingProtocols() {
  const { t } = useSettings();

  return (
    <LandingSection>
      <p className="section-label">{t("landProtoOverline")}</p>
      <h2 className="font-display text-3xl sm:text-4xl tracking-tight mt-2">
        {t("landProtoTitle")}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PROTOCOLS.map(({ title, body, visual }) => (
          <article
            key={title}
            className="glass-card p-5 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors"
          >
            <div className="logo-well inline-flex h-24 w-24 items-center justify-center p-2">
              {visual}
            </div>
            <h3 className="font-display text-lg mt-4">{t(title)}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t(body)}</p>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}
