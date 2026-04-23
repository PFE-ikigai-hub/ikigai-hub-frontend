import { useState, useEffect, useRef } from "react";
import { List, X, SignOut, GearSix, Bell } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import type { UserRole, Notification as NotificationType } from "@/types/index";
import { GlassIcon } from "@/shared/components/ui/GlassIcon";
import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";

type MobileMenuItem = { to: string; label: string; icon: React.ElementType };

type MobileSidebarUser = {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
};

interface MobileSidebarProps {
  menuItems: MobileMenuItem[];
  activePath: string;
  user: MobileSidebarUser;
  language: string;
  onNavigate: (to: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  t: (key: string) => string;
  notifications?: NotificationType[];
  unreadCount?: number;
  onNotificationClick?: (id: number, routePath?: string) => void;
  onDeleteNotification?: (id: number) => void;
  onMarkAllAsRead?: () => void;
  formatTimeAgo?: (date: string) => string;
}

function buildAvatarUrl(storedUrl: string | null, timestamp: string | null, fallback?: string | null) {
  // Construit l'URL avatar avec anti-cache si necessaire.
  if (storedUrl) {
    if (storedUrl.startsWith("data:")) return storedUrl;
    return `${storedUrl}?t=${timestamp || Date.now()}`;
  }
  return fallback || undefined;
}

// Hook to get avatar URL with cache busting timestamp
function useAvatarWithTimestamp(userId: string | undefined, photoUrl: string | undefined | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(photoUrl || undefined);

  useEffect(() => {
    if (!userId) return;

    const avatarKey = `ikigai-avatar-${userId}`;
    const timestampKey = `ikigai-avatar-ts-${userId}`;

    try {
      const stored = localStorage.getItem(avatarKey);
      const timestamp = localStorage.getItem(timestampKey);
      setAvatarUrl(buildAvatarUrl(stored, timestamp, photoUrl));
    } catch {
      setAvatarUrl(photoUrl || undefined);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === avatarKey || e.key === timestampKey) {
        try {
          const newStored = localStorage.getItem(avatarKey);
          const newTimestamp = localStorage.getItem(timestampKey);
          setAvatarUrl(buildAvatarUrl(newStored, newTimestamp, photoUrl));
        } catch {
          setAvatarUrl(photoUrl || undefined);
        }
      }
    };

    // Listen for custom avatar-updated event (same tab)
    const handleAvatarUpdated = () => {
      try {
        const newStored = localStorage.getItem(avatarKey);
        const newTimestamp = localStorage.getItem(timestampKey);
        setAvatarUrl(buildAvatarUrl(newStored, newTimestamp, photoUrl));
      } catch {
        setAvatarUrl(photoUrl || undefined);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener('avatar-updated', handleAvatarUpdated);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener('avatar-updated', handleAvatarUpdated);
    };
  }, [userId, photoUrl]);

  return avatarUrl;
}

export function MobileSidebar({
  menuItems,
  activePath,
  user,
  language,
  onNavigate,
  onOpenSettings,
  onLogout,
  t,
  notifications = [],
  unreadCount = 0,
  onNotificationClick,
  onDeleteNotification,
  onMarkAllAsRead,
  formatTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const seconds = Math.floor((now.getTime() - notifDate.getTime()) / 1000);

    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return notifDate.toLocaleDateString("fr-FR");
  },
}: MobileSidebarProps) {
  const isArabic = language === "AR";
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLDivElement>(null);
  const canUseNotifications = Boolean(onNotificationClick);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node) &&
        notificationsButtonRef.current &&
        !notificationsButtonRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const handleNavigate = (to: string) => {
    onNavigate(to);
    setIsOpen(false);
  };

  const handleSettings = () => {
    onOpenSettings();
    setIsOpen(false);
  };

  const handleNotificationClick = (notifId: number, routePath?: string) => {
    if (onNotificationClick) {
      onNotificationClick(notifId, routePath);
    }
    setIsNotificationsOpen(false);
    if (routePath) {
      onNavigate(routePath);
      setIsOpen(false);
    }
  };

  const handleDeleteNotification = (notifId: number) => {
    if (onDeleteNotification) {
      onDeleteNotification(notifId);
    }
  };

  // Get avatar with cache busting timestamp
  const avatarUrl = useAvatarWithTimestamp(user?.id, user?.photoUrl);

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`md:hidden fixed bottom-6 w-14 h-14 ikg-gradient-btn rounded-full shadow-2xl shadow-stone-900/20 flex items-center justify-center z-40 active:scale-95 transition-transform duration-200 ${
          isArabic ? "left-6" : "right-6"
        }`}
        aria-label={t("common.open")}
        type="button"
      >
        <List className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ x: isArabic ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isArabic ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className={`md:hidden fixed top-0 bottom-0 w-[270px] bg-[#f3f4f6] dark:bg-[#0d0d0f] shadow-2xl z-50 flex flex-col ${
                isArabic
                  ? "right-0 border-l border-stone-200/70 dark:border-stone-800/50"
                  : "left-0 border-r border-stone-200/70 dark:border-stone-800/50"
              }`}
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="p-5 pb-2">
                <div className="flex items-center justify-between mb-8">
                  {/* Brand â€” text removed */}
                  <img src="/IH.png" alt="Logo" className="h-10 w-auto object-contain bg-transparent select-none" />                  <div className="flex items-center gap-2">
                    {canUseNotifications && (
                    <div className="relative" ref={notificationsButtonRef}>
                      <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors relative"
                        aria-label={t("common.notifications")}
                        type="button"
                      >
                        <Bell className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </button>

                      {isNotificationsOpen && (
                        <div
                          ref={notificationsRef}
                          className={`fixed top-[200px] sm:top-24 w-auto sm:w-72 md:w-80 bg-white dark:bg-stone-900 rounded-lg shadow-2xl border border-stone-200 dark:border-stone-800 z-[12050] ${
                            isArabic
                              ? "left-4 right-4 sm:left-0 sm:right-auto sm:ml-5"
                              : "left-4 right-4 sm:left-auto sm:right-0 sm:mr-5"
                          }`}
                          dir={isArabic ? "rtl" : "ltr"}
                        >
                          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{t("common.notifications")}</h3>
                            {unreadCount > 0 && onMarkAllAsRead && (
                              <button
                                onClick={() => {
                                  onMarkAllAsRead();
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                type="button"
                              >
                                {t("common.markAllAsRead")}
                              </button>
                            )}
                          </div>

                          <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                                {t("common.noNotifications")}
                              </div>
                            ) : (
                              notifications.map((notif) => (
                                <div
                                  key={notif.id}
                                  className={`p-3 border-b border-stone-100 dark:border-stone-800 last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer ${
                                    !notif.lu ? "bg-blue-50 dark:bg-blue-900/10" : ""
                                  }`}
                                  onClick={() => {
                                    const routePath = notif.routePath || undefined;
                                    handleNotificationClick(notif.id, routePath);
                                  }}
                                >
                                  <div className={`flex items-start justify-between gap-2 ${isArabic ? "flex-row-reverse text-right" : ""}`}>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-stone-900 dark:text-white break-words">
                                        {notif.titre}
                                      </p>
                                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                                        {notif.message}
                                      </p>
                                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                                        {formatTimeAgo(notif.createdAt)}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNotification(notif.id);
                                      }}
                                      className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors flex-shrink-0"
                                      type="button"
                                      aria-label={t("common.delete") || "Delete"}
                                    >
                                      <X className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                    type="button"
                  >
                    <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                  </button>
                </div>

                <div className="mb-2 px-2">
                  <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-600 uppercase tracking-widest">
                    {t("nav.navigation")}
                  </span>
                </div>

                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePath === item.to || activePath.startsWith(`${item.to}/`);
                    return (
                      <button
                        key={item.to}
                        onClick={() => handleNavigate(item.to)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "ikg-gradient-btn shadow-md"
                            : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50"
                        } ${isArabic ? "flex-row-reverse justify-end text-right" : ""}`}
                        type="button"
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white dark:text-black' : 'text-stone-500'}`} />
                        <span className="text-[13px] font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Settings */}
                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800/50">
                  <button
                    onClick={handleSettings}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                      activePath === "/settings"
                        ? "ikg-gradient-btn shadow-md"
                        : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50"
                    } ${isArabic ? "flex-row-reverse justify-end text-right" : ""}`}
                    type="button"
                  >
                    <GearSix className="w-4 h-4 shrink-0" />
                    <span className="text-[13px] font-medium">{t("nav.settings")}</span>
                  </button>
                </div>
              </div>

              {/* Profile Section at Bottom */}
              <div className="mt-auto p-4 border-t border-stone-100 dark:border-stone-800/50">
                <div className="bg-stone-100/60 dark:bg-stone-800/30 rounded-xl p-3 border border-stone-200/60 dark:border-stone-700/40">
                  <div className={`flex items-center gap-3 mb-3 ${isArabic ? "flex-row-reverse text-right" : ""}`}>
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-white dark:bg-stone-800">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-full h-full object-cover"
                          style={{ 
                            imageRendering: '-webkit-optimize-contrast',
                            willChange: 'transform'
                          }}
                          decoding="sync"
                        />
                      ) : (
                        <DefaultAvatar name={`${user.firstName} ${user.lastName}`} size="lg" className="w-full h-full" iconClassName="w-7 h-7" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-stone-900 dark:text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
                        {t(user.role === 'EMPLOYE' ? 'employee_role' : user.role === 'ADMIN' ? 'admin_role' : 'client_role')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLogout();
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-950/30 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                    type="button"
                  >
                    <SignOut className="w-3.5 h-3.5" />
                    {t("header.logout")}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
