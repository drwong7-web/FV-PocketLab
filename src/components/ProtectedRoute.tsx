import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-svh bg-background" aria-hidden />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}
