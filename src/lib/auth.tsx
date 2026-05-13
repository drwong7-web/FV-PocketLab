import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, org: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(session: Session | null): Promise<AuthUser | null> {
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("name, organization_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error || !data) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      name: (session.user.user_metadata?.name as string) ?? "",
      organizationId: "",
    };
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: data.name,
    organizationId: data.organization_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls so we don't deadlock the listener
      setTimeout(() => {
        loadProfile(session).then(setUser);
      }, 0);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session).then((u) => {
        setUser(u);
        setLoading(false);
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, name, org) => {
      const redirectUrl = `${window.location.origin}/app`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name, org_name: org },
        },
      });
      if (error) throw error;
    },
    signInWithGoogle: async () => {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) throw result.error instanceof Error ? result.error : new Error(String(result.error));
    },
    signInWithApple: async () => {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) throw result.error instanceof Error ? result.error : new Error(String(result.error));
    },
    signOut: async () => {
      await supabase.auth.signOut();
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
