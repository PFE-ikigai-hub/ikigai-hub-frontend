import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { projectsApi } from "@/core/api/client";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";

export function ProjectRedirector() {
  const { projectId } = useParams();
  const { user, role, isAuthenticated, isLoading, isFullyReady, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const normalizeRole = (value: string | null | undefined) => {
      const upper = value?.toString().toUpperCase();
      return upper === "EMPLOYEE" ? "EMPLOYE" : upper;
    };

    const run = async () => {
      if (isLoading || !isFullyReady) return;

      const params = new URLSearchParams(location.search);
      const expectedRole = normalizeRole(params.get("expectedRole"));
      const expectedUserIdRaw = params.get("expectedUserId");
      const expectedUserId = expectedUserIdRaw ? Number.parseInt(expectedUserIdRaw, 10) : null;
      const currentPath = `${location.pathname}${location.search}${location.hash}`;

      const forceReLogin = async () => {
        try {
          sessionStorage.setItem(
            "ikigai:authNotice",
            "This link requires login with the correct account. You will be redirected to sign in."
          );
        } catch {
          // ignore
        }
        try {
          await logout();
        } finally {
          if (!cancelled) {
            navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
          }
        }
      };

      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
        return;
      }

      if (!projectId) {
        navigate("/", { replace: true });
        return;
      }

      const normalizedRole = normalizeRole(role ?? null);
      const currentUserId = user?.id ? Number.parseInt(user.id, 10) : null;
      const roleMismatch = Boolean(expectedRole && normalizedRole && expectedRole !== normalizedRole);
      const userMismatch =
        typeof expectedUserId === "number" &&
        Number.isFinite(expectedUserId) &&
        typeof currentUserId === "number" &&
        Number.isFinite(currentUserId) &&
        expectedUserId !== currentUserId;

      if (roleMismatch || userMismatch) {
        await forceReLogin();
        return;
      }

      try {
        await projectsApi.byId(Number(projectId));
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          await forceReLogin();
          return;
        }
        navigate("/", { replace: true });
        return;
      }

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
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [projectId, role, user?.id, isAuthenticated, isLoading, isFullyReady, logout, navigate, location.pathname, location.search, location.hash]);

  return (
    <SplashScreen isLoading={true}>
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <PreloaderIndicator size={1.2} />
      </div>
    </SplashScreen>
  );
}
