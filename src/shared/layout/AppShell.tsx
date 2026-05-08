import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { useNotifications } from "@/core/notifications/NotificationsProvider";
import type { UserRole } from "@/types/index";
import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import {

  UsersThreeIcon as UsersThree,
  FolderSimpleIcon as FolderSimple,
  FileTextIcon as FileText,
  FolderOpenIcon as FolderOpen,
  EyeIcon as Eye,
  CheckCircleIcon as CheckCircle,
  UploadSimpleIcon as UploadSimple,
  ChatsCircleIcon as ChatsCircle,
  SignOutIcon as SignOut,
  GearSixIcon as GearSix,
  SwapIcon as Swap,
  BellIcon as Bell,
  XIcon as X,
} from "@phosphor-icons/react";
import { MobileSidebar } from "./MobileSidebar";
import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";

type MenuItem = { to: string; labelKey: string; icon: React.ElementType };

const menuByRole: Record<UserRole, MenuItem[]> = {
  ADMIN: [
    { to: "/admin/users", labelKey: "nav.users", icon: UsersThree },
    { to: "/admin/projects", labelKey: "nav.projects", icon: FolderSimple },
    { to: "/admin/deliverables", labelKey: "deliverables.title", icon: FileText },
  ],
  CLIENT: [
    { to: "/client/dashboard", labelKey: "nav.myProjects", icon: FolderOpen },
    { to: "/client/review", labelKey: "nav.inReview", icon: Eye },
    { to: "/client/validated", labelKey: "nav.validated", icon: CheckCircle },
  ],
  EMPLOYE: [
    { to: "/employee/dashboard", labelKey: "employee.assignedProjects", icon: FolderSimple },
    { to: "/employee/upload", labelKey: "employee.uploadDeliverable", icon: UploadSimple },
    { to: "/employee/feedback", labelKey: "employee.feedbackTitle", icon: ChatsCircle },
  ],
};

// Cette fonction masque la navigation sur certaines pages immersives.
function shouldHideNavigation(pathname: string): boolean {
  if (/^\/client\/review\/[^/]+$/.test(pathname)) return true;
  return false;
}

