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

const OBSOLETE_AUTH_KEYS = [
  "ikigai:justLoggedIn",
  "ikigai:splitSeen",
  "ikigai:loginIntroSeen",
  "ikigai:bootSplashSeen",
  "ikigai:postLoginSplash",
];

function toAuthUserFromMe(me: CurrentUserResponse): AuthUser {
  return {
    id: String(me.id),
    email: me.email,
    firstName: me.prenom,
    lastName: me.nom,
    role: me.role,
  };
}

function toAuthUserFromAuth(auth: AuthResponse): AuthUser {
  return {
    id: String(auth.userId),
    email: auth.email,
    firstName: auth.prenom,
    lastName: auth.nom,
    role: auth.role,
  };
}

function removeKeysFromStorage(storage: Storage, keys: string[]) {
  keys.forEach((key) => {
    storage.removeItem(key);
  });
}

function removeLegacyHistoryKeys() {
  const toDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith("ikigai:history:project:")) {
      toDelete.push(key);
    }
  }
  toDelete.forEach((key) => localStorage.removeItem(key));
}

function isNetworkError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const axiosErr = error as { response?: unknown; code?: string };
  if (!axiosErr.response) return true;
  return axiosErr.code === "ECONNABORTED";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullyReady, setIsFullyReady] = useState(false);

  const cleanupObsoleteSessionKeys = useCallback(() => {
    try {
      removeKeysFromStorage(sessionStorage, OBSOLETE_AUTH_KEYS);
    } catch {
      // ignore
    }
  }, []);

  const cleanupObsoleteLocalKeys = useCallback(() => {
    try {
      removeKeysFromStorage(localStorage, OBSOLETE_AUTH_KEYS);
      // Nettoie les anciennes cles d'historique local.
      removeLegacyHistoryKeys();
    } catch {
      // ignore
    }
  }, []);

  const applySignedOutState = useCallback(() => {
    setUser(null);
    setApiRoleHeader(null);
    setIsFullyReady(true);
    writeLastRole(null);
  }, []);

  const logout = useCallback(async () => {
    // Nettoie l'etat local tout de suite pour fluidifier le changement de compte.
    applySignedOutState();
    cleanupObsoleteSessionKeys();
    cleanupObsoleteLocalKeys();

    try {
      await authApi.logout();
    } catch {
      // On garde volontairement l'etat local vide meme si l'API echoue.
    }
  }, [applySignedOutState, cleanupObsoleteLocalKeys, cleanupObsoleteSessionKeys]);

  useEffect(() => {
    const onForceLogout = () => logout();
    window.addEventListener("auth:logout", onForceLogout);
    return () => window.removeEventListener("auth:logout", onForceLogout);
  }, [logout]);

  useEffect(() => {
    cleanupObsoleteSessionKeys();
    cleanupObsoleteLocalKeys();

    const hydrateFromMe = async () => {
      const me = await authApi.me();
      setApiRoleHeader(me.role);
      writeLastRole(me.role);
      setUser(toAuthUserFromMe(me));
      setIsFullyReady(true);
    };

    const refreshAndHydrate = async () => {
      const refresh = await authApi.refreshWithFallback(readLastRole());
      setApiRoleHeader(refresh.role);
      writeLastRole(refresh.role);

      try {
        await hydrateFromMe();
      } catch {
        // Fallback si /me est temporairement indisponible.
        setUser(toAuthUserFromAuth(refresh));
        setIsFullyReady(true);
      }
    };

    const init = async () => {
      try {
        setAppInitializing(true);

        const lastRole = readLastRole();
        if (lastRole) setApiRoleHeader(lastRole);

        try {
          await hydrateFromMe();
          return;
        } catch {
          // Token access expire, on tente refresh ensuite.
        }

        try {
          await refreshAndHydrate();
          return;
        } catch (error) {
          // Retry uniquement sur erreur reseau temporaire.
          if (!isNetworkError(error)) throw error;
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          await refreshAndHydrate();
        }
      } catch {
        // Ne pas forcer logout serveur en cas d'echec d'init.
        applySignedOutState();
      } finally {
        setAppInitializing(false);
        setIsLoading(false);
      }
    };

    void init();
  }, [applySignedOutState, cleanupObsoleteLocalKeys, cleanupObsoleteSessionKeys]);

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
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      isFullyReady,
      isAuthenticated: !!user,
      login,
      logout,
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
