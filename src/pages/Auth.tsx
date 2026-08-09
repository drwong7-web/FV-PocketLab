import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png";
import { Loader2, WifiOff } from "lucide-react";
import { AuthError, useAuth, type AuthErrorCode } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSettings, type TKey } from "@/lib/settings";

type Mode = "login" | "signup" | "forgot";

const ERROR_COPY: Record<AuthErrorCode, TKey> = {
  EMAIL_EXISTS: "emailExists",
  INVALID_CREDENTIALS: "invalidCredentials",
  EMAIL_NOT_CONFIRMED: "emailNotConfirmed",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PASSWORDS_DONT_MATCH: "passwordsDontMatch",
  OFFLINE_SIGNUP: "offlineSignupBlocked",
  OFFLINE_NO_CREDENTIAL: "offlineNoCredential",
  OFFLINE_RESET: "offlineResetBlocked",
  NOT_CONFIGURED: "notConfiguredError",
  NETWORK: "networkError",
  UNKNOWN: "genericAuthError",
};

export default function Auth() {
  const { enrolled, hasAnyProfile, signUp, signIn, sendPasswordReset } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>(hasAnyProfile ? "login" : "signup");
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    setMode(hasAnyProfile ? "login" : "signup");
  }, [hasAnyProfile]);

  useEffect(() => {
    if (enrolled) navigate("/app", { replace: true });
  }, [enrolled, navigate]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const fail = (err: unknown) => {
    if (err instanceof AuthError) toast.error(t(ERROR_COPY[err.code]));
    else toast.error(t("genericAuthError"));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (mode === "forgot") {
      if (!email.trim()) {
        toast.error(t("emailRequired"));
        return;
      }
      setLoading(true);
      try {
        await sendPasswordReset(email);
        toast.success(t("resetEmailSent"));
        setMode("login");
      } catch (err) {
        fail(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      toast.error(t("emailRequired"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    if (mode === "signup" && password !== confirm) {
      toast.error(t("passwordsDontMatch"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUp({ email, password, name });
        if (needsEmailConfirmation) {
          toast.success(t("confirmEmailSent"));
          setMode("login");
          setPassword("");
          setConfirm("");
        } else {
          toast.success(t("profileCreated"));
        }
      } else {
        await signIn({ email, password });
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "signup" ? t("signUp") : mode === "forgot" ? t("forgotPasswordTitle") : t("welcomeBack");

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-1 mb-8 justify-center">
          <img src={fvLogo} alt="FV logo" className="w-32 h-32 object-contain" />
          <div className="leading-tight">
            <h1 className="text-4xl font-bold tracking-tight">PocketLab</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground whitespace-pre-line">
              {t("localFirst")}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-sm font-semibold">{title}</span>
            {!online && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                <WifiOff className="w-3 h-3" />
                {t("offlineBadge")}
              </span>
            )}
          </div>

          {mode === "forgot" && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t("resetEmailHint")}</p>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">{t("yourName")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">{t("authEmail")}</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
            )}

            {mode === "signup" && (
              <div>
                <Label htmlFor="confirm">{t("confirmPassword")}</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signup" ? (
                t("createMyProfile")
              ) : mode === "forgot" ? (
                t("sendResetLink")
              ) : (
                t("loginBtn")
              )}
            </Button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="w-full text-xs text-primary hover:underline mt-3"
            >
              {t("forgotPassword")}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup");
              setPassword("");
              setConfirm("");
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-4"
          >
            {mode === "signup" ? (
              <>
                {t("alreadyHaveProfile")}{" "}
                <span className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
                  {t("logInLink")}
                </span>
              </>
            ) : mode === "forgot" ? (
              <span className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
                {t("backToLogin")}
              </span>
            ) : (
              <>
                {t("noProfilePrompt")}{" "}
                <span className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
                  {t("signUpLink")}
                </span>
              </>
            )}
          </button>

          {!online && mode !== "forgot" && (
            <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
              {mode === "signup" ? t("offlineSignupBlocked") : t("offlineSignedIn")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
