import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { projectsApi } from "@/core/api/client";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";
import { forceRelogin, hasIdentityMismatch } from "./deepLinkRedirect";

const REDIRECT_GUARD_TIMEOUT_MS = 10000;

export function ProjectRedirector() {
  const { projectId } = useParams();
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
    const goToLogin = () => {
      if (cancelled || resolved) return;
      resolved = true;
      navigate(loginUrl, { replace: true });
    };
    const goTo = (to: string, state?: Record<string, unknown>) => {
      if (cancelled || resolved) return;
      resolved = true;
      navigate(to, { replace: true, state });
    };
    const hardTimeoutId = window.setTimeout(() => {
      goToLogin();
    }, REDIRECT_GUARD_TIMEOUT_MS);

    const run = async () => {
      if (isLoading) return;

      const params = new URLSearchParams(location.search);
      const { roleMismatch, userMismatch, normalizedRole } = hasIdentityMismatch(params, role ?? null, user?.id);

      if (!isAuthenticated) {
        goToLogin();
        return;
      }

      if (!projectId) {
        goTo("/");
        return;
      }

      if (roleMismatch || userMismatch) {
        await forceRelogin(logout, goToLogin);
        return;
      }

      try {
        await projectsApi.byId(Number(projectId));
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          await forceRelogin(logout, goToLogin);
          return;
        }
        goTo("/");
        return;
      }

      switch (normalizedRole) {
        case "ADMIN":
          goTo(`/admin/projects/${projectId}`, { fromEmailDeepLink: true });
          break;
        case "EMPLOYE":
        case "EMPLOYEE":
          goTo(`/employee/projects/${projectId}`, { fromEmailDeepLink: true });
          break;
        case "CLIENT":
          goTo("/client/dashboard");
          break;
        default:
          goTo("/");
      }
    };

    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeoutId);
    };
  }, [projectId, role, user?.id, isAuthenticated, isLoading, logout, navigate, location.pathname, location.search, location.hash]);

  return (
    <SplashScreen isLoading={true}>
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <PreloaderIndicator size={1.2} />
      </div>
    </SplashScreen>
  );
}
