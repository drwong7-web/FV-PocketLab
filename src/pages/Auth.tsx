import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const { enrolled, enroll } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");

  useEffect(() => {
    if (enrolled) navigate("/app", { replace: true });
  }, [enrolled, navigate]);

  const onEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !org.trim()) { toast.error("Nom et team requis."); return; }
    setLoading(true);
    try {
      await enroll({ name, org });
      toast.success("Profil créé.");
    } catch (err) {
      toast.error((err as Error).message);
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
            <h1 className="text-xl font-bold tracking-tight">SprintLab FV Pro</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Local-first · Privé par défaut
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Créer votre profil</span>
          </div>
          <form onSubmit={onEnroll} className="space-y-3">
            <div>
              <Label htmlFor="name">Votre nom</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Smith" required />
            </div>
            <div>
              <Label htmlFor="org">Team</Label>
              <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="FFA — Pôle Sprint" required />
            </div>
            <Button type="submit" className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon profil"}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            Stockage 100% local · Aucune inscription en ligne
          </p>
        </div>

      </div>
    </div>
  );
}
