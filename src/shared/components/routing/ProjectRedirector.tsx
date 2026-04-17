import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";

export function ProjectRedirector() {
  const { projectId } = useParams();
  const { role, isAuthenticated, isLoading, isFullyReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !isFullyReady) return;

    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }

    if (!projectId) {
      navigate("/", { replace: true });
      return;
    }

    const normalizedRole = role?.toString().toUpperCase();
    console.log("[ProjectRedirector] Diagnostic:", {
      role: normalizedRole,
      projectId,
      pathname: window.location.pathname
    });

    // Determine target based on role
    switch (normalizedRole) {
      case "ADMIN":
        console.log("[ProjectRedirector] Navigating to Admin Project View");
        navigate(`/admin/projects/${projectId}`, { replace: true });
        break;
      case "EMPLOYE":
      case "EMPLOYEE":
        console.log("[ProjectRedirector] Navigating to Employee Project View");
        navigate(`/employee/projects/${projectId}`, { replace: true });
        break;
      case "CLIENT":
        console.log("[ProjectRedirector] Navigating to Client Dashboard");
        navigate("/client/dashboard", { replace: true });
        break;
      default:
        console.warn(`[ProjectRedirector] Unknown role: ${normalizedRole}. Falling back to root.`);
        navigate("/", { replace: true });
    }
  }, [projectId, role, isAuthenticated, isLoading, isFullyReady, navigate]);

  return (
    <SplashScreen isLoading={true}>
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <PreloaderIndicator size={1.2} />
      </div>
    </SplashScreen>
  );
}
