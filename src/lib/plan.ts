/**
 * Plan and entitlement model.
 *
 * The rules are duplicated here and in SQL (`public.has_full_access`) on
 * purpose: the client copy is what answers "is this user pro?" while offline,
 * the SQL copy is the one that can be trusted for anything that matters.
 * Never grant access on the client alone once money is involved.
 */

import { kvGet, kvSet, kvRemove } from "@/lib/db/kvStore";
import type { EntitlementsRow, PlanId, PlanStatus } from "@/lib/supabase/types";

const CACHE_KEY = "slfv:entitlements";

export type { PlanId, PlanStatus };

export interface Entitlements {
  plan: PlanId;
  status: PlanStatus;
  /** Full, ad-free access to every feature. */
  fullAccess: boolean;
  /** Convenience inverse of `fullAccess` — drives ad placements. */
  adsEnabled: boolean;
  /** End of the paid period for recurring Pro plans. */
  periodEnd: string | null;
  /** Set when a subscription is cancelled but still running out its period. */
  cancelAt: string | null;
  isAdmin: boolean;
}

export const FREE_ENTITLEMENTS: Entitlements = {
  plan: "free",
  status: "active",
  fullAccess: false,
  adsEnabled: true,
  periodEnd: null,
  cancelAt: null,
  isAdmin: false,
};

/**
 * Feature ceilings for the free tier. Nothing enforces these yet — wire them up
 * together with the ad placements once those are specified.
 */
export const FREE_LIMITS = {
  maxTeams: 1,
  maxAthletesPerTeam: 10,
  maxTestsPerMonth: 10,
  videoAnalysis: true,
  pdfExport: false,
  docxExport: false,
  cloudSync: false,
} as const;

/** Client mirror of the `has_full_access` SQL function. */
export function deriveFullAccess(
  plan: PlanId,
  status: PlanStatus,
  periodEnd: string | null
): boolean {
  if (plan === "lifetime") return status === "active";
  if (plan === "pro_monthly" || plan === "pro_yearly") {
    if (status !== "active" && status !== "trialing") return false;
    if (!periodEnd) return true;
    return new Date(periodEnd).getTime() > Date.now();
  }
  return false;
}

export function entitlementsFromRow(row: EntitlementsRow): Entitlements {
  const fullAccess = deriveFullAccess(row.plan, row.plan_status, row.current_period_end);
  return {
    plan: row.plan,
    status: row.plan_status,
    fullAccess,
    adsEnabled: !fullAccess,
    periodEnd: row.current_period_end,
    cancelAt: row.cancel_at,
    isAdmin: row.is_admin,
  };
}

/**
 * Entitlements are cached per user so a returning offline user keeps the access
 * they paid for. Re-derived on read so an expired period downgrades correctly
 * even with no network.
 */
export function cacheEntitlements(userId: string, e: Entitlements) {
  kvSet(CACHE_KEY, { userId, ...e });
}

export function readCachedEntitlements(userId: string): Entitlements | null {
  const raw = kvGet<Entitlements & { userId: string }>(CACHE_KEY);
  if (!raw || raw.userId !== userId) return null;
  const fullAccess = deriveFullAccess(raw.plan, raw.status, raw.periodEnd);
  return { ...raw, fullAccess, adsEnabled: !fullAccess };
}

export function clearCachedEntitlements() {
  kvRemove(CACHE_KEY);
}
