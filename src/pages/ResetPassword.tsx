import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import fvLogo from "@/assets/fv-logo.png";
import { toast } from "sonner";
import { AuthError, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/lib/settings";

/**
 * Target of the password-reset email. Supabase turns the link into a short-lived
 * recovery session, which is what lets `updateUser` set a new password here.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasRecoverySession(Boolean(data.session));
      setChecking(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    // Give the client a moment to consume the token in the URL first.
    const timer = setTimeout(check, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("passwordsDontMatch"));
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      toast.success(t("passwordResetOk"));
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err instanceof AuthError ? t("networkError") : t("genericAuthError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-1 mb-8 justify-center">
          <img src={fvLogo} alt="FV logo" className="w-24 h-24 object-contain" />
          <h1 className="text-3xl font-bold tracking-tight">PocketLab</h1>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <p className="text-sm font-semibold mb-4">{t("chooseNewPassword")}</p>

          {checking ? (
            <Loader2 className="mx-auto w-6 h-6 animate-spin text-primary" />
          ) : hasRecoverySession ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("updatePasswordCta")}
              </Button>
            </form>
          ) : (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("resetLinkInvalid")}</p>
              <Link
                to="/auth"
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                {t("backToLogin")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
