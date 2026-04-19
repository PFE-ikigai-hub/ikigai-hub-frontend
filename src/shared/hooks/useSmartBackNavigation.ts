import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/auth";

type SmartBackState = {
  fromEmailDeepLink?: boolean;
};

type SmartBackOptions = {
  role: UserRole | null;
  fallbackByRole?: Partial<Record<UserRole, string>>;
  defaultFallback?: string;
};

const DEFAULT_ROLE_FALLBACKS: Record<UserRole, string> = {
  ADMIN: "/admin/projects",
  CLIENT: "/client/dashboard",
  EMPLOYE: "/employee/feedback",
};

function hasSameOriginReferrer(): boolean {
  if (typeof document === "undefined" || !document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function useSmartBackNavigation({
  role,
  fallbackByRole,
  defaultFallback = "/",
}: SmartBackOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  const fallbackPath = useMemo(() => {
    if (!role) return defaultFallback;
    return fallbackByRole?.[role] ?? DEFAULT_ROLE_FALLBACKS[role] ?? defaultFallback;
  }, [role, fallbackByRole, defaultFallback]);

  const canUseHistoryBack = useMemo(() => {
    if (typeof window === "undefined") return false;

    const navState = (location.state ?? null) as SmartBackState | null;
    if (navState?.fromEmailDeepLink) return false;

    const historyIdx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIdx <= 0) return false;

    const sameOriginReferrer = hasSameOriginReferrer();
    if (!sameOriginReferrer && historyIdx <= 1) return false;

    return true;
  }, [location.state]);

  const goBack = useCallback(() => {
    if (canUseHistoryBack) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath, { replace: true });
  }, [canUseHistoryBack, navigate, fallbackPath]);

  return {
    goBack,
    canUseHistoryBack,
    fallbackPath,
  };
}
