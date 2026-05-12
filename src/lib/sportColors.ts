// Color mapping for the optimal F-V profile, keyed by athlete sport.
// Returns a CSS color string (HSL) used directly in chart strokes.
const SPORT_COLORS: Record<string, string> = {
  football: "hsl(140 70% 45%)",
  soccer: "hsl(140 70% 45%)",
  rugby: "hsl(20 85% 50%)",
  basketball: "hsl(28 90% 55%)",
  basket: "hsl(28 90% 55%)",
  handball: "hsl(210 80% 55%)",
  volleyball: "hsl(48 95% 55%)",
  athletics: "hsl(0 80% 55%)",
  athletisme: "hsl(0 80% 55%)",
  athlétisme: "hsl(0 80% 55%)",
  sprint: "hsl(0 80% 55%)",
  tennis: "hsl(75 70% 45%)",
  cyclisme: "hsl(190 75% 45%)",
  cycling: "hsl(190 75% 45%)",
  natation: "hsl(200 80% 55%)",
  swimming: "hsl(200 80% 55%)",
  hockey: "hsl(260 65% 60%)",
};

export function getSportOptimalColor(sport?: string | null): string {
  if (!sport) return "hsl(var(--accent))";
  const key = sport.trim().toLowerCase();
  return SPORT_COLORS[key] ?? "hsl(var(--accent))";
}
