import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listTeams } from "@/lib/storage";
import type { ReactNode } from "react";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <>{children}</>;
  const hasTeam = listTeams(user.organizationId).length > 0;
  const onOnboarding = location.pathname === "/app/onboarding";
  if (!hasTeam && !onOnboarding) return <Navigate to="/app/onboarding" replace />;
  if (hasTeam && onOnboarding) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
