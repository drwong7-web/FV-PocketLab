import { LineChart, Shield, Video, WifiOff } from "lucide-react";
import accountSyncImage from "@/assets/landing/account-sync.png";
import aiVideoImage from "@/assets/landing/ai-video-analysis.png";
import offlineFieldImage from "@/assets/landing/offline-field.png";
import scienceBackedImage from "@/assets/landing/science-backed.png";
import { useSettings, type TKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CenterFlickerTitle } from "./CenterFlickerTitle";
import { LandingSection } from "./LandingSection";

function OfflinePhoneIcon({
  className,
  strokeWidth,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <span className={cn("relative block", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth ?? 1.15}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        aria-hidden
      >
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      </svg>
      <WifiOff
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2"
        strokeWidth={2.15}
      />
    </span>
  );
}

const FEATURES: {
  icon: typeof Video | typeof OfflinePhoneIcon;
  title: TKey;
  body: TKey;
  image: string;
  objectPosition: string;
}[] = [
  {
    icon: Video,
    title: "landFeatVideoTitle",
    body: "landFeatVideoBody",
    image: aiVideoImage,
    objectPosition: "68% center",
  },
  {
    icon: LineChart,
    title: "landFeatScienceTitle",
    body: "landFeatScienceBody",
    image: scienceBackedImage,
    objectPosition: "68% center",
  },
  {
    icon: OfflinePhoneIcon,
    title: "landFeatLocalTitle",
    body: "landFeatLocalBody",
    image: offlineFieldImage,
    objectPosition: "68% center",
  },
  {
    icon: Shield,
    title: "landFeatBackupTitle",
    body: "landFeatBackupBody",
    image: accountSyncImage,
    objectPosition: "68% center",
  },
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
        {FEATURES.map(({ icon: Icon, title, body, image, objectPosition }) => (
          <article
            key={title}
            className="glass-card relative isolate min-h-[19rem] overflow-hidden p-5 sm:p-8 hover:border-primary/40 transition-colors"
          >
            <img
              src={image}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 -z-20 h-full w-full scale-[1.02] object-cover opacity-70 rtl:-scale-x-[1.02]"
              style={{ objectPosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/90 to-background/25 rtl:bg-gradient-to-l"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-background/20"
            />

            <div className="relative z-10 max-w-[84%] sm:max-w-[70%]">
              <div className="logo-well inline-flex h-24 w-24 items-center justify-center p-2">
                <Icon
                  className="engraved-logo h-[85%] w-[85%] text-primary-glow"
                  strokeWidth={1.15}
                />
              </div>
              <h3 className="font-display text-xl mt-4">{t(title)}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t(body)}</p>
            </div>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}
