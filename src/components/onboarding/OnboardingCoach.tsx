import { useEffect, useLayoutEffect, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type Rect = { top: number; left: number; width: number; height: number };

type Props = {
  targetSelector?: string;
  title: string;
  description: string;
  nextLabel?: string;
  skipLabel?: string;
  onNext: () => void;
  onSkip: () => void;
  placement?: "auto" | "top" | "bottom";
  /** If no target, show as a centered modal. */
  centered?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

const PAD = 8;

export function OnboardingCoach({
  targetSelector,
  title,
  description,
  nextLabel,
  skipLabel,
  onNext,
  onSkip,
  placement = "auto",
  centered = false,
  secondaryLabel,
  onSecondary,
}: Props) {
  const { t } = useSettings();
  const [rect, setRect] = useState<Rect | null>(null);
  const [fallback, setFallback] = useState(centered);

  useLayoutEffect(() => {
    if (centered || !targetSelector) {
      setFallback(true);
      return;
    }
    let raf = 0;
    let tries = 0;
    const measure = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setFallback(false);
      } else if (tries++ < 30) {
        raf = window.requestAnimationFrame(measure);
      } else {
        setFallback(true);
      }
    };
    measure();

    const onChange = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [targetSelector, centered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const showFallback = fallback || !rect;

  // Card position
  let cardStyle: React.CSSProperties = {};
  if (!showFallback && rect) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const wantTop =
      placement === "top" ||
      (placement === "auto" && spaceBelow < 220 && spaceAbove > spaceBelow);
    const cardWidth = Math.min(340, vw - 24);
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(12, Math.min(left, vw - cardWidth - 12));
    const top = wantTop
      ? Math.max(12, rect.top - PAD - 8) // will be transformed
      : rect.top + rect.height + PAD + 8;
    cardStyle = {
      position: "fixed",
      left,
      top,
      width: cardWidth,
      transform: wantTop ? "translateY(-100%)" : undefined,
      zIndex: 60,
    };
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" role="dialog" aria-modal="true">
      {showFallback ? (
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
          onClick={onSkip}
        />
      ) : (
        <>
          {/* Dim mask via SVG cutout so the target pops */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            onClick={onSkip}
            aria-hidden
          >
            <defs>
              <mask id="onb-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect!.left - PAD}
                  y={rect!.top - PAD}
                  width={rect!.width + PAD * 2}
                  height={rect!.height + PAD * 2}
                  rx={12}
                  ry={12}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="hsl(var(--background))"
              opacity="0.72"
              mask="url(#onb-mask)"
            />
          </svg>
          {/* Ring highlight around target */}
          <div
            className="absolute pointer-events-none rounded-xl ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25),0_0_40px_hsl(var(--primary)/0.5)] animate-pulse"
            style={{
              top: rect!.top - PAD,
              left: rect!.left - PAD,
              width: rect!.width + PAD * 2,
              height: rect!.height + PAD * 2,
            }}
          />
        </>
      )}

      <div
        className={cn(
          "pointer-events-auto glass-card p-4 bg-gradient-to-br from-primary/15 to-transparent shadow-elevated border-primary/40",
          showFallback && "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(360px,calc(100vw-24px))] z-[60]"
        )}
        style={showFallback ? undefined : cardStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 p-1"
            aria-label={skipLabel ?? t("onbCoachSkip")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {skipLabel ?? t("onbCoachSkip")}
          </button>
          <div className="flex items-center gap-2">
            {secondaryLabel && onSecondary && (
              <Button variant="outline" size="sm" onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onNext}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {nextLabel ?? t("onbCoachNext")}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingCoach;
