import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import type { UserRole } from "@/types/auth";
import Preloader from "@/shared/components/feedback/Preloader";


function GuardLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b]">
      <Preloader size={0.8} />
    </div>
  );
}

function loginRedirectPath(location: ReturnType<typeof useLocation>) {
  const target = `${location.pathname}${location.search}${location.hash}`;
  return `/login?redirect=${encodeURIComponent(target)}`;
}

function roleDefaultPath(role: UserRole) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "CLIENT") return "/client/dashboard";
  return "/employee/dashboard";
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isFullyReady } = useAuth();
  const location = useLocation();
  if (isLoading || (isAuthenticated && !isFullyReady)) {
    return <GuardLoadingScreen />;
  }
  if (!isAuthenticated) {
    return <Navigate to={loginRedirectPath(location)} replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { role: currentRole, isLoading, isAuthenticated, isFullyReady } = useAuth();
  const location = useLocation();
  if (isLoading || (isAuthenticated && !isFullyReady)) {
    return <GuardLoadingScreen />;
  }
  if (!currentRole) {
    return <Navigate to={loginRedirectPath(location)} replace />;
  }
  if (currentRole !== role) {
    // Redirige vers la page racine du role connecte.
    return <Navigate to={roleDefaultPath(currentRole)} replace />;
  }
  return <>{children}</>;
}
