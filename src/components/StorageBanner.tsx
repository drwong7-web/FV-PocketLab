import { useEffect, useState } from "react";
import { FolderOpen, HardDrive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FS_SUPPORTED,
  disconnectRoot,
  getRootName,
  isConnected,
  onFsChange,
  pickRoot,
  restoreRoot,
} from "@/lib/fsStorage";

/**
 * Top-of-app banner: shows the currently linked storage folder and lets
 * the user pick / change / disconnect it.
 */
export default function StorageBanner() {
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Try silently re-attaching the previously chosen folder
    void restoreRoot(true);
    return onFsChange(() => force((n) => n + 1));
  }, []);

  const connected = isConnected();
  const name = getRootName();

  const handlePick = async () => {
    setBusy(true);
    try { await pickRoot(); } finally { setBusy(false); }
  };
  const handleDisconnect = async () => {
    setBusy(true);
    try { await disconnectRoot(); } finally { setBusy(false); }
  };

  if (!FS_SUPPORTED) {
    return (
      <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground flex items-center justify-center gap-2">
        <HardDrive className="h-3.5 w-3.5" />
        <span>Stockage navigateur uniquement (votre navigateur ne permet pas d'écrire dans un dossier local).</span>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-xs flex items-center justify-center gap-2 flex-wrap">
      {connected ? (
        <>
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Données stockées dans</span>
          <span className="font-mono font-medium text-foreground">{name}/</span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={busy} onClick={handlePick}>
            Changer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1 text-[11px] text-muted-foreground"
            disabled={busy}
            onClick={handleDisconnect}
            aria-label="Déconnecter le dossier"
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Aucun dossier local connecté.</span>
          <Button
            size="sm"
            variant="default"
            className="h-6 px-2 text-[11px]"
            disabled={busy}
            onClick={handlePick}
          >
            Choisir un dossier
          </Button>
        </>
      )}
    </div>
  );
}
