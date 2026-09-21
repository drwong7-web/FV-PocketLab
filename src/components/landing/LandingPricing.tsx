import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_PRICES } from "@/lib/landingPrices";
import { FREE_LIMITS } from "@/lib/plan";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CenterFlickerTitle } from "./CenterFlickerTitle";
import { LandingSection } from "./LandingSection";

type Billing = "monthly" | "yearly" | "lifetime";

function fill(template: string, n: number) {
  return template.replace("{n}", String(n));
}

export function LandingPricing() {
  const { t } = useSettings();
  const [billing, setBilling] = useState<Billing>("monthly");

  const freeRows: { ok: boolean; label: string }[] = [
    { ok: true, label: fill(t("landFeatTeams"), FREE_LIMITS.maxTeams) },
    { ok: true, label: fill(t("landFeatAthletes"), FREE_LIMITS.maxAthletesPerTeam) },
    { ok: true, label: fill(t("landFeatTests"), FREE_LIMITS.maxTestsPerAthletePerMonth) },
    { ok: FREE_LIMITS.videoAnalysis, label: t("landFeatVideoOn") },
    { ok: FREE_LIMITS.pdfExport, label: t("landFeatReportsOn") },
    { ok: FREE_LIMITS.athleteImport, label: t("landFeatImportOn") },
    { ok: FREE_LIMITS.cloudSync, label: t("landFeatBackupOn") },
    { ok: false, label: t("planLimitedNote") },
  ];

  const paidRows: { ok: boolean; label: string }[] = [
    { ok: true, label: t("landFeatTeamsUnlim") },
    { ok: true, label: t("landFeatAthletesUnlim") },
    { ok: true, label: t("landFeatTestsUnlim") },
    { ok: true, label: t("landFeatVideoOn") },
    { ok: true, label: t("landFeatReportsOn") },
    { ok: true, label: t("landFeatImportOn") },
    { ok: true, label: t("landFeatBackupOn") },
    { ok: true, label: t("landFeatEarlyAccess") },
    { ok: true, label: t("planFullAccessNote") },
  ];

  const proPrice =
    billing === "monthly"
      ? LANDING_PRICES.proMonthly
      : billing === "yearly"
        ? LANDING_PRICES.proYearly
        : LANDING_PRICES.lifetime;
  const proPeriod =
    billing === "monthly" ? t("landPerMonth") : billing === "yearly" ? t("landPerYear") : t("landOnce");
  const proName =
    billing === "monthly" ? t("planProMonthly") : billing === "yearly" ? t("planProYearly") : t("planLifetime");
  const proPlan =
    billing === "monthly" ? "pro_monthly" : billing === "yearly" ? "pro_yearly" : "lifetime";

  return (
    <LandingSection id="pricing">
      <p className="section-label text-center">{t("landPriceOverline")}</p>
      <CenterFlickerTitle
        text={t("landPriceTitle")}
        className="font-display text-3xl sm:text-4xl tracking-tight text-center mt-2"
      />
      <p className="text-muted-foreground text-center mt-3 max-w-xl mx-auto">{t("landPriceSub")}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <PlanCard
          name={t("planFree")}
          price={LANDING_PRICES.free}
          period=""
          rows={freeRows}
          cta={t("landStartFree")}
        />
        <PlanCard
          name={proName}
          price={proPrice}
          period={proPeriod}
          rows={paidRows}
          cta={t("landStartPro")}
          ctaTo={`/auth?mode=signup&plan=${proPlan}`}
          featured
          exclTax
          badge={billing === "yearly" ? t("landPriceBest") : undefined}
          billing={billing}
          onBilling={setBilling}
        />
      </div>
    </LandingSection>
  );
}

function PlanCard({
  name,
  price,
  period,
  rows,
  cta,
  ctaTo = "/auth?mode=signup",
  featured,
  exclTax,
  badge,
  billing,
  onBilling,
}: {
  name: string;
  price: string;
  period: string;
  rows: { ok: boolean; label: string }[];
  cta: string;
  ctaTo?: string;
  featured?: boolean;
  exclTax?: boolean;
  badge?: string;
  billing?: Billing;
  onBilling?: (id: Billing) => void;
}) {
  const { t } = useSettings();
  return (
    <article
      className={cn(
        "glass-card p-5 sm:p-6 flex flex-col bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/40 transition-colors",
        featured && "shadow-glow"
      )}
    >
      <div className="flex items-center justify-between gap-2 min-h-6">
        <h3 className="font-display text-lg">{name}</h3>
        {badge && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
            {badge}
          </span>
        )}
      </div>
      {billing && onBilling && (
        <div className="mt-3 inline-flex flex-wrap self-start rounded-xl border border-border bg-background/40 p-1">
          {(["monthly", "yearly", "lifetime"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onBilling(id)}
              className={cn(
                "min-h-11 rounded-lg px-3 text-sm font-medium transition-colors",
                billing === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {id === "monthly"
                ? t("landPriceMonthly")
                : id === "yearly"
                  ? t("landPriceYearly")
                  : t("planLifetime")}
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 flex items-baseline gap-2 flex-wrap">
        <span className="metric-value">{price}</span>
        {period ? <span className="text-sm text-muted-foreground">{period}</span> : null}
        {exclTax ? (
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            ({t("landPriceExclTax")})
          </span>
        ) : null}
      </p>
      <ul className="mt-5 space-y-2.5 flex-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-2 text-sm">
            {row.ok ? (
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            ) : (
              <X className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            )}
            <span className={row.ok ? "text-foreground" : "text-muted-foreground"}>{row.label}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-full">
        <Link to={ctaTo}>{cta}</Link>
      </Button>
    </article>
  );
}
