import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: "primary" | "accent" | "success" | "warning" | "destructive";
  icon?: ReactNode;
  className?: string;
}

const accentStyles: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  primary: "from-primary/20 to-primary/5 border-primary/30",
  accent: "from-accent/20 to-accent/5 border-accent/30",
  success: "from-success/20 to-success/5 border-success/30",
  warning: "from-warning/20 to-warning/5 border-warning/30",
  destructive: "from-destructive/20 to-destructive/5 border-destructive/30",
};

export function MetricCard({ label, value, unit, hint, accent = "primary", icon, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "engraved-surface relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4",
        accentStyles[accent],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="engraved text-[11px] font-semibold uppercase tracking-widest">
          {label}
        </span>
        {icon && <div className="engraved opacity-70">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="engraved metric-value">{value}</span>
        {unit && <span className="engraved text-sm font-medium">{unit}</span>}
      </div>
      {hint && <div className="engraved mt-1 text-xs">{hint}</div>}
    </div>
  );
}