// Ce hook reconstruit l'URL de l'avatar avec anti-cache si necessaire.
function useAvatarWithTimestamp(userId: string | undefined, photoUrl: string | undefined | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(photoUrl || undefined);
  
  useEffect(() => {
    if (!userId) return;
    
    const avatarKey = `ikigai-avatar-${userId}`;
    const timestampKey = `ikigai-avatar-ts-${userId}`;
    
    try {
      const stored = localStorage.getItem(avatarKey);
      const timestamp = localStorage.getItem(timestampKey);
      
      if (stored) {
        if (stored.startsWith('data:')) {
          setAvatarUrl(stored);
        } else {
          const cacheBuster = timestamp || Date.now().toString();
          setAvatarUrl(`${stored}?t=${cacheBuster}`);
        }
      } else if (photoUrl) {
        setAvatarUrl(photoUrl);
      } else {
        setAvatarUrl(undefined);
      }
    } catch {
      setAvatarUrl(photoUrl || undefined);
    }
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === avatarKey || e.key === timestampKey) {
        try {
          const newStored = localStorage.getItem(avatarKey);
          const newTimestamp = localStorage.getItem(timestampKey);
          if (newStored) {
            if (newStored.startsWith('data:')) {
              setAvatarUrl(newStored);
            } else {
              setAvatarUrl(`${newStored}?t=${newTimestamp || Date.now()}`);
            }
          } else {
            setAvatarUrl(photoUrl || undefined);
          }
        } catch {
          setAvatarUrl(photoUrl || undefined);
        }
      }
    };
    const handleAvatarUpdated = () => {
      try {
        const newStored = localStorage.getItem(avatarKey);
        const newTimestamp = localStorage.getItem(timestampKey);
        if (newStored) {
          if (newStored.startsWith('data:')) {
            setAvatarUrl(newStored);
          } else {
            setAvatarUrl(`${newStored}?t=${newTimestamp || Date.now()}`);
          }
        } else {
          setAvatarUrl(photoUrl || undefined);
        }
      } catch {
        setAvatarUrl(photoUrl || undefined);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('avatar-updated', handleAvatarUpdated);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('avatar-updated', handleAvatarUpdated);
    };
  }, [userId, photoUrl]);
  
  return avatarUrl;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { t, language } = useI18n();
  const isArabic = language === "AR";
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const showNotifications = user?.role !== "ADMIN";
  
  // Cet effet ferme les panneaux ouverts quand on clique a l'exterieur.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileExpanded(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isProfileExpanded || isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen, isProfileExpanded]);

  // Cet avatar est recalculé avec anti-cache pour refléter les changements en direct.
  const avatarUrl = useAvatarWithTimestamp(user?.id, user?.photoUrl);

  const hideNavigation = shouldHideNavigation(location.pathname);

  if (!user) return <Outlet />;

  const menu = menuByRole[user.role as UserRole] || [];

  // Cette action navigue vers une page du menu.
  const handleNavigate = (to: string) => {
    navigate(to);
  };

  // Cette action deconnecte l'utilisateur puis le renvoie au login.
  const handleLogout = async () => {
    setIsProfileExpanded(false);
    setIsNotificationsOpen(false);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // Cette action marque une notification comme lue puis ouvre sa destination.
  const handleNotificationClick = async (id: number, routePath?: string | null) => {
    try {
      await markAsRead(id);
    } catch {
    }
    setIsNotificationsOpen(false);
    if (routePath) {
      navigate(routePath);
    }
  };

  // Cette fonction transforme une date ISO en libelle court pour l'interface.
  const formatTimeAgo = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t("time.now");
    if (diffMins < 60) return `${diffMins} ${t("time.min")}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t("time.h")}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ${t("time.d")}`;
    
    const localeMap: Record<string, string> = { FR: 'fr-FR', EN: 'en-US', AR: 'fr-FR' };
    return date.toLocaleDateString(localeMap[language] || 'fr-FR');
  };

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen bg-white dark:bg-[#0a0a0b] transition-colors duration-300 overflow-hidden">
      {!hideNavigation && (
      <aside className="w-20 h-full bg-[#f3f4f6] dark:bg-[#0d0d0f] border-r border-stone-200/70 dark:border-stone-800/50 hidden md:flex flex-col transition-all z-30 shrink-0">
        <div className="flex flex-col h-full px-4 py-6">
          <div className="flex items-center justify-center mb-2">
            <img src="/IH.png" alt="Logo" className="w-11 h-11 object-contain bg-transparent select-none" />
          </div>
          <div className="flex-1 flex flex-col pt-0">

            <nav className="space-y-1">
              {menu.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath.startsWith(item.to);
                return (
                  <button
                    key={item.to}
                    onClick={() => handleNavigate(item.to)}
                    className={`relative w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'text-stone-900 dark:text-white'
                        : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute w-10 h-10 bg-white dark:bg-stone-800 shadow-sm border border-stone-200/60 dark:border-stone-700/50 rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-[10000] flex items-center justify-center">
                      <Icon
                        className={`w-5 h-5 transition-colors shrink-0 ${
                          isActive
                            ? "text-stone-900 dark:text-white"
                            : "text-stone-500 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200"
                        }`}
                      />
                      <div
                        className={`absolute px-2 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-semibold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-[10001] pointer-events-none ring-1 ring-black dark:ring-white uppercase tracking-wide ${
                          isArabic
                            ? "right-[calc(100%+16px)] translate-x-[8px] group-hover:translate-x-0"
                            : "left-[calc(100%+16px)] translate-x-[-8px] group-hover:translate-x-0"
                        }`}
                      >
                        {t(item.labelKey)}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 border-[6px] border-transparent ${
                            isArabic
                              ? "-right-1.5 border-l-black dark:border-l-white"
                              : "-left-1.5 border-r-black dark:border-r-white"
                          }`}
                        ></div>
                      </div>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto">
            </div>
          </div>
          <div className="pt-4 mt-4">
            {showNotifications && (
            <div className="relative mb-2" ref={notificationsRef}>
              {isNotificationsOpen && (
                <div
                  className={`absolute bottom-[calc(100%+12px)] w-80 max-h-[380px] bg-white dark:bg-stone-900 rounded-xl shadow-2xl shadow-stone-300/40 dark:shadow-black/70 border border-stone-200 dark:border-stone-700/60 overflow-hidden py-1.5 z-[12050] isolate ${
                    isArabic ? "right-0 text-right" : "left-0"
                  }`}
                  dir={isArabic ? "rtl" : "ltr"}
                >
                  <div className="px-3 py-2 mb-1 border-b border-stone-100 dark:border-stone-800/60 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">{t("common.notifications")}</p>
                      <p className="text-[12px] text-stone-600 dark:text-stone-300">{unreadCount} {t("common.unread") || "unread"}</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-[11px] px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                      >
                        {t("common.markAllAsRead")}
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-auto px-1">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-8 text-center text-[12px] text-stone-500 dark:text-stone-400">
                        {t("common.noNotifications")}
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationClick(item.id, item.routePath)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                            item.lu
                              ? "bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800"
                              : "bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Bell className={`w-4 h-4 mt-0.5 ${item.lu ? "text-stone-400" : "text-indigo-500"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-stone-800 dark:text-stone-100 truncate">{item.titre}</p>
                              <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-2">{item.message}</p>
                              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">{formatTimeAgo(item.createdAt)}</p>
                            </div>
                            <span
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={async (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                try {
                                  await deleteNotification(item.id);
                                } catch {
                                }
                              }}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-md text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                              role="button"
                              aria-label="Supprimer la notification"
                            >
                              <X className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors relative"
              >
                <Bell className="w-5 h-5 text-stone-500 dark:text-stone-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-4 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            )}
            <div className="relative" ref={profileRef}>
              {isProfileExpanded && (
                <div
                  className={`absolute bottom-[calc(100%+12px)] w-56 bg-white dark:bg-stone-900 rounded-xl shadow-2xl shadow-stone-200/40 dark:shadow-black/70 border border-stone-200 dark:border-stone-700/60 overflow-hidden py-1.5 z-[12040] ${
                    isArabic ? "right-0 text-right" : "left-0"
                  }`}
                  dir={isArabic ? "rtl" : "ltr"}
                >
                    <div className="px-3 py-2 mb-1 border-b border-stone-100 dark:border-stone-800/60">
                      <p className="text-[11px] text-stone-400 dark:text-stone-500">{t('account.profile')}</p>
                      <p className="text-[13px] font-medium text-stone-900 dark:text-white truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => { navigate('/settings'); setIsProfileExpanded(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                        isArabic ? "flex-row-reverse justify-end" : ""
                      }`}
                    >
                      <GearSix className="w-3.5 h-3.5 text-stone-400" />
                      {t('nav.settings')}
                    </button>

                    <div className="h-px bg-stone-100 dark:bg-stone-800/60 my-1 mx-3" />

                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors ${
                        isArabic ? "flex-row-reverse justify-end" : ""
                      }`}
                    >
                      <SignOut className="w-3.5 h-3.5" />
                      {t('header.logout')}
                    </button>
                  </div>
                )}

              <button
                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                className="w-full flex items-center justify-center p-2 rounded-xl bg-transparent border-transparent"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-white dark:bg-stone-800">
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
                    <DefaultAvatar name={`${user.firstName} ${user.lastName}`} size="md" className="w-full h-full" iconClassName="w-6 h-6" />
                  )}
                </div>
                <div className="hidden">
                  <p className="text-[13px] font-semibold text-stone-800 dark:text-white truncate">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <Swap className="hidden" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <main className="flex-1 overflow-auto relative scroll-smooth">
          <Outlet />
          {!hideNavigation && (
            <MobileSidebar
              menuItems={menu.map((m) => ({ to: m.to, label: t(m.labelKey), icon: m.icon }))}
              activePath={currentPath}
              user={user}
              language={language}
              onNavigate={(to) => handleNavigate(to)}
              onOpenSettings={() => navigate("/settings")}
              onLogout={handleLogout}
              t={t}
              notifications={showNotifications ? notifications : []}
              unreadCount={showNotifications ? unreadCount : 0}
              onNotificationClick={showNotifications ? (id, routePath) => handleNotificationClick(id, routePath) : undefined}
              onDeleteNotification={showNotifications ? (id) => deleteNotification(id) : undefined}
              onMarkAllAsRead={showNotifications ? () => markAllAsRead() : undefined}
              formatTimeAgo={formatTimeAgo}
            />
          )}
        </main>
      </div>
    </div>
  );
}

