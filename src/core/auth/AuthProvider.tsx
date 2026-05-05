// Ce fichier gere une partie du frontend.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, setApiRoleHeader, setAppInitializing } from "@/core/api/client";
import type { AuthResponse, AuthUser, CurrentUserResponse, UserRole } from "@/types/auth";
import { readLastRole, writeLastRole } from "@/core/auth/auth.storage";

// Ce type decrit les donnees partagees par le contexte d'authentification.
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

// Cette fonction adapte la reponse /me au format utilisateur du frontend.
function toAuthUserFromMe(me: CurrentUserResponse): AuthUser {
  return {
    id: String(me.id),
    email: me.email,
    firstName: me.prenom,
    lastName: me.nom,
    role: me.role,
  };
}

// Cette fonction adapte la reponse de login au format utilisateur du frontend.
function toAuthUserFromAuth(auth: AuthResponse): AuthUser {
  return {
    id: String(auth.userId),
    email: auth.email,
    firstName: auth.prenom,
    lastName: auth.nom,
    role: auth.role,
  };
}

// Cette fonction supprime une liste de cles dans un storage.
function removeKeysFromStorage(storage: Storage, keys: string[]) {
  keys.forEach((key) => {
    storage.removeItem(key);
  });
}

// Cette fonction nettoie les anciennes cles d'historique local.
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

// Cette fonction detecte les erreurs reseau temporaires.
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

  // Ce nettoyage retire les anciennes cles de session.
  const cleanupObsoleteSessionKeys = useCallback(() => {
    try {
      removeKeysFromStorage(sessionStorage, OBSOLETE_AUTH_KEYS);
    } catch {
    }
  }, []);

  // Ce nettoyage retire les anciennes cles locales.
  const cleanupObsoleteLocalKeys = useCallback(() => {
    try {
      removeKeysFromStorage(localStorage, OBSOLETE_AUTH_KEYS);
      removeLegacyHistoryKeys();
    } catch {
    }
  }, []);

  // Cet etat represente un utilisateur totalement deconnecte.
  const applySignedOutState = useCallback(() => {
    setUser(null);
    setApiRoleHeader(null);
    setIsFullyReady(true);
    writeLastRole(null);
  }, []);

  // Cette action vide l'etat local puis demande la deconnexion au backend.
  const logout = useCallback(async () => {
    applySignedOutState();
    cleanupObsoleteSessionKeys();
    cleanupObsoleteLocalKeys();

    try {
      await authApi.logout();
    } catch {
    }
  }, [applySignedOutState, cleanupObsoleteLocalKeys, cleanupObsoleteSessionKeys]);

  // Cet effet ecoute une demande globale de deconnexion.
  useEffect(() => {
    const onForceLogout = () => logout();
    window.addEventListener("auth:logout", onForceLogout);
    return () => window.removeEventListener("auth:logout", onForceLogout);
  }, [logout]);

  // Cet effet restaure la session au demarrage de l'application.
  useEffect(() => {
    cleanupObsoleteSessionKeys();
    cleanupObsoleteLocalKeys();

    // Cette fonction recharge le profil complet de l'utilisateur.
    const hydrateFromMe = async () => {
      const me = await authApi.me();
      setApiRoleHeader(me.role);
      writeLastRole(me.role);
      setUser(toAuthUserFromMe(me));
      setIsFullyReady(true);
    };

    // Cette fonction tente un refresh puis recharge le profil.
    const refreshAndHydrate = async () => {
      const refresh = await authApi.refreshWithFallback(readLastRole());
      setApiRoleHeader(refresh.role);
      writeLastRole(refresh.role);

      try {
        await hydrateFromMe();
      } catch {
        setUser(toAuthUserFromAuth(refresh));
        setIsFullyReady(true);
      }
    };

    // Cette fonction orchestre toute l'initialisation de la session.
    const init = async () => {
      try {
        setAppInitializing(true);

        const lastRole = readLastRole();
        if (lastRole) setApiRoleHeader(lastRole);

        try {
          await hydrateFromMe();
          return;
        } catch {
        }

        try {
          await refreshAndHydrate();
          return;
        } catch (error) {
          if (!isNetworkError(error)) throw error;
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          await refreshAndHydrate();
        }
      } catch {
        applySignedOutState();
      } finally {
        setAppInitializing(false);
        setIsLoading(false);
      }
    };

    void init();
  }, [applySignedOutState, cleanupObsoleteLocalKeys, cleanupObsoleteSessionKeys]);

  // Cet effet oublie le dernier role si personne n'est connecte.
  useEffect(() => {
    if (!isLoading && !user) {
      writeLastRole(null);
    }
  }, [isLoading, user]);

  // Cette action connecte l'utilisateur puis recharge son profil.
  const login = useCallback(async (email: string, password: string) => {
    setIsFullyReady(false);

    const auth = await authApi.login(email, password);
    setApiRoleHeader(auth.role);
    writeLastRole(auth.role);

    try {
      sessionStorage.setItem("ikigai:postLoginSplash", "1");
    } catch {
    }

    try {
      const me = await authApi.me();
      setUser(toAuthUserFromMe(me));
    } catch {
      setUser(toAuthUserFromAuth(auth));
    }

    setIsFullyReady(true);
  }, []);

  // Cette valeur partage l'etat d'authentification avec toute l'application.
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

// Ce hook donne acces simplement au contexte d'authentification.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
