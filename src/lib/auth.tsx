import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { createUserAndOrg, currentUser, listUsers } from "@/lib/storage";
import { kvGet, kvSet, kvRemove, useKvReady } from "@/lib/db/kvStore";
import type { User } from "@/lib/types";

const PROFILE_FLAG = "slfv:profile-ready";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** True quand un profil local existe déjà. */
  enrolled: boolean;
  /** Onboarding local (nom + team). */
  enroll: (opts: { name: string; org: string }) => Promise<void>;
  /** Efface le profil local. */
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hasProfile(): boolean {
  try {
    if (kvGet<string>(PROFILE_FLAG) === "1") return true;
    const users = kvGet<unknown[]>("slfv:users") || [];
    return Array.isArray(users) && users.length > 0;
  } catch { return false; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const kvReady = useKvReady();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);

  const refreshProfile = useCallback(() => {
    setUser(currentUser() ?? listUsers()[0] ?? null);
    setEnrolled(hasProfile());
  }, []);

  useEffect(() => {
    if (!kvReady) return;
    refreshProfile();
    setLoading(false);
  }, [kvReady, refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, enrolled,
    enroll: async ({ name, org }) => {
      let u = currentUser() ?? listUsers()[0] ?? null;
      if (!u) {
        u = createUserAndOrg(`local-${Date.now()}@device`, "n/a", name.trim(), org.trim());
      }
      try { kvSet(PROFILE_FLAG, "1"); } catch { /* */ }
      setUser(u);
      setEnrolled(true);
    },
    signOut: () => {
      // Ne PAS supprimer slfv:users / slfv:orgs : les données (équipes, athlètes, tests)
      // sont liées à user_id / organization_id. Effacer ces clés orphelinerait tout.
      try {
        kvRemove(PROFILE_FLAG);
        kvRemove("slfv:session");
      } catch { /* */ }
      setUser(null);
      setEnrolled(false);
    },
  }), [user, loading, enrolled]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
