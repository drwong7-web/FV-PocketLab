import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { authenticate, createUserAndOrg, currentUser, signOut as soSignOut } from "@/lib/storage";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name: string, org: string) => Promise<User>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(currentUser());
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      const u = authenticate(email, password);
      setUser(u);
      return u;
    },
    signUp: async (email, password, name, org) => {
      const u = createUserAndOrg(email, password, name, org);
      // auto sign-in
      authenticate(email, password);
      setUser(u);
      return u;
    },
    signOut: () => {
      soSignOut();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
