import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { currentUser, ensureLocalUserForRemote, signOut as clearLocalSession } from "@/lib/storage";
import { kvGet, kvSet, kvRemove, useKvReady } from "@/lib/db/kvStore";
import { isOnline, isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import {
  cacheEntitlements,
  clearCachedEntitlements,
  entitlementsFromRow,
  readCachedEntitlements,
  FREE_ENTITLEMENTS,
  type Entitlements,
} from "@/lib/plan";
import {
  listOfflineIdentities,
  rememberOfflineCredential,
  updateOfflinePassword,
  verifyOfflineCredential,
} from "@/lib/offlineAuth";
import type { User } from "@/lib/types";

/** Marks the device as holding a usable profile (survives a closed tab). */
const PROFILE_FLAG = "slfv:profile-ready";

/** Error codes thrown by this module; `Auth.tsx` maps them to translated copy. */
export type AuthErrorCode =
  | "EMAIL_EXISTS"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_CONFIRMED"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORDS_DONT_MATCH"
  | "OFFLINE_SIGNUP"
  | "OFFLINE_NO_CREDENTIAL"
  | "OFFLINE_RESET"
  | "NOT_CONFIGURED"
  | "NETWORK"
  | "UNKNOWN";

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "AuthError";
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** True when a session is active (online or restored offline). */
  enrolled: boolean;
  /** True when at least one account has signed in on this device before. */
  hasAnyProfile: boolean;
  /** True when the session was restored from cached credentials with no network. */
  offlineMode: boolean;
  entitlements: Entitlements;
  signUp: (opts: { email: string; password: string; name: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (opts: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshEntitlements: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function displayNameFor(u: SupabaseUser): string {
  const meta = u.user_metadata ?? {};
  return (
    (meta.full_name as string) ||
    (meta.name as string) ||
    (u.email ? u.email.split("@")[0] : "") ||
    "Coach"
  );
}

/** Supabase surfaces network problems as generic errors — sniff them out. */
function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("failed to load") ||
    msg.includes("timeout")
  );
}

function mapSupabaseError(message: string): AuthErrorCode {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "EMAIL_EXISTS";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "INVALID_CREDENTIALS";
  if (m.includes("email not confirmed")) return "EMAIL_NOT_CONFIRMED";
  if (m.includes("password should be at least")) return "PASSWORD_TOO_SHORT";
  return "UNKNOWN";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const kvReady = useKvReady();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [hasAnyProfile, setHasAnyProfile] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements>(FREE_ENTITLEMENTS);
  /** Remembered from the sign-in form so a fresh session can store its verifier. */
  const pendingPassword = useRef<{ email: string; password: string } | null>(null);

  const loadEntitlements = useCallback(async (userId: string) => {
    const cached = readCachedEntitlements(userId);
    if (cached) setEntitlements(cached);

    if (!isSupabaseConfigured || !isOnline()) return;
    try {
      const { data, error } = await supabase.rpc("my_entitlements");
      if (error) throw error;
      if (!data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      const next = entitlementsFromRow(row);
      setEntitlements(next);
      cacheEntitlements(userId, next);
    } catch {
      // Offline or RPC missing — the cached value (or free tier) stands.
    }
  }, []);

  const adoptSession = useCallback(
    async (session: Session) => {
      const remote = session.user;
      const local = ensureLocalUserForRemote({
        id: remote.id,
        email: remote.email ?? "",
        name: displayNameFor(remote),
      });
      kvSet(PROFILE_FLAG, "1");
      setUser(local);
      setEnrolled(true);
      setOfflineMode(false);
      setHasAnyProfile(true);

      const pending = pendingPassword.current;
      if (pending && remote.email && pending.email.toLowerCase() === remote.email.toLowerCase()) {
        pendingPassword.current = null;
        void rememberOfflineCredential({
          userId: remote.id,
          email: remote.email,
          name: local.name,
          password: pending.password,
        });
      }

      await loadEntitlements(remote.id);
    },
    [loadEntitlements]
  );

  const dropSession = useCallback(() => {
    clearLocalSession();
    kvRemove(PROFILE_FLAG);
    clearCachedEntitlements();
    setUser(null);
    setEnrolled(false);
    setOfflineMode(false);
    setEntitlements(FREE_ENTITLEMENTS);
  }, []);

  // Boot: adopt a persisted Supabase session, or fall back to a local session
  // that an earlier offline sign-in left behind.
  useEffect(() => {
    if (!kvReady) return;
    let cancelled = false;

    (async () => {
      setHasAnyProfile(listOfflineIdentities().length > 0);
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          await adoptSession(data.session);
        } else {
          const local = currentUser();
          if (local && kvGet<string>(PROFILE_FLAG) === "1") {
            setUser(local);
            setEnrolled(true);
            setOfflineMode(true);
            setEntitlements(readCachedEntitlements(local.id) ?? FREE_ENTITLEMENTS);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        dropSession();
        return;
      }
      if (session) void adoptSession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [kvReady, adoptSession, dropSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      enrolled,
      hasAnyProfile,
      offlineMode,
      entitlements,

      signUp: async ({ email, password, name }) => {
        if (!isSupabaseConfigured) throw new AuthError("NOT_CONFIGURED");
        if (password.length < 6) throw new AuthError("PASSWORD_TOO_SHORT");
        // The account itself lives in Supabase, so the very first sign-up needs
        // a connection. Every later sign-in can happen offline.
        if (!isOnline()) throw new AuthError("OFFLINE_SIGNUP");

        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          if (error) throw new AuthError(mapSupabaseError(error.message), error.message);
          // Supabase returns a user with no identities when the address is taken.
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            throw new AuthError("EMAIL_EXISTS");
          }
          if (!data.session) {
            return { needsEmailConfirmation: true };
          }
          pendingPassword.current = { email: email.trim(), password };
          await adoptSession(data.session);
          return { needsEmailConfirmation: false };
        } catch (err) {
          if (err instanceof AuthError) throw err;
          if (isNetworkError(err)) throw new AuthError("NETWORK");
          throw new AuthError("UNKNOWN", err instanceof Error ? err.message : undefined);
        }
      },

      signIn: async ({ email, password }) => {
        const trimmed = email.trim();

        const offlineFallback = async () => {
          const identity = await verifyOfflineCredential(trimmed, password);
          if (!identity) throw new AuthError("OFFLINE_NO_CREDENTIAL");
          const local = ensureLocalUserForRemote({
            id: identity.userId,
            email: identity.email,
            name: identity.name,
          });
          kvSet(PROFILE_FLAG, "1");
          setUser(local);
          setEnrolled(true);
          setOfflineMode(true);
          setEntitlements(readCachedEntitlements(local.id) ?? FREE_ENTITLEMENTS);
        };

        if (!isSupabaseConfigured || !isOnline()) {
          await offlineFallback();
          return;
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmed,
            password,
          });
          if (error) throw new AuthError(mapSupabaseError(error.message), error.message);
          pendingPassword.current = { email: trimmed, password };
          if (data.session) await adoptSession(data.session);
        } catch (err) {
          if (err instanceof AuthError) throw err;
          if (isNetworkError(err)) {
            await offlineFallback();
            return;
          }
          throw new AuthError("UNKNOWN", err instanceof Error ? err.message : undefined);
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // Already offline — dropping the local session is enough.
        }
        dropSession();
      },

      sendPasswordReset: async (email) => {
        if (!isSupabaseConfigured) throw new AuthError("NOT_CONFIGURED");
        if (!isOnline()) throw new AuthError("OFFLINE_RESET");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw new AuthError("UNKNOWN", error.message);
      },

      updatePassword: async (newPassword) => {
        if (newPassword.length < 6) throw new AuthError("PASSWORD_TOO_SHORT");
        if (!isOnline()) throw new AuthError("NETWORK");
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new AuthError(mapSupabaseError(error.message), error.message);
        const email = data.user?.email;
        if (email) await updateOfflinePassword(email, newPassword);
      },

      refreshEntitlements: async () => {
        if (user) await loadEntitlements(user.id);
      },
    }),
    [
      user,
      loading,
      enrolled,
      hasAnyProfile,
      offlineMode,
      entitlements,
      adoptSession,
      dropSession,
      loadEntitlements,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Convenience hook for gating features and ad slots. */
export function useEntitlements(): Entitlements {
  return useAuth().entitlements;
}
