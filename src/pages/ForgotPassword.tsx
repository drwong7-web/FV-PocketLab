import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
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
            <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              We'll email you a secure link
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <MailCheck className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="text-foreground">{email}</span>, you'll receive a reset link shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          <Link to="/auth" className="inline-flex items-center hover:text-foreground">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
