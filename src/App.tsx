import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import PlayerDetail from "./pages/PlayerDetail";
import NewTest from "./pages/NewTest";
import JumpTest from "./pages/JumpTest";
import SprintTest from "./pages/SprintTest";
import TestList from "./pages/TestList";
import TestResults from "./pages/TestResults";
import NotFound from "./pages/NotFound";
import InstallModal from "@/components/pwa/InstallModal";
import InstallBanner from "@/components/pwa/InstallBanner";
import { isStandalone } from "@/lib/pwa/install";

const queryClient = new QueryClient();

function RootRedirect() {
  const { loading, enrolled } = useAuth();
  if (loading) return <div className="min-h-svh bg-background" aria-hidden />;
  if (enrolled || isStandalone()) {
    return <Navigate to="/app" replace />;
  }
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <InstallBanner />
          <InstallModal />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset" element={<ResetPassword />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="teams" element={<Teams />} />
              <Route path="teams/:teamId" element={<TeamDetail />} />
              <Route path="players/:playerId" element={<PlayerDetail />} />
              <Route path="tests" element={<TestList />} />
              <Route path="tests/new" element={<NewTest />} />
              <Route path="tests/new/jump" element={<JumpTest />} />
              <Route path="tests/new/sprint" element={<SprintTest />} />
              <Route path="tests/:testId" element={<TestResults />} />
            </Route>
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
