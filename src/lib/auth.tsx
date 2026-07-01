import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { createUserAndOrg, currentUser, listUsers } from "@/lib/storage";
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
    if (localStorage.getItem(PROFILE_FLAG) === "1") return true;
    const users = JSON.parse(localStorage.getItem("slfv:users") || "[]");
    return Array.isArray(users) && users.length > 0;
  } catch { return false; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);

  const refreshProfile = useCallback(() => {
    setUser(currentUser() ?? listUsers()[0] ?? null);
    setEnrolled(hasProfile());
  }, []);

  useEffect(() => {
    refreshProfile();
    setLoading(false);
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, enrolled,
    enroll: async ({ name, org }) => {
      let u = currentUser() ?? listUsers()[0] ?? null;
      if (!u) {
        u = createUserAndOrg(`local-${Date.now()}@device`, "n/a", name.trim(), org.trim());
      }
      try { localStorage.setItem(PROFILE_FLAG, "1"); } catch { /* */ }
      setUser(u);
      setEnrolled(true);
    },
    signOut: () => {
      try {
        localStorage.removeItem(PROFILE_FLAG);
        localStorage.removeItem("slfv:users");
        localStorage.removeItem("slfv:orgs");
        localStorage.removeItem("slfv:session");
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
