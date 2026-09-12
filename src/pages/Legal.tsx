import { Link } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { useSettings, type TKey } from "@/lib/settings";

export type LegalKind = "privacy" | "terms" | "contact";

const COPY: Record<LegalKind, { title: TKey; body: TKey[] }> = {
  privacy: {
    title: "landFooterPrivacy",
    body: ["landPrivacyP1", "landPrivacyP2", "landPrivacyP3", "landPrivacyP4", "landPrivacyP5"],
  },
  terms: {
    title: "landFooterTerms",
    body: ["landTermsP1", "landTermsP2", "landTermsP3", "landTermsP4", "landTermsP5"],
  },
  contact: {
    title: "landFooterContact",
    body: ["landContactP1"],
  },
};

export default function Legal({ kind }: { kind: LegalKind }) {
  const { t } = useSettings();
  const doc = COPY[kind];
  const email = t("landContactEmail");

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-2 shrink-0">
            <img src={fvLogo} alt="" className="engraved-logo h-8 w-8 object-contain" />
            <span className="font-display text-sm tracking-tight">PocketLab</span>
          </Link>
          <Link
            to="/"
            className="ms-auto min-h-11 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            {t("landLegalHome")}
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12">
        <article className="glass-card p-6 sm:p-10 bg-gradient-to-br from-primary/10 to-transparent">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">{t(doc.title)}</h1>
          <div className="mt-6 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {doc.body.map((key) => (
              <p key={key}>{t(key)}</p>
            ))}
          </div>
          {kind === "contact" && (
            <div className="mt-8">
              <p className="text-sm font-medium text-foreground">{email}</p>
              <Button asChild className="mt-4">
                <a href={`mailto:${email}`}>{t("landContactCta")}</a>
              </Button>
            </div>
          )}
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
