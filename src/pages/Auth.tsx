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

export default function Auth() {
  const { enrolled, enroll } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");

  useEffect(() => {
    if (enrolled) navigate("/app", { replace: true });
  }, [enrolled, navigate]);

  const onEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !org.trim()) { toast.error(t("nameTeamRequired")); return; }
    setLoading(true);
    try {
      await enroll({ name, org });
      toast.success(t("profileCreated"));
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
          <img src={fvLogo.url} alt="FV logo" className="w-8 h-8 object-contain" />
          <div className="leading-tight">
            <h1 className="text-xl font-bold tracking-tight">Pocket Lab</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("localFirst")}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 shadow-elevated">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <span>{t("createProfile")}</span>
          </div>
          <form onSubmit={onEnroll} className="space-y-3">
            <div>
              <Label htmlFor="name">{t("yourName")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Smith" required />
            </div>
            <div>
              <Label htmlFor="org">{t("team")}</Label>
              <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="FFA — Pôle Sprint" required />
            </div>
            <Button type="submit" className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("createMyProfile")}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            {t("storageNote")}
          </p>
        </div>

      </div>
    </div>
  );
}
