import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import { getApiBaseUrl, notificationsApi } from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthProvider";
import type { ApiNotification } from "@/types/index";


type NotificationsContextValue = {
  notifications: ApiNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

function buildWsUrl(role: string | null): string | null {
  // Construit l'URL WebSocket du broker en ajoutant /ws et le paramètre role
  const base = getApiBaseUrl();
  if (!base) return null;
  try {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    if (role) {
      url.searchParams.set("role", role);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // Provider React qui expose l'état et les actions liées aux notifications
  const { user, isAuthenticated, isFullyReady } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const stompRef = useRef<Client | null>(null);

  const refresh = useCallback(async () => {
    // Recharge la liste initiale des notifications et le compteur de non lus
    if (!isAuthenticated || isAdmin) return;
    setIsLoading(true);
    try {
      const [page, unread] = await Promise.all([
        notificationsApi.list({ page: 0, size: 30 }),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(page?.content ?? []);
      setUnreadCount(unread);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  const handleIncomingNotification = useCallback((payload: ApiNotification) => {
    // Traite une notification reçue en temps réel et met à jour l'état
    setNotifications((prev) => {
      const withoutSame = prev.filter((item) => item.id !== payload.id);
      return [payload, ...withoutSame].slice(0, 50);
    });
    if (!payload.lu) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  // Effet principal : charge initialement, ouvre/ferme la connexion STOMP et gère le cycle de vie
  useEffect(() => {
    if (!isAuthenticated || !isFullyReady || !user?.role || isAdmin) {
      setNotifications([]);
      setUnreadCount(0);
      if (stompRef.current) {
        stompRef.current.deactivate();
        stompRef.current = null;
      }
      return;
    }

    let cancelled = false;
    refresh().catch(() => {
      if (!cancelled) {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    const brokerURL = buildWsUrl(user.role);
    if (!brokerURL) {
      return () => {
        cancelled = true;
      };
    }

    const client = new Client({
      brokerURL,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", (message: IMessage) => {
          try {
            const payload = JSON.parse(message.body) as ApiNotification;
            handleIncomingNotification(payload);
          } catch {
          }
        });
      },
    });

    stompRef.current = client;
    client.activate();

    return () => {
      cancelled = true;
      client.deactivate();
      if (stompRef.current === client) {
        stompRef.current = null;
      }
    };
  }, [handleIncomingNotification, isAuthenticated, isFullyReady, refresh, user?.role, isAdmin]);

  const markAsRead = useCallback(async (id: number) => {
    // Marque une notification spécifique comme lue via l'API et met à jour l'état local
    const updated = await notificationsApi.markAsRead(id);
    setNotifications((prev) => prev.map((item) => (item.id === id ? updated : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Marque toutes les notifications comme lues côté serveur et localement
    const updatedCount = await notificationsApi.markAllAsRead();
    if (updatedCount > 0) {
      setNotifications((prev) => prev.map((item) => ({ ...item, lu: true })));
      setUnreadCount(0);
    }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    // Supprime une notification localement puis demande la suppression côté serveur
    setNotifications((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && !target.lu) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((item) => item.id !== id);
    });
    try {
      await notificationsApi.delete(id);
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [refresh]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, refresh }),
    [notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, refresh]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  // Hook pour accéder au contexte Notifications depuis les composants
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return context;
}
