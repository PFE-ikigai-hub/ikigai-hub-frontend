import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import type { UserRole } from "@/types/auth";
import Preloader from "@/shared/components/feedback/Preloader";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isFullyReady } = useAuth();
  const location = useLocation();
  if (isLoading || (isAuthenticated && !isFullyReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b]">
        <Preloader size={0.8} />
      </div>
    );
  }
  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { role: currentRole, isLoading, isAuthenticated, isFullyReady } = useAuth();
  const location = useLocation();
  if (isLoading || (isAuthenticated && !isFullyReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b]">
        <Preloader size={0.8} />
      </div>
    );
  }
  if (!currentRole) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }
  if (currentRole !== role) {
    if (currentRole === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    if (currentRole === "CLIENT") return <Navigate to="/client/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }
  return <>{children}</>;
}
