import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { createUserAndOrg, currentUser, listUsers } from "@/lib/storage";
import {
  clearMasterKey, enrollPin, enrollPasskey, getAutoLockMinutes,
  hasPasskey, isEnrolled, isUnlocked, resetAuth,
  unlockWithPasskey, unlockWithPin,
} from "@/lib/deviceAuth";
import { clearAIKeyFromMemory, loadAIKey } from "@/lib/ai/client";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  locked: boolean;
  enrolled: boolean;
  /** Onboarding : crée profil local + PIN, optionnel passkey. */
  enroll: (opts: { name: string; org: string; pin: string; enablePasskey?: boolean }) => Promise<void>;
  /** Déverrouillage par PIN. */
  unlockPin: (pin: string) => Promise<void>;
  /** Déverrouillage par biométrie. */
  unlockBiometric: () => Promise<void>;
  /** Verrouille la session (clé IA et master key purgées de la mémoire). */
  lock: () => void;
  /** Reset complet : efface profil, PIN, passkey, clé IA. */
  signOut: () => void;
  /** Notifie l'activité utilisateur (reset du timer d'auto-lock). */
  bumpActivity: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(true);
  const [enrolled, setEnrolled] = useState(isEnrolled());
  const lockTimerRef = useRef<number | null>(null);

  const refreshProfile = useCallback(() => {
    setUser(currentUser() ?? listUsers()[0] ?? null);
    setEnrolled(isEnrolled());
  }, []);

  const lock = useCallback(() => {
    clearMasterKey();
    clearAIKeyFromMemory();
    setLocked(true);
  }, []);

  const armAutoLock = useCallback(() => {
    if (lockTimerRef.current !== null) window.clearTimeout(lockTimerRef.current);
    const min = getAutoLockMinutes();
    lockTimerRef.current = window.setTimeout(() => lock(), min * 60_000);
  }, [lock]);

  const bumpActivity = useCallback(() => {
    if (!isUnlocked()) return;
    armAutoLock();
  }, [armAutoLock]);

  const afterUnlock = useCallback(async () => {
    await loadAIKey();
    setLocked(false);
    armAutoLock();
  }, [armAutoLock]);

  // Initial load
  useEffect(() => {
    refreshProfile();
    setLocked(!isUnlocked());
    setLoading(false);
  }, [refreshProfile]);

  // Listen for activity + visibility to manage auto-lock
  useEffect(() => {
    const onActivity = () => bumpActivity();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Optional: lock immediately on hide could be too aggressive — keep timer-based.
      } else {
        bumpActivity();
      }
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      if (lockTimerRef.current !== null) window.clearTimeout(lockTimerRef.current);
    };
  }, [bumpActivity]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, locked, enrolled,
    enroll: async ({ name, org, pin, enablePasskey }) => {
      // Crée le profil local s'il n'existe pas déjà
      let u = currentUser() ?? listUsers()[0] ?? null;
      if (!u) {
        u = createUserAndOrg(`local-${Date.now()}@device`, "n/a", name.trim(), org.trim());
      }
      await enrollPin(pin);
      if (enablePasskey) {
        try { await enrollPasskey(pin); } catch (e) {
          // Non bloquant : on garde le PIN seul
          console.warn("Passkey enrollment failed:", e);
        }
      }
      setUser(u);
      setEnrolled(true);
      await afterUnlock();
    },
    unlockPin: async (pin) => {
      await unlockWithPin(pin);
      refreshProfile();
      await afterUnlock();
    },
    unlockBiometric: async () => {
      await unlockWithPasskey();
      refreshProfile();
      await afterUnlock();
    },
    lock,
    signOut: () => {
      resetAuth();
      clearAIKeyFromMemory();
      try {
        localStorage.removeItem("fv:ai-key:v2");
      } catch { /* */ }
      setLocked(true);
      setEnrolled(false);
    },
    bumpActivity,
  }), [user, loading, locked, enrolled, lock, afterUnlock, refreshProfile, bumpActivity]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Helper for components: alias kept for compatibility — `hasPasskey` re-export
export { hasPasskey };
