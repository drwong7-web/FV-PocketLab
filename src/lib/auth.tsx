import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { createUserAndOrg, currentUser, listUsers, authenticate } from "@/lib/storage";
import { kvGet, kvSet, kvRemove, useKvReady } from "@/lib/db/kvStore";
import type { User } from "@/lib/types";

const PROFILE_FLAG = "slfv:profile-ready";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** True quand une session locale valide est active. */
  enrolled: boolean;
  /** True s'il existe au moins un profil local (pour choisir login vs signup par défaut). */
  hasAnyProfile: boolean;
  /** Créer un nouveau profil local. */
  signUp: (opts: { name: string; password: string }) => Promise<void>;
  /** Se connecter à un profil existant. */
  login: (opts: { name: string; password: string }) => Promise<void>;
  /** Ferme la session (les données restent). */
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "user"}@local`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const kvReady = useKvReady();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [hasAnyProfile, setHasAnyProfile] = useState(false);

  const refreshProfile = useCallback(() => {
    const sessUser = currentUser();
    const flag = kvGet<string>(PROFILE_FLAG) === "1";
    setUser(sessUser);
    setEnrolled(!!sessUser && flag);
    setHasAnyProfile((listUsers() || []).length > 0);
  }, []);

  useEffect(() => {
    if (!kvReady) return;
    refreshProfile();
    setLoading(false);
  }, [kvReady, refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, enrolled, hasAnyProfile,
    signUp: async ({ name, password }) => {
      const email = nameToEmail(name);
      const existing = listUsers().find((u) => u.email.toLowerCase() === email);
      if (existing) throw new Error("NAME_EXISTS");
      const u = createUserAndOrg(email, password, name.trim(), name.trim());
      // authenticate to set session
      authenticate(email, password);
      kvSet(PROFILE_FLAG, "1");
      setUser(u);
      setEnrolled(true);
      setHasAnyProfile(true);
    },
    login: async ({ name, password }) => {
      const email = nameToEmail(name);
      let u: User;
      try {
        u = authenticate(email, password);
      } catch {
        throw new Error("INVALID_CREDENTIALS");
      }
      kvSet(PROFILE_FLAG, "1");
      setUser(u);
      setEnrolled(true);
    },
    signOut: () => {
      try {
        kvRemove(PROFILE_FLAG);
        kvRemove("slfv:session");
      } catch { /* */ }
      setUser(null);
      setEnrolled(false);
    },
  }), [user, loading, enrolled, hasAnyProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
