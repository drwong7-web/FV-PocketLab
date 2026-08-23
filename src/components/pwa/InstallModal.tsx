import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings";
import {
  canPromptInstall,
  getPlatform,
  isRefusedContext,
  isStandalone,
  onInstallStateChange,
  promptInstall,
} from "@/lib/pwa/install";
import { Download, Share2, Plus, Check, MoreVertical } from "lucide-react";
import fvLogo from "@/assets/fv-logo.png";

const SEEN_KEY = "slfv:install-modal-seen";
const SESSION_HIDE_KEY = "slfv:install-modal-hide-session";

interface Props {
  open?: boolean;
  onClose?: () => void;
  forced?: boolean;
}

export default function InstallModal({ open: openProp, onClose, forced }: Props) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());

  useEffect(() => onInstallStateChange(() => setCanPrompt(canPromptInstall())), []);

  useEffect(() => {
    if (openProp !== undefined) { setOpen(openProp); return; }
    if (isRefusedContext() || isStandalone()) return;
    try {
      if (sessionStorage.getItem(SESSION_HIDE_KEY) === "1") return;
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch { /* */ }
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [openProp]);

  const platform = getPlatform();

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* */ }
    try { sessionStorage.setItem(SESSION_HIDE_KEY, "1"); } catch { /* */ }
    setOpen(false);
    onClose?.();
  };

  const doInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast({ title: t("installedToast") });
      dismiss();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => forced && e.preventDefault()} onPointerDownOutside={(e) => forced && e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <img src={fvLogo} alt="" className="w-20 h-20 rounded-2xl shadow-lg mb-2" />
          <DialogTitle className="text-2xl">{t("installTitle")}</DialogTitle>
          <DialogDescription>{t("installSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {platform === "ios-safari" && (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0"><Share2 className="w-4 h-4" /></div>
                <span className="pt-1">{t("installIosStep1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0"><Plus className="w-4 h-4" /></div>
                <span className="pt-1">{t("installIosStep2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0"><Check className="w-4 h-4" /></div>
                <span className="pt-1">{t("installIosStep3")}</span>
              </li>
            </ol>
          )}

          {(platform === "android-chromium" || platform === "desktop-chromium") && (
            <div className="space-y-3">
              {canPrompt ? (
                <Button className="w-full h-12 text-base" onClick={doInstall}>
                  <Download className="w-5 h-5 mr-2" />
                  {t("installAndroidCta")}
                </Button>
              ) : (
                <ManualInstallSteps />
              )}
            </div>
          )}

          {platform === "firefox" && (
            <p className="text-sm text-muted-foreground text-center">{t("installFirefoxHint")}</p>
          )}

          {platform === "other" && <ManualInstallSteps />}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {t("installLater")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManualInstallSteps() {
  const { t } = useSettings();
  return (
    <ol className="space-y-3 text-sm">
      <li className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <span className="pt-1">{t("installManualStep1")}</span>
      </li>
      <li className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
          <MoreVertical className="w-4 h-4" />
        </div>
        <span className="pt-1">{t("installManualStep2")}</span>
      </li>
      <li className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
          <Check className="w-4 h-4" />
        </div>
        <span className="pt-1">{t("installManualStep3")}</span>
      </li>
    </ol>
  );
}
