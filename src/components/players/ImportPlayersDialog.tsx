import { useState, ChangeEvent } from "react";
import { Upload, Loader2, Trash2 } from "lucide-react";
import { createPlayer } from "@/lib/storage";
import { canImportAthletes, remainingAthleteSlots } from "@/lib/freeLimits";
import { isFreeLimitError } from "@/lib/plan";
import { notifyFreeLimit } from "@/lib/upgradePrompt";
import { AthleteImportError, parseAthletesFile } from "@/lib/import/athletes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";

interface ParsedAthlete {
  firstName: string;
  lastName: string;
  mass?: number;
  height?: number;
  birthDate?: string;
}

interface Row extends ParsedAthlete {
  selected: boolean;
}

interface Props {
  teamId: string;
  organizationId: string;
  onImported: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp";

export default function ImportPlayersDialog({ teamId, organizationId, onImported }: Props) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const slots = remainingAthleteSlots(teamId);

  const reset = () => { setRows([]); setLoading(false); };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!canImportAthletes()) {
      notifyFreeLimit(t, "import");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (max 10 MB).");
      return;
    }
    setLoading(true);
    setRows([]);
    try {
      const athletes = await parseAthletesFile(file);
      if (athletes.length === 0) {
        toast.error("Aucun athlète détecté dans ce fichier.");
        setLoading(false);
        return;
      }
      setRows(athletes.map((a) => ({ ...a, selected: true })));
      toast.success(`${athletes.length} athlète(s) détecté(s)`);
    } catch (err) {
      if (err instanceof AthleteImportError) toast.error(err.message);
      else toast.error("Échec de l'analyse : " + ((err as Error)?.message ?? "Erreur"));
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const confirm = () => {
    if (!canImportAthletes()) {
      notifyFreeLimit(t, "import");
      return;
    }
    const toCreate = rows.filter((r) => r.selected && r.firstName.trim() && r.lastName.trim());
    if (toCreate.length === 0) {
      toast.error("Aucun athlète sélectionné.");
      return;
    }
    let n = 0;
    let skipped = 0;
    let blocked = false;
    for (const r of toCreate) {
      if (remainingAthleteSlots(teamId) <= 0) {
        skipped += toCreate.length - n;
        blocked = true;
        break;
      }
      try {
        createPlayer({
          teamId,
          organizationId,
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim(),
          mass: r.mass && r.mass > 0 ? r.mass : 75,
          height: r.height && r.height > 0 ? r.height : undefined,
          birthDate: r.birthDate?.trim() || undefined,
        });
        n++;
      } catch (err) {
        if (isFreeLimitError(err)) {
          skipped += toCreate.length - n;
          blocked = true;
          break;
        }
        throw err;
      }
    }
    if (n > 0) toast.success(`${n} athlète(s) ajouté(s)`);
    if (blocked || skipped > 0) notifyFreeLimit(t, "athlete");
    if (n === 0 && skipped === 0) return;
    setOpen(false);
    reset();
    onImported();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v && !canImportAthletes()) {
          notifyFreeLimit(t, "import");
          return;
        }
        if (v && remainingAthleteSlots(teamId) <= 0) {
          notifyFreeLimit(t, "athlete");
          return;
        }
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          disabled={canImportAthletes() && slots <= 0}
          className="bg-gradient-primary text-primary-foreground font-semibold"
        >
          <Upload className="w-4 h-4 mr-1" /> Importer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer une liste d'athlètes</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Déposez un fichier <strong>PDF</strong>, <strong>Word</strong> (.docx) ou une <strong>image</strong> (PNG/JPG)
              contenant la liste des athlètes. L'IA extrait automatiquement les noms et caractéristiques.
            </p>
            <label className="block">
              <div className="glass-card p-8 text-center cursor-pointer hover:border-primary transition-colors border-2 border-dashed border-border">
                {loading ? (
                  <>
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                    <p className="mt-3 text-sm text-muted-foreground">Analyse en cours…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">Cliquer pour choisir un fichier</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PNG, JPG · max 10 MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={handleFile}
                disabled={loading}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              {rows.length} athlète(s) détecté(s). Vérifiez puis confirmez.
            </p>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="glass-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={r.selected}
                      onCheckedChange={(c) => updateRow(i, { selected: !!c })}
                    />
                    <Input
                      value={r.firstName}
                      onChange={(e) => updateRow(i, { firstName: e.target.value })}
                      placeholder="Prénom"
                      className="h-8"
                    />
                    <Input
                      value={r.lastName}
                      onChange={(e) => updateRow(i, { lastName: e.target.value })}
                      placeholder="Nom"
                      className="h-8"
                    />
                    <button
                      onClick={() => removeRow(i)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-8">
                    <div>
                      <Label className="text-xs">Masse (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.mass ?? ""}
                        onChange={(e) => updateRow(i, { mass: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="75"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Taille (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.height ?? ""}
                        onChange={(e) => updateRow(i, { height: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                Recommencer
              </Button>
              <Button
                onClick={confirm}
                className="flex-1 bg-gradient-primary text-primary-foreground font-semibold"
              >
                Créer {rows.filter((r) => r.selected).length} athlète(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
