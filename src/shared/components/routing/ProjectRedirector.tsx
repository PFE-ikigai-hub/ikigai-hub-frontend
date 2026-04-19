import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { projectsApi } from "@/core/api/client";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";

const REDIRECT_GUARD_TIMEOUT_MS = 10000;
const LOGOUT_WAIT_TIMEOUT_MS = 1500;

export function ProjectRedirector() {
  const { projectId } = useParams();
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    const normalizeRole = (value: string | null | undefined) => {
      const upper = value?.toString().toUpperCase();
      return upper === "EMPLOYEE" ? "EMPLOYE" : upper;
    };
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
    const setWrongAccountNotice = () => {
      try {
        sessionStorage.setItem(
          "ikigai:authNotice",
          "This link requires login with the correct account. You will be redirected to sign in."
        );
      } catch {
        // ignore
      }
    };

    const hardTimeoutId = window.setTimeout(() => {
      goToLogin();
    }, REDIRECT_GUARD_TIMEOUT_MS);

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const run = async () => {
      if (isLoading) return;

      const params = new URLSearchParams(location.search);
      const expectedRole = normalizeRole(params.get("expectedRole"));
      const expectedUserIdRaw = params.get("expectedUserId");
      const expectedUserId = expectedUserIdRaw ? Number.parseInt(expectedUserIdRaw, 10) : null;

      const forceReLogin = async () => {
        setWrongAccountNotice();
        const logoutTask = Promise.race([logout(), sleep(LOGOUT_WAIT_TIMEOUT_MS)]);
        void logoutTask.finally(() => {
          goToLogin();
        });
        try {
          await logoutTask;
        } catch {
          // ignore
        }
        goToLogin();
      };

      if (!isAuthenticated) {
        goToLogin();
        return;
      }

      if (!projectId) {
        goTo("/");
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
