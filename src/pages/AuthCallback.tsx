import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import fvLogo from "@/assets/fv-logo.png";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";

/**
 * Landing spot for the email confirmation link. The Supabase client exchanges
 * the code in the URL on its own (`detectSessionInUrl`), so this page only
 * waits for the session to appear.
 */
export default function AuthCallback() {
  const { enrolled } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err =
      search.get("error_description") ||
      search.get("error") ||
      hash.get("error_description") ||
      hash.get("error");
    if (err) setFailed(err);
  }, []);

  useEffect(() => {
    if (enrolled) navigate("/app", { replace: true });
  }, [enrolled, navigate]);

  useEffect(() => {
    if (failed) return;
    const timer = setTimeout(() => setFailed((f) => f ?? "timeout"), 12_000);
    return () => clearTimeout(timer);
  }, [failed]);

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm glass-card p-8 shadow-elevated text-center">
        <img src={fvLogo} alt="" className="engraved-logo w-16 h-16 object-contain mx-auto" />
        {failed ? (
          <>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
              {t("genericAuthError")}
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mt-5 mx-auto w-6 h-6 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">{t("login")}…</p>
          </>
        )}
      </div>
    </div>
  );
}
