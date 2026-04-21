import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, setApiRoleHeader, setAppInitializing } from "@/core/api/client";
import type { AuthResponse, AuthUser, CurrentUserResponse, UserRole } from "@/types/auth";
import { readLastRole, writeLastRole } from "@/core/auth/auth.storage";

type AuthContextValue = {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  isFullyReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullyReady, setIsFullyReady] = useState(false);

  const cleanupObsoleteSessionKeys = useCallback(() => {
    try {
      sessionStorage.removeItem("ikigai:justLoggedIn");
      sessionStorage.removeItem("ikigai:splitSeen");
      sessionStorage.removeItem("ikigai:loginIntroSeen");
      sessionStorage.removeItem("ikigai:bootSplashSeen");
      sessionStorage.removeItem("ikigai:postLoginSplash");
    } catch {
      // ignore
    }
  }, []);

  const cleanupObsoleteLocalKeys = useCallback(() => {
    try {
      localStorage.removeItem("ikigai:justLoggedIn");
      localStorage.removeItem("ikigai:splitSeen");
      localStorage.removeItem("ikigai:loginIntroSeen");
      localStorage.removeItem("ikigai:bootSplashSeen");
      localStorage.removeItem("ikigai:postLoginSplash");
      // History moved to backend storage; remove old local history keys once.
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("ikigai:history:project:")) {
          toDelete.push(key);
        }
      }
      toDelete.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }, []);

  const isNetworkError = useCallback((error: unknown) => {
    if (!error || typeof error !== "object") return false;
    const axiosErr = error as { response?: unknown; code?: string };
    if (!axiosErr.response) return true;
    return axiosErr.code === "ECONNABORTED";
  }, []);

  const toAuthUserFromMe = useCallback((me: CurrentUserResponse): AuthUser => ({
    id: String(me.id),
    email: me.email,
    firstName: me.prenom,
    lastName: me.nom,
    role: me.role,
  }), []);

  const toAuthUserFromAuth = useCallback((auth: AuthResponse): AuthUser => ({
    id: String(auth.userId),
    email: auth.email,
    firstName: auth.prenom,
    lastName: auth.nom,
    role: auth.role,
  }), []);

  const logout = useCallback(async () => {
    // Clear local state immediately to unblock account switching even if the network is slow.
    setUser(null);
    setApiRoleHeader(null);
    setIsFullyReady(true);
    writeLastRole(null);
    cleanupObsoleteSessionKeys();
    cleanupObsoleteLocalKeys();
    try {
      await authApi.logout();
    } catch {
      // Even if API logout fails, we intentionally keep the local state cleared.
    }
  }, [cleanupObsoleteLocalKeys, cleanupObsoleteSessionKeys]);

  useEffect(() => {
    const onForceLogout = () => logout();
    window.addEventListener("auth:logout", onForceLogout);
    return () => window.removeEventListener("auth:logout", onForceLogout);
  }, [logout]);

  useEffect(() => {
    cleanupObsoleteSessionKeys();
    cleanupObsoleteLocalKeys();

    const init = async () => {
      try {
        setAppInitializing(true);
        const lastRole = readLastRole();
        if (lastRole) setApiRoleHeader(lastRole);

        const hydrateFromMe = async () => {
          const me = await authApi.me();
          setApiRoleHeader(me.role);
          writeLastRole(me.role);
          setUser(toAuthUserFromMe(me));
          setIsFullyReady(true);
        };

        try {
          await hydrateFromMe();
          return;
        } catch {
          // access token expired, try refresh flow below
        }

        const tryRefreshAndHydrate = async () => {
          const refresh = await authApi.refreshWithFallback(readLastRole());
          setApiRoleHeader(refresh.role);
          writeLastRole(refresh.role);
          try {
            await hydrateFromMe();
          } catch {
            // Fallback: use refresh payload if /me is temporarily unavailable
            setUser(toAuthUserFromAuth(refresh));
            setIsFullyReady(true);
          }
        };

        try {
          await tryRefreshAndHydrate();
          return;
        } catch (e) {
          // Retry only for temporary network/backend startup hiccups, not for real 401.
          if (!isNetworkError(e)) throw e;
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          await tryRefreshAndHydrate();
        }
      } catch {
        // Do not force server logout on init failure (page refresh resilience).
        setUser(null);
        setApiRoleHeader(null);
        // Auth has settled to signed-out state.
        setIsFullyReady(true);
        writeLastRole(null);
      } finally {
        setAppInitializing(false);
        setIsLoading(false);
      }
    };
    init();
  }, [cleanupObsoleteLocalKeys, cleanupObsoleteSessionKeys, isNetworkError, toAuthUserFromAuth, toAuthUserFromMe]);

  useEffect(() => {
    if (!isLoading && !user) {
      writeLastRole(null);
    }
  }, [isLoading, user]);

  const login = useCallback(async (email: string, password: string) => {
    setIsFullyReady(false);
    const auth = await authApi.login(email, password);
    setApiRoleHeader(auth.role);
    writeLastRole(auth.role);
    try {
      sessionStorage.setItem("ikigai:postLoginSplash", "1");
    } catch {
      // ignore
    }
    try {
      const me = await authApi.me();
      setUser(toAuthUserFromMe(me));
    } catch {
      setUser(toAuthUserFromAuth(auth));
    }
    setIsFullyReady(true);
  }, [toAuthUserFromAuth, toAuthUserFromMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      isFullyReady,
      isAuthenticated: !!user,
      login,
      logout
    }),
    [user, isLoading, isFullyReady, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
