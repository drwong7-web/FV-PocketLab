import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate("/app");
      } else {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (!name.trim() || !org.trim()) throw new Error("Name and organization are required.");
        await signUp(email, password, name.trim(), org.trim());
        toast.success("Account created. Check your inbox to verify your email, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const onOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithApple();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <h1 className="text-xl font-bold tracking-tight">SprintLab FV Pro</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Sprint · Force-Velocity · Sport Science
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-5">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
                  mode === m ? "bg-background shadow-card text-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium"
              onClick={() => onOAuth("google")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue with Google"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium"
              onClick={() => onOAuth("apple")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue with Apple"}
            </Button>
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Smith" required />
                </div>
                <div>
                  <Label htmlFor="org">Organization</Label>
                  <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="National Athletics Federation" required />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>

            <Button type="submit" className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            Secured by Lovable Cloud
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
