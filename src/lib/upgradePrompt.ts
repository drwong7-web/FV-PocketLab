import { toast } from "sonner";
import { freeLimitKey } from "@/lib/freeLimits";
import type { FreeLimitReason } from "@/lib/plan";
import type { TKey } from "@/lib/settings";

export const UPGRADE_EVENT = "pocketlab:upgrade";

export function openUpgradeSettings() {
  window.dispatchEvent(new CustomEvent(UPGRADE_EVENT));
}

export function notifyFreeLimit(t: (k: TKey) => string, reason: FreeLimitReason) {
  toast.error(t(freeLimitKey(reason)));
  openUpgradeSettings();
}
