import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png";
import { Fingerprint, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getDeviceUnlockBlockReason } from "@/lib/webauthn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSettings, type TKey } from "@/lib/settings";

type Mode = "login" | "signup" | "recover";

function mapUnlockError(err: unknown, t: (k: TKey) => string): string {
  const code = err instanceof Error ? err.message : String(err);
  const detail = err instanceof Error && typeof err.cause === "string" ? err.cause : undefined;
  switch (code) {
    case "CANCELLED":
      return t("deviceUnlockCancelled");
    case "LAN_HTTP":
      return t("deviceUnlockLanHttp");
    case "INSECURE_CONTEXT":
      return t("deviceUnlockInsecure");
    case "UNSUPPORTED":
    case "DUPLICATE":
      return detail ? `${t("deviceUnlockUnsupported")} (${detail})` : t("deviceUnlockUnsupported");
    case "RATE_LIMITED":
      return t("deviceUnlockRateLimited");
    case "FAILED":
      return detail ? `${t("deviceUnlockFailed")} (${detail})` : t("deviceUnlockFailed");
    case "PASSWORD_TOO_SHORT":
      return t("passwordTooShort");
    case "INVALID_CREDENTIALS":
      return t("invalidCredentials");
    default:
      return detail ? `${t("deviceUnlockFailed")} (${detail})` : t("deviceUnlockFailed");
  }
}

function deviceUnlockUnavailableHint(t: (k: TKey) => string): string {
  const reason = getDeviceUnlockBlockReason();
  if (reason === "LAN_HTTP") return t("deviceUnlockLanHttp");
  if (reason === "INSECURE_CONTEXT") return t("deviceUnlockInsecure");
  return t("deviceUnlockUnsupported");
}

export default function Auth() {
  const {
    enrolled,
    hasAnyProfile,
    signUp,
    login,
    recoverWithDeviceUnlock,
    deviceUnlockAvailable,
  } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>(hasAnyProfile ? "login" : "signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    setMode(hasAnyProfile ? "login" : "signup");
  }, [hasAnyProfile]);

  useEffect(() => {
    if (enrolled) navigate("/app", { replace: true });
  }, [enrolled, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password) {
      toast.error(t("nameTeamRequired"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) {
          toast.error(t("passwordsDontMatch"));
          return;
        }
        try {
          await signUp({ name, password });
          toast.success(t("profileCreated"));
        } catch (err) {
          const code = (err as Error).message;
          if (code === "NAME_EXISTS") toast.error(t("nameAlreadyExists"));
          else toast.error(code);
        }
      } else if (mode === "login") {
        try {
          await login({ name, password });
        } catch {
          toast.error(t("invalidCredentials"));
        }
      } else {
        if (password !== confirm) {
          toast.error(t("passwordsDontMatch"));
          return;
        }
        try {
          await recoverWithDeviceUnlock({ name, newPassword: password });
          toast.success(t("passwordResetOk"));
        } catch (err) {
          toast.error(mapUnlockError(err, t));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={fvLogo} alt="FV logo" className="w-32 h-32 object-contain" />
          <div className="leading-tight">
            <h1 className="text-4xl font-bold tracking-tight">Pocket Lab</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground whitespace-pre-line">
              {t("localFirst")}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <span>
              {mode === "signup"
                ? t("signUp")
                : mode === "recover"
                  ? t("forgotPasswordTitle")
                  : t("welcomeBack")}
            </span>
          </div>

          {mode === "recover" && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {deviceUnlockAvailable ? t("forgotPasswordHint") : deviceUnlockUnavailableHint(t)}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="name">{t("yourName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password">
                {mode === "recover" ? t("newPassword") : t("password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            {(mode === "signup" || mode === "recover") && (
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
              disabled={loading || (mode === "recover" && !deviceUnlockAvailable)}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signup" ? (
                t("createMyProfile")
              ) : mode === "recover" ? (
                <>
                  <Fingerprint className="w-4 h-4 mr-1" />
                  {t("unlockAndResetPassword")}
                </>
              ) : (
                t("loginBtn")
              )}
            </Button>
          </form>

          {mode === "login" && hasAnyProfile && (
            <button
              type="button"
              onClick={() => {
                setMode("recover");
                setPassword("");
                setConfirm("");
              }}
              className="w-full text-xs text-primary hover:underline mt-3"
            >
              {t("forgotPassword")}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : mode === "recover" ? "login" : "signup");
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
            ) : mode === "recover" ? (
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

          <p className="text-[11px] text-muted-foreground text-center mt-5">{t("storageNote")}</p>
        </div>
      </div>
    </div>
  );
}
