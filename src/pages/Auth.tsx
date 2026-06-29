import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Fingerprint, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { hasPasskey, isPasskeySupported } from "@/lib/deviceAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const { enrolled, locked, enroll, unlockPin, unlockBiometric } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);

  // Onboarding fields
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [enablePasskey, setEnablePasskey] = useState(true);

  // Unlock field
  const [unlockPinValue, setUnlockPinValue] = useState("");

  useEffect(() => {
    isPasskeySupported().then(setBioSupported);
  }, []);

  // Auto-redirect when unlocked
  useEffect(() => {
    if (enrolled && !locked) navigate("/app", { replace: true });
  }, [enrolled, locked, navigate]);

  // Auto-trigger biometric on mount if available
  useEffect(() => {
    if (enrolled && locked && hasPasskey()) {
      (async () => {
        try {
          setLoading(true);
          await unlockBiometric();
        } catch { /* user can fall back to PIN */ }
        finally { setLoading(false); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !org.trim()) { toast.error("Nom et organisation requis."); return; }
    if (!/^\d{4,8}$/.test(pin)) { toast.error("PIN : 4 à 8 chiffres."); return; }
    if (pin !== pinConfirm) { toast.error("Les PINs ne correspondent pas."); return; }
    setLoading(true);
    try {
      await enroll({ name, org, pin, enablePasskey: enablePasskey && bioSupported });
      toast.success("Profil créé et déverrouillé.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onUnlockPin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await unlockPin(unlockPinValue);
      setUnlockPinValue("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onUnlockBio = async () => {
    setLoading(true);
    try { await unlockBiometric(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setLoading(false); }
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
          {!enrolled ? (
            <>
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Créer votre profil local</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Vos données restent sur cet appareil. Aucun compte distant. Choisissez un PIN —
                il chiffre votre clé API IA et tout secret futur.
              </p>
              <form onSubmit={onEnroll} className="space-y-3">
                <div>
                  <Label htmlFor="name">Votre nom</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Smith" required />
                </div>
                <div>
                  <Label htmlFor="org">Organisation</Label>
                  <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="FFA — Pôle Sprint" required />
                </div>
                <div>
                  <Label htmlFor="pin">PIN (4-8 chiffres)</Label>
                  <Input id="pin" type="password" inputMode="numeric" pattern="\d{4,8}" value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} required autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="pin2">Confirmer le PIN</Label>
                  <Input id="pin2" type="password" inputMode="numeric" value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))} required autoComplete="new-password" />
                </div>
                {bioSupported && (
                  <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                    <input type="checkbox" checked={enablePasskey} onChange={(e) => setEnablePasskey(e.target.checked)} className="mt-0.5" />
                    <span>Activer Face ID / Touch ID / Windows Hello pour déverrouiller plus vite.</span>
                  </label>
                )}
                <Button type="submit" className="w-full mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon profil"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                <Lock className="w-4 h-4 text-primary" />
                <span>Déverrouiller</span>
              </div>

              {hasPasskey() && (
                <Button
                  type="button"
                  onClick={onUnlockBio}
                  disabled={loading}
                  className="w-full mb-4 bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  {loading ? "Vérification…" : "Déverrouiller avec biométrie"}
                </Button>
              )}

              <form onSubmit={onUnlockPin} className="space-y-3">
                <div>
                  <Label htmlFor="upin">PIN</Label>
                  <Input
                    id="upin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,8}"
                    autoFocus={!hasPasskey()}
                    value={unlockPinValue}
                    onChange={(e) => setUnlockPinValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Déverrouiller par PIN"}
                </Button>
              </form>
            </>
          )}

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            Stockage 100% local · Chiffrement AES-GCM · WebAuthn
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Accueil</Link>
        </p>
      </div>
    </div>
  );
}
