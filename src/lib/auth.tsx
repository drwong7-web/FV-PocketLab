import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  createUserAndOrg,
  currentUser,
  listUsers,
  authenticate,
  signOut as clearLocalSession,
  setUserWebAuthnCredential,
  resetPasswordForUser,
  findUserByName,
} from "@/lib/storage";
import { kvGet, kvSet, kvRemove, kvFlush, useKvReady } from "@/lib/db/kvStore";
import {
  isPlatformAuthAvailable,
  proveDeviceOwnership,
  WebAuthnError,
} from "@/lib/webauthn";
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
  /**
   * Prove device ownership via OS unlock, then set a new password.
   * No prior enroll required. On failure the user stays signed out.
   */
  recoverWithDeviceUnlock: (opts: {
    name: string;
    newPassword: string;
  }) => Promise<void>;
  /** Whether platform WebAuthn is usable in this context. */
  deviceUnlockAvailable: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "user"}@local`;
}

function rethrowWebAuthn(err: unknown): never {
  if (err instanceof WebAuthnError) {
    const e = new Error(err.code);
    if (err.message && err.message !== err.code) e.cause = err.message;
    throw e;
  }
  throw err;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const kvReady = useKvReady();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [hasAnyProfile, setHasAnyProfile] = useState(false);
  const [deviceUnlockAvailable, setDeviceUnlockAvailable] = useState(false);

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

  useEffect(() => {
    setDeviceUnlockAvailable(isPlatformAuthAvailable());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    enrolled,
    hasAnyProfile,
    deviceUnlockAvailable,
    signUp: async ({ name, password }) => {
      const email = nameToEmail(name);
      const existing = listUsers().find((u) => u.email.toLowerCase() === email);
      if (existing) throw new Error("NAME_EXISTS");
      const u = createUserAndOrg(email, password, name.trim(), name.trim());
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
        clearLocalSession();
        kvRemove(PROFILE_FLAG);
      } catch { /* */ }
      setUser(null);
      setEnrolled(false);
    },
    recoverWithDeviceUnlock: async ({ name, newPassword }) => {
      const u = findUserByName(name);
      if (!u) throw new Error("INVALID_CREDENTIALS");
      let credentialId: string;
      try {
        credentialId = await proveDeviceOwnership({
          userId: u.id,
          userName: u.email,
          displayName: u.name,
          existingCredentialId: u.webauthnCredentialId,
        });
      } catch (err) {
        rethrowWebAuthn(err);
      }
      try {
        setUserWebAuthnCredential(u.id, credentialId!);
        await kvFlush();
      } catch { /* silent cache — reset still proceeds */ }
      const updated = resetPasswordForUser(u.id, newPassword);
      kvSet(PROFILE_FLAG, "1");
      setUser(updated);
      setEnrolled(true);
    },
  }), [
    user,
    loading,
    enrolled,
    hasAnyProfile,
    deviceUnlockAvailable,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
