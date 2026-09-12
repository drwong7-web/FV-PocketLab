import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type Kind = "force" | "velocity";

export function HeroFVProfiles() {
  const { t } = useSettings();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Panel
        kind="force"
        className="hidden sm:block"
        title={t("landHeroFvForceTitle")}
        forceLabel={t("forceNkg")}
        velocityLabel={t("velocityMs")}
        athlete={t("landHeroFvAthlete")}
        optimal={t("landHeroFvOptimal")}
      />
      <Panel
        kind="velocity"
        title={t("landHeroFvSpeedTitle")}
        forceLabel={t("forceNkg")}
        velocityLabel={t("velocityMs")}
        athlete={t("landHeroFvAthlete")}
        optimal={t("landHeroFvOptimal")}
      />
    </div>
  );
}

function Panel({
  kind,
  title,
  forceLabel,
  velocityLabel,
  athlete,
  optimal,
  className,
}: {
  kind: Kind;
  title: string;
  forceLabel: string;
  velocityLabel: string;
  athlete: string;
  optimal: string;
  className?: string;
}) {
  const athleteStroke = "hsl(var(--foreground))";
  const optimalStroke = "hsl(var(--primary))";
  const axis = "hsl(var(--muted-foreground))";

  const athleteLine =
    kind === "force" ? "M40,108 L248,152" : "M40,48 L178,152";
  const optimalLine =
    kind === "force" ? "M40,42 L188,152" : "M40,58 L252,152";

  return (
    <div className={cn("logo-well p-3", className)}>
      <p className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-foreground leading-tight">
        {title}
      </p>
      <svg
        viewBox="0 0 280 188"
        className="engraved-logo mt-3 block h-auto w-full"
        role="img"
        aria-label={title}
      >
        <line x1="40" y1="24" x2="40" y2="152" stroke={axis} strokeWidth="1.4" />
        <line x1="40" y1="152" x2="260" y2="152" stroke={axis} strokeWidth="1.4" />
        <polygon points="40,18 36,26 44,26" fill={axis} />
        <polygon points="266,152 258,148 258,156" fill={axis} />

        <text
          x="14"
          y="92"
          fill={axis}
          fontSize="9"
          textAnchor="middle"
          transform="rotate(-90 14 92)"
        >
          {forceLabel}
        </text>
        <text x="150" y="178" fill={axis} fontSize="9" textAnchor="middle">
          {velocityLabel}
        </text>

        <path d={optimalLine} fill="none" stroke={optimalStroke} strokeWidth="2" strokeDasharray="6 4" />
        <path d={athleteLine} fill="none" stroke={athleteStroke} strokeWidth="2.2" />

        {kind === "force" ? (
          <g fill={optimalStroke} stroke={optimalStroke}>
            <ArrowUp x={52} y={92} />
            <ArrowUp x={64} y={86} />
            <ArrowUp x={76} y={80} />
          </g>
        ) : (
          <g fill={optimalStroke} stroke={optimalStroke}>
            <ArrowRight x={186} y={142} />
            <ArrowRight x={202} y={136} />
            <ArrowRight x={218} y={130} />
          </g>
        )}
      </svg>
      <ul className="mt-2 space-y-1 text-[10px] leading-snug text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="h-px w-5 shrink-0 bg-foreground" />
          {athlete}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-px w-5 shrink-0 border-t border-dashed border-primary" />
          {optimal}
        </li>
      </ul>
    </div>
  );
}

function ArrowUp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1="10" x2="0" y2="-2" strokeWidth="1.6" />
      <polygon points="0,-8 -3.2,-1 3.2,-1" />
    </g>
  );
}

function ArrowRight({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="-8" y1="0" x2="4" y2="0" strokeWidth="1.6" />
      <polygon points="10,0 3,-3.2 3,3.2" />
    </g>
  );
}
