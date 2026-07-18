import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings, type TKey } from "@/lib/settings";

type Rect = { top: number; left: number; width: number; height: number };

export function CoachMark({
  targetRef,
  titleKey,
  descKey,
  onDismiss,
}: {
  targetRef: RefObject<HTMLElement>;
  titleKey: TKey;
  descKey: TKey;
  onDismiss: () => void;
}) {
  const { t } = useSettings();
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const el = targetRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const id = window.setInterval(update, 300);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [targetRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  if (!rect) return null;

  const pad = 8;
  const highlight = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  // Position bubble below by default; if not enough space, above.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bubbleWidth = Math.min(320, vw - 24);
  const spaceBelow = vh - (rect.top + rect.height);
  const below = spaceBelow > 200;
  const bubbleTop = below ? rect.top + rect.height + 16 : Math.max(12, rect.top - 200);
  let bubbleLeft = rect.left + rect.width / 2 - bubbleWidth / 2;
  bubbleLeft = Math.max(12, Math.min(vw - bubbleWidth - 12, bubbleLeft));

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Dim overlay */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200"
        onClick={onDismiss}
      />
      {/* Highlight ring — non-blocking, target stays clickable */}
      <div
        className="absolute rounded-xl ring-4 ring-primary shadow-[0_0_32px_hsl(var(--primary)/0.65)] animate-pulse pointer-events-none"
        style={{
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          background: "hsl(var(--primary) / 0.08)",
        }}
      />
      {/* Bubble */}
      <div
        className="absolute glass-card p-4 pointer-events-auto bg-gradient-to-br from-primary/15 to-transparent border-primary/40 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ top: bubbleTop, left: bubbleLeft, width: bubbleWidth }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold tracking-tight pr-6">{t(titleKey)}</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t(descKey)}</p>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={onDismiss} className="bg-gradient-primary text-primary-foreground">
            {t("onbTourGotIt")}
          </Button>
        </div>
      </div>
    </div>
  );
}
