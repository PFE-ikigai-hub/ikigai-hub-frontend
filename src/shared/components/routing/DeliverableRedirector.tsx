import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";

export function DeliverableRedirector() {
  const { deliverableId } = useParams();
  const { role, isAuthenticated, isLoading, isFullyReady } = useAuth();
  const navigate = useNavigate();
  const versionId = new URLSearchParams(window.location.search).get("versionId");

  useEffect(() => {
    if (isLoading || !isFullyReady) return;

    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }

    if (!deliverableId) {
      navigate("/", { replace: true });
      return;
    }

    const normalizedRole = role?.toString().toUpperCase();
    const query = versionId ? `?versionId=${versionId}` : "";
    
    console.log("[Redirector] Diagnostic:", {
      role: normalizedRole,
      deliverableId,
      versionId,
      fullQuery: query,
      pathname: window.location.pathname
    });

    // Determine target based on role
    switch (normalizedRole) {
      case "ADMIN":
        console.log("[Redirector] Navigating to Admin view");
        navigate(`/admin/deliverables/${deliverableId}${query}`, { replace: true });
        break;
      case "EMPLOYE":
      case "EMPLOYEE":
        console.log("[Redirector] Navigating to Employee view");
        navigate(`/employee/feedback/${deliverableId}${query}`, { replace: true });
        break;
      case "CLIENT":
        console.log("[Redirector] Navigating to Client view");
        navigate(`/client/review/${deliverableId}${query}`, { replace: true });
        break;
      default:
        console.warn(`[Redirector] Unknown or missing role: ${normalizedRole}. Falling back to root.`);
        navigate("/", { replace: true });
    }
  }, [deliverableId, role, isAuthenticated, isLoading, isFullyReady, navigate]);

  return (
    <SplashScreen isLoading={true}>
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <PreloaderIndicator size={1.2} />
      </div>
    </SplashScreen>
  );
}
