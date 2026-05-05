// Ce fichier gere une partie du frontend.
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import type { UserRole } from "@/types/auth";
import Preloader from "@/shared/components/feedback/Preloader";

// Cet ecran masque les pages tant que l'etat de session n'est pas pret.
function GuardLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b]">
      <Preloader size={0.8} />
    </div>
  );
}

// Cette fonction conserve la destination voulue pour revenir apres connexion.
function loginRedirectPath(location: ReturnType<typeof useLocation>) {
  const target = `${location.pathname}${location.search}${location.hash}`;
  return `/login?redirect=${encodeURIComponent(target)}`;
}

// Cette fonction donne la page par defaut pour un role donne.
function roleDefaultPath(role: UserRole) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "CLIENT") return "/client/dashboard";
  return "/employee/dashboard";
}

// Ce guard bloque les pages privees tant que l'utilisateur n'est pas connecte.
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

// Ce guard bloque les pages qui ne correspondent pas au role courant.
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
    return <Navigate to={roleDefaultPath(currentRole)} replace />;
  }
  return <>{children}</>;
}
