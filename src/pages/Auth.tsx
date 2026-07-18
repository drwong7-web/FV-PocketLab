import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import fvLogo from "@/assets/fv-logo.png.asset.json";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";

type Mode = "login" | "signup";

export default function Auth() {
  const { enrolled, hasAnyProfile, signUp, login } = useAuth();
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
    if (!name.trim() || !password) { toast.error(t("nameTeamRequired")); return; }
    if (password.length < 6) { toast.error(t("passwordTooShort")); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) { toast.error(t("passwordsDontMatch")); setLoading(false); return; }
        try {
          await signUp({ name, password });
          toast.success(t("profileCreated"));
        } catch (err) {
          const code = (err as Error).message;
          if (code === "NAME_EXISTS") toast.error(t("nameAlreadyExists"));
          else toast.error(code);
        }
      } else {
        try {
          await login({ name, password });
        } catch {
          toast.error(t("invalidCredentials"));
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
          <img src={fvLogo.url} alt="FV logo" className="w-32 h-32 object-contain" />
          <div className="leading-tight">
            <h1 className="text-4xl font-bold tracking-tight">Pocket Lab</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("localFirst")}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <span>{mode === "signup" ? t("signUp") : t("welcomeBack")}</span>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="name">{t("yourName")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="confirm">{t("confirmPassword")}</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
            )}
            <Button type="submit" className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "signup" ? t("createMyProfile") : t("loginBtn"))}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 underline-offset-2 hover:underline"
          >
            {mode === "signup" ? t("switchToLogin") : t("switchToSignup")}
          </button>

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            {t("storageNote")}
          </p>
        </div>

      </div>
    </div>
  );
}
