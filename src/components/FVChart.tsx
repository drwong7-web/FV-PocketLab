interface FVChartProps {
  points: { force: number; velocity: number; load?: number }[];
  F0: number;
  V0: number;
  /** Theoretical optimal F0 (N/kg). */
  optimalF0?: number;
  /** Theoretical optimal V0 (m/s). */
  optimalV0?: number;
  /** Sport-specific reference target (Jiménez-Reyes). */
  targetF0?: number;
  targetV0?: number;
  targetF0Range?: number;
  targetV0Range?: number;
  targetLabel?: string;
  /** Pmax in W/kg used to draw the iso-power hyperbola. */
  Pmax?: number;
  forceLabel?: string;
}

const CHART_W = 380;
const CHART_H = 320;
const PAD_TOP = 18;
const PAD_RIGHT = 18;
const PAD_BOTTOM = 90;
const PAD_LEFT = 56;
const INNER_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const INNER_H = CHART_H - PAD_TOP - PAD_BOTTOM;

function fmt(value: number) {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function buildLinePath(
  series: Array<{ velocity: number; force: number }>,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) {
  return series
    .map((point, index) => `${index === 0 ? "M" : "L"}${xScale(point.velocity).toFixed(2)},${yScale(point.force).toFixed(2)}`)
    .join(" ");
}

export function FVChart({
  points,
  F0,
  V0,
  optimalF0,
  optimalV0,
  targetF0,
  targetV0,
  targetF0Range = 0,
  targetV0Range = 0,
  targetLabel,
  Pmax,
  forceLabel = "Force (N/kg)",
}: FVChartProps) {
  const currentColor = "hsl(var(--primary))";
  const pointColor = "hsl(var(--primary))";
  const axisColor = "hsl(var(--muted-foreground))";
  const gridColor = "hsl(var(--border))";
  const optimalStroke = "hsl(var(--destructive))";
  const targetStroke = "hsl(var(--accent))";
  const isoColor = "hsl(var(--muted-foreground))";

  const measuredMaxV = points.reduce((m, p) => Math.max(m, p.velocity), 0);
  const measuredMaxF = points.reduce((m, p) => Math.max(m, p.force), 0);
  const safeV0 = Number.isFinite(V0) && V0 > 0 ? V0 : measuredMaxV || 1;
  const safeF0 = Number.isFinite(F0) && F0 > 0 ? F0 : measuredMaxF || 1;
  const optV = Number.isFinite(optimalV0) && (optimalV0 ?? 0) > 0 ? (optimalV0 as number) : undefined;
  const optF = Number.isFinite(optimalF0) && (optimalF0 ?? 0) > 0 ? (optimalF0 as number) : undefined;
  const hasOptimal = optV !== undefined && optF !== undefined;
  const hasTarget = targetF0 !== undefined && targetV0 !== undefined && targetF0 > 0 && targetV0 > 0;

  const maxV = Math.max(safeV0, optV ?? 0, targetV0 ?? 0, measuredMaxV, 1) * 1.12;
  const maxF = Math.max(safeF0, optF ?? 0, targetF0 ?? 0, measuredMaxF, 1) * 1.12;

  const xScale = (value: number) => PAD_LEFT + (value / maxV) * INNER_W;
  const yScale = (value: number) => PAD_TOP + INNER_H - (value / maxF) * INNER_H;

  const currentSeries = [
    { velocity: 0, force: safeF0 },
    { velocity: safeV0, force: 0 },
  ];

  const optimalSeries = hasOptimal
    ? [
        { velocity: 0, force: optF as number },
        { velocity: optV as number, force: 0 },
      ]
    : [];

  // Iso-power hyperbola F = Pmax / V across the visible velocity range.
  const isoSeries: Array<{ velocity: number; force: number }> = [];
  if (Pmax && Pmax > 0) {
    const steps = 60;
    const vMin = maxV * 0.05;
    for (let i = 0; i <= steps; i++) {
      const v = vMin + ((maxV - vMin) * i) / steps;
      const f = Pmax / v;
      if (f <= maxF * 1.05) isoSeries.push({ velocity: v, force: f });
    }
  }

  const xTicks = Array.from({ length: 5 }, (_, i) => (maxV / 4) * i);
  const yTicks = Array.from({ length: 5 }, (_, i) => (maxF / 4) * i);

  // Target zone rectangle around (targetV0, targetF0).
  const targetRect = hasTarget
    ? {
        x: xScale(Math.max(0, (targetV0 as number) - targetV0Range)),
        x2: xScale((targetV0 as number) + targetV0Range),
        y: yScale((targetF0 as number) + targetF0Range),
        y2: yScale(Math.max(0, (targetF0 as number) - targetF0Range)),
      }
    : null;

  return (
    <div>
      <div className="w-full overflow-hidden rounded-md border border-border bg-card p-2">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width={CHART_W}
          height={CHART_H}
          className="block h-auto w-full"
          role="img"
          aria-label="Graphique force-vitesse"
        >
          <rect x="0" y="0" width={CHART_W} height={CHART_H} fill="hsl(var(--card))" />

          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={PAD_LEFT} y1={yScale(tick)} x2={CHART_W - PAD_RIGHT} y2={yScale(tick)}
                stroke={gridColor} strokeWidth="1" strokeDasharray="3 3" />
              <text x={PAD_LEFT - 8} y={yScale(tick) + 4} textAnchor="end" fontSize="10" fill={axisColor}>
                {fmt(tick)}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={xScale(tick)} y1={PAD_TOP} x2={xScale(tick)} y2={PAD_TOP + INNER_H}
                stroke={gridColor} strokeWidth="1" strokeDasharray="3 3" />
              <text x={xScale(tick)} y={CHART_H - PAD_BOTTOM + INNER_H + 14 - INNER_H + 2}
                textAnchor="middle" fontSize="10" fill={axisColor}>
                {fmt(tick)}
              </text>
            </g>
          ))}

          {/* Target zone (sport reference) */}
          {targetRect && (
            <rect
              x={targetRect.x}
              y={targetRect.y}
              width={Math.max(0, targetRect.x2 - targetRect.x)}
              height={Math.max(0, targetRect.y2 - targetRect.y)}
              fill={targetStroke}
              fillOpacity="0.12"
              stroke={targetStroke}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Iso-power hyperbola */}
          {isoSeries.length > 1 && (
            <path d={buildLinePath(isoSeries, xScale, yScale)} fill="none"
              stroke={isoColor} strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
          )}

          <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + INNER_H} stroke={axisColor} strokeWidth="1.25" />
          <line x1={PAD_LEFT} y1={PAD_TOP + INNER_H} x2={CHART_W - PAD_RIGHT} y2={PAD_TOP + INNER_H} stroke={axisColor} strokeWidth="1.25" />

          {/* Current profile */}
          <path d={buildLinePath(currentSeries, xScale, yScale)} fill="none"
            stroke={currentColor} strokeWidth="2.5" strokeLinecap="round" />

          {/* F0 and V0 annotations */}
          <circle cx={xScale(0)} cy={yScale(safeF0)} r="3" fill={currentColor} />
          <text x={xScale(0) + 6} y={yScale(safeF0) - 4} fontSize="9" fill={currentColor}>
            F0 {safeF0.toFixed(1)}
          </text>
          <circle cx={xScale(safeV0)} cy={yScale(0)} r="3" fill={currentColor} />
          <text x={xScale(safeV0) - 4} y={yScale(0) - 6} fontSize="9" textAnchor="end" fill={currentColor}>
            V0 {safeV0.toFixed(2)}
          </text>

          {/* Measured points */}
          {points.map((point, index) => (
            <circle key={`${point.velocity}-${point.force}-${index}`}
              cx={xScale(point.velocity)} cy={yScale(point.force)} r="3.5" fill={pointColor} />
          ))}

          {/* Optimal profile (red dashed) */}
          {hasOptimal && (
            <>
              <path d={buildLinePath(optimalSeries, xScale, yScale)} fill="none"
                stroke={optimalStroke} strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
              <circle cx={xScale(optV as number)} cy={yScale(0)} r="2.5" fill={optimalStroke} />
            </>
          )}

          {/* Sport target marker */}
          {hasTarget && (
            <circle cx={xScale(targetV0 as number)} cy={yScale(targetF0 as number)}
              r="4" fill="none" stroke={targetStroke} strokeWidth="1.5" />
          )}

          {/* Legend */}
          <g transform={`translate(${PAD_LEFT}, ${CHART_H - 14})`}>
            <line x1="0" y1="0" x2="18" y2="0" stroke={currentColor} strokeWidth="2.5" />
            <text x="22" y="3" fontSize="10" fill={axisColor}>Profil mesuré</text>

            {hasOptimal && (
              <g transform="translate(110, 0)">
                <line x1="0" y1="0" x2="18" y2="0" stroke={optimalStroke} strokeWidth="2.5" strokeDasharray="6 4" />
                <text x="22" y="3" fontSize="10" fill={axisColor}>Optimal</text>
              </g>
            )}

            {hasTarget && (
              <g transform="translate(0, 14)">
                <rect x="0" y="-5" width="18" height="10" fill={targetStroke} fillOpacity="0.18"
                  stroke={targetStroke} strokeDasharray="3 3" />
                <text x="22" y="3" fontSize="10" fill={axisColor}>
                  Cible{targetLabel ? ` · ${targetLabel}` : ""}
                </text>
              </g>
            )}

            {Pmax && Pmax > 0 && (
              <g transform={`translate(${hasOptimal ? 180 : 110}, 0)`}>
                <line x1="0" y1="0" x2="18" y2="0" stroke={isoColor} strokeDasharray="2 4" />
                <text x="22" y="3" fontSize="10" fill={axisColor}>iso-Pmax</text>
              </g>
            )}
          </g>

          <text x={CHART_W / 2} y={CHART_H - 56} textAnchor="middle" fontSize="11" fill={axisColor}>
            Vitesse (m/s)
          </text>

          <text x="14" y={CHART_H / 2} transform={`rotate(-90 14 ${CHART_H / 2})`}
            textAnchor="middle" fontSize="11" fill={axisColor}>
            {forceLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}
