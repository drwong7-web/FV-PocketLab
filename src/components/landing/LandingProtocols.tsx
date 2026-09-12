import { useEffect, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
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
    visual: (
      <FileText
        className="engraved-logo h-[85%] w-[85%] text-primary-glow"
        strokeWidth={1.15}
      />
    ),
  },
];

type SlideKind = "sprint" | "jump" | "report";

const SLIDES: { word: TKey; kind: SlideKind }[] = [
  { word: "landFeatWordSprint", kind: "sprint" },
  { word: "landFeatWordJump", kind: "jump" },
  { word: "landFeatWordReport", kind: "report" },
];

const HOLD_MS = 2000;

function SlideMark({ kind }: { kind: SlideKind }) {
  return (
    <span className="logo-well inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center p-1.5 shrink-0">
      {kind === "sprint" && (
        <img src={logoSprint} alt="" className="engraved-logo h-full w-full object-contain" />
      )}
      {kind === "jump" && (
        <img src={logoJump} alt="" className="engraved-logo h-full w-full object-contain" />
      )}
      {kind === "report" && (
        <FileText
          className="engraved-logo h-[85%] w-[85%] text-primary-glow"
          strokeWidth={1.15}
        />
      )}
    </span>
  );
}

function SlidePair({ kind, label }: { kind: SlideKind; label: string }) {
  return (
    <span className="inline-flex items-center gap-3">
      <SlideMark kind={kind} />
      <span>{label}</span>
    </span>
  );
}

export function LandingProtocols() {
  const { t } = useSettings();

  return (
    <LandingSection id="features">
      <p className="section-label text-center">{t("landFeatOverline")}</p>
      <RotatingTitle />
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

function RotatingTitle() {
  const { t, lang } = useSettings();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [reduce, setReduce] = useState(false);
  const labels = SLIDES.map((s) => t(s.word));
  const title = t("landProtoTitle");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setIndex(0);
    setLeaving(null);
  }, [lang]);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        setLeaving(current);
        return (current + 1) % SLIDES.length;
      });
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [reduce, lang]);

  const headingClass = "font-display text-3xl sm:text-4xl tracking-tight mt-2 capitalize text-center";

  if (reduce) {
    return <h2 className={headingClass}>{title}</h2>;
  }

  const longest = labels.reduce((a, b) => (a.length >= b.length ? a : b));
  const longestKind = SLIDES[labels.findIndex((l) => l === longest)]?.kind ?? "report";

  return (
    <h2 className={`${headingClass} min-h-14 sm:min-h-16`}>
      <span className="sr-only">{title}</span>
      <span className="relative inline-grid place-items-center [perspective:480px]">
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
          <SlidePair kind={longestKind} label={longest} />
        </span>
        {leaving !== null && (
          <span
            key={`out-${leaving}`}
            aria-hidden
            onAnimationEnd={() => setLeaving(null)}
            className="absolute inset-0 inline-flex items-center justify-center origin-center animate-landing-word-squeeze-out motion-reduce:animate-none"
          >
            <SlidePair kind={SLIDES[leaving].kind} label={labels[leaving]} />
          </span>
        )}
        <span
          key={`in-${index}`}
          aria-hidden
          className="absolute inset-0 inline-flex items-center justify-center origin-center animate-landing-word-squeeze-in motion-reduce:animate-none"
        >
          <SlidePair kind={SLIDES[index].kind} label={labels[index]} />
        </span>
      </span>
    </h2>
  );
}
