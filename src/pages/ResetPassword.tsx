import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Give Supabase a moment to parse the recovery hash and create a session
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success("Password updated");
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
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
            <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Choose something strong
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          {checking ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-3 py-4">
              <h2 className="font-semibold">Link invalid or expired</h2>
              <p className="text-sm text-muted-foreground">
                Please request a new password reset email.
              </p>
              <Link to="/forgot-password">
                <Button className="bg-gradient-primary text-primary-foreground font-semibold mt-2">
                  Request new link
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="pw">New password</Label>
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="pw2">Confirm password</Label>
                <Input
                  id="pw2"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
