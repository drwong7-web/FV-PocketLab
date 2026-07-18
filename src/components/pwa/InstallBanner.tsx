import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { isRefusedContext, isStandalone, onInstallStateChange } from "@/lib/pwa/install";
import InstallModal from "./InstallModal";

const SESSION_HIDE_KEY = "slfv:install-banner-hide-session";

export default function InstallBanner() {
  const { t } = useSettings();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const compute = () => {
      if (isRefusedContext() || isStandalone()) { setVisible(false); return; }
      try {
        if (sessionStorage.getItem(SESSION_HIDE_KEY) === "1") { setVisible(false); return; }
      } catch { /* */ }
      // Only show banner if the first-launch modal was already dismissed once.
      try {
        if (localStorage.getItem("slfv:install-modal-seen") !== "1") { setVisible(false); return; }
      } catch { /* */ }
      setVisible(true);
    };
    compute();
    return onInstallStateChange(compute);
  }, []);

  if (!visible) return modalOpen ? <InstallModal open={modalOpen} onClose={() => setModalOpen(false)} /> : null;

  const hideSession = () => {
    try { sessionStorage.setItem(SESSION_HIDE_KEY, "1"); } catch { /* */ }
    setVisible(false);
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20 text-sm">
        <Download className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 truncate">{t("installBanner")}</span>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          {t("installBannerCta")}
        </button>
        <button onClick={hideSession} aria-label="close" className="p-1 rounded hover:bg-primary/20">
          <X className="w-4 h-4" />
        </button>
      </div>
      {modalOpen && <InstallModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  );
}
