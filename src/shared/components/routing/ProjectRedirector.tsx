import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";

export function ProjectRedirector() {
  const { projectId } = useParams();
  const { role, isAuthenticated, isLoading, isFullyReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !isFullyReady) return;

    if (!isAuthenticated) {
      const currentPath = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }

    if (!projectId) {
      navigate("/", { replace: true });
      return;
    }

    const normalizedRole = role?.toString().toUpperCase();

    // Determine target based on role
    switch (normalizedRole) {
      case "ADMIN":
        navigate(`/admin/projects/${projectId}`, { replace: true });
        break;
      case "EMPLOYE":
      case "EMPLOYEE":
        navigate(`/employee/projects/${projectId}`, { replace: true });
        break;
      case "CLIENT":
        navigate("/client/dashboard", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  }, [projectId, role, isAuthenticated, isLoading, isFullyReady, navigate, location.pathname, location.search, location.hash]);

  return (
    <SplashScreen isLoading={true}>
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <PreloaderIndicator size={1.2} />
      </div>
    </SplashScreen>
  );
}
