import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingValue } from "@/components/landing/LandingValue";
import { LandingAudience } from "@/components/landing/LandingAudience";
import { LandingProtocols } from "@/components/landing/LandingProtocols";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div id="top" className="min-h-svh">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingValue />
        <LandingAudience />
        <LandingProtocols />
        <LandingFeatures />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
