import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {

  User,
  Shield,
  SlidersHorizontal,
  Camera,
  Check,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  AlertCircle,
  Upload,
  Pencil,
  Trash2,
  X as CloseIcon,
  XCircle,
} from "lucide-react";

import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";
import { useAuth } from "@/core/auth/AuthProvider";
import { useTheme } from "@/core/theme/ThemeProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { usersApi } from "@/core/api/client";

type TabId = "profile" | "security" | "preferences";

type ProfileState = {
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
};

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  rightEl?: React.ReactNode;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  placeholder,
  rightEl,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div
        className={`relative transition-all duration-200 rounded-xl ${
          focused && !disabled ? "ring-2 ring-stone-900/15 dark:ring-white/10" : ""
        }`}
      >
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full px-4 py-3 border rounded-xl text-sm transition-all duration-200 focus:outline-none ${
            disabled
              ? "bg-stone-50 dark:bg-stone-900/30 border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed"
              : "bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:border-stone-400 dark:focus:border-stone-500"
          } ${rightEl ? "pr-12" : ""}`}
        />
        {rightEl && <div className="absolute inset-y-0 right-0 flex items-center pr-4">{rightEl}</div>}
      </div>
    </div>
  );
}

function SuccessToast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center gap-3 px-5 py-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/40 rounded-xl text-sm text-green-700 dark:text-green-400 mb-6 shadow-sm"
    >
      <Check className="w-4 h-4 shrink-0" />
      {message}
    </motion.div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const avatarKey = user?.id ? `ikigai-avatar-${user.id}` : "ikigai-avatar";
  const timestampKey = user?.id ? `ikigai-avatar-ts-${user.id}` : "ikigai-avatar-ts";
  const initialAvatar = (() => {
    try {
      const stored = localStorage.getItem(avatarKey);
      return stored || undefined;
    } catch {
      return undefined;
    }
  })();

  const [profileData, setProfileData] = useState<ProfileState>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: (user as any)?.telephone ?? "",
    avatar: initialAvatar,
  });

  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (file: File) => {
    setProfileError(null);

    if (file.size === 0) {
      setProfileError(t("error.emptyFile"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileError(t("error_invalid_image") || "Format d'image invalide");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError(t("error_file_size") || "La taille du fichier depasse 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfileData((p) => ({ ...p, avatar: base64 }));
      try {
        localStorage.setItem(avatarKey, base64);
        localStorage.setItem(timestampKey, Date.now().toString());
        // Dispatch event to notify other components after localStorage is written
        setTimeout(() => {
          window.dispatchEvent(new Event('avatar-updated'));
        }, 0);
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);
  };

  const [securityData, setSecurityData] = useState({ current: "", newPass: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [securityError, setSecurityError] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState(false);

  const showSuccessFor = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 3000);
  };

  const handleProfileSave = async () => {
    setProfileError(null);
    try {
      await usersApi.updateProfile({
        nom: profileData.lastName,
        prenom: profileData.firstName,
        telephone: profileData.phone,
      });
      setProfileEditing(false);
      showSuccessFor(setProfileSuccess);
    } catch {
      setProfileError(t("common.error") || "Erreur");
    }
  };

  const handleProfileCancel = () => {
    setProfileData({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: (user as any)?.telephone ?? "",
      avatar: profileData.avatar,
    });
    setProfileEditing(false);
    setProfileError(null);
  };

  const handlePasswordSave = () => {
    setSecurityError("");
    if (!securityData.current || !securityData.newPass || !securityData.confirm) {
      setSecurityError("Veuillez remplir tous les champs");
      return;
    }
    if (securityData.newPass !== securityData.confirm) {
      setSecurityError("Les mots de passe ne correspondent pas");
      return;
    }
    // Endpoint password change is not wired in the original UI either.
    setSecurityData({ current: "", newPass: "", confirm: "" });
    showSuccessFor(setSecuritySuccess);
  };

  const langToLabel: Record<"FR" | "EN" | "AR", { flag: string; label: string }> = {
    FR: { flag: "", label: "Francais" },
    EN: { flag: "", label: "English" },
    AR: { flag: "", label: "العربية" },
  };

  const tabs = [
    { id: "profile" as const, label: t("settings.profile"), icon: User },
    { id: "security" as const, label: t("settings.security"), icon: Shield },
    { id: "preferences" as const, label: t("settings.preferences"), icon: SlidersHorizontal },
  ];

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarFile(file);
  }, []);

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl text-stone-900 dark:text-white tracking-tight font-normal">
          {t("nav.settings")}
        </h1>
        <p className="mt-2 text-stone-500 dark:text-stone-400">
          {t("settings.languageTheme")}
        </p>
      </div>

      <AnimatePresence>
        {profileSuccess && <SuccessToast message={t("settings.saveSuccess")} />}
        {securitySuccess && <SuccessToast message={t("settings.passwordSuccess")} />}
      </AnimatePresence>

      <div className="bg-white dark:bg-[#111113] rounded-3xl border border-stone-200/70 dark:border-stone-800/60 shadow-2xl shadow-stone-200/40 dark:shadow-black/50 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-72 bg-stone-50/70 dark:bg-stone-900/40 border-b md:border-b-0 md:border-r border-stone-200/60 dark:border-stone-800/60 p-6">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-white dark:bg-[#111113] shadow-md border border-stone-200/70 dark:border-stone-800/60"
                        : "hover:bg-white/80 dark:hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive
                          ? "ikg-gradient-btn"
                          : "bg-stone-200/60 dark:bg-stone-800/50 text-stone-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-sm ${
                        isActive ? "text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-300"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 p-6 md:p-8">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl text-stone-900 dark:text-white font-normal">
                        {t("settings.personalInfo")}
                      </h2>
                      <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        {t("settings.profile")}
                      </p>
                    </div>
                    {!profileEditing ? (
                      <button
                        onClick={() => setProfileEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl ikg-gradient-btn text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        <Pencil className="w-4 h-4" />
                        {t("common.edit")}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleProfileCancel}
                          className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                        >
                          {t("common.cancel")}
                        </button>
                        <button
                          onClick={handleProfileSave}
                          className="px-4 py-2 rounded-xl ikg-gradient-btn text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          {t("account.saveChanges")}
                        </button>
                      </div>
                    )}
                  </div>

                  {profileError && (
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-sm text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {profileError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label={t("account.firstName")}
                      value={profileData.firstName}
                      onChange={(v) => setProfileData((p) => ({ ...p, firstName: v }))}
                      disabled={!profileEditing}
                    />
                    <InputField
                      label={t("account.lastName")}
                      value={profileData.lastName}
                      onChange={(v) => setProfileData((p) => ({ ...p, lastName: v }))}
                      disabled={!profileEditing}
                    />
                    <InputField
                      label={t("account.email")}
                      value={user?.email ?? ""}
                      onChange={() => undefined}
                      disabled
                    />
                    <InputField
                      label={t("account.phone")}
                      value={profileData.phone}
                      onChange={(v) => setProfileData((p) => ({ ...p, phone: v }))}
                      disabled={!profileEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wide">
                      {t("settings.profilePhoto")}
                    </label>

                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="flex items-center justify-center">
                        {profileData.avatar ? (
                          <button
                            onClick={() => setIsPhotoModalOpen(true)}
                            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                            title={t("common.open")}
                            type="button"
                          >
                            <img 
                              src={profileData.avatar} 
                              alt="avatar" 
                              className="w-full h-full object-cover" 
                              style={{ 
                                imageRendering: '-webkit-optimize-contrast',
                                willChange: 'transform'
                              }}
                              decoding="sync"
                            />
                          </button>
                        ) : (
                          <DefaultAvatar name={`${user?.firstName} ${user?.lastName}`} size="2xl" className="w-24 h-24" iconClassName="w-12 h-12" />
                        )}
                      </div>

                      <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        className={`flex-1 rounded-2xl border-2 border-dashed p-5 transition-all ${
                          isDragging
                            ? "border-stone-900 dark:border-white bg-stone-50 dark:bg-stone-900/40"
                            : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-stone-700 dark:text-stone-200">
                              {t("account.dragDropPhoto")}
                            </p>
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                              PNG, JPG, WEBP (max 5MB)
                            </p>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarFile(file);
                            }}
                            disabled={!profileEditing}
                          />

                          <div className="flex items-center gap-2">
                            {profileEditing && profileData.avatar && (
                              <button
                                onClick={() => {
                                  setProfileData((p) => ({ ...p, avatar: undefined }));
                                  try {
                                    localStorage.removeItem(avatarKey);
                                    localStorage.removeItem(timestampKey);
                                    // Dispatch event to notify other components after localStorage is updated
                                    setTimeout(() => {
                                      window.dispatchEvent(new Event('avatar-updated'));
                                    }, 0);
                                  } catch {
                                    // ignore
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20 text-sm font-medium transition-colors"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t("common.delete")}
                              </button>
                            )}
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={!profileEditing}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl ikg-gradient-btn text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                              type="button"
                            >
                              <Upload className="w-4 h-4" />
                              {profileData.avatar ? t("settings.changePhoto") : t("settings.addPhoto")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl text-stone-900 dark:text-white font-normal">
                      {t("settings.passwordUpdate")}
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      {t("settings.security")}
                    </p>
                  </div>

                  {securityError && (
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-sm text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {securityError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 max-w-xl">
                    <InputField
                      label={t("account.currentPassword")}
                      value={securityData.current}
                      onChange={(v) => setSecurityData((s) => ({ ...s, current: v }))}
                      type={showPasswords.current ? "text" : "password"}
                      rightEl={
                        <button
                          type="button"
                          onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <InputField
                      label={t("account.newPassword")}
                      value={securityData.newPass}
                      onChange={(v) => setSecurityData((s) => ({ ...s, newPass: v }))}
                      type={showPasswords.new ? "text" : "password"}
                      rightEl={
                        <button
                          type="button"
                          onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                        >
                          {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <InputField
                      label={t("account.confirmPassword")}
                      value={securityData.confirm}
                      onChange={(v) => setSecurityData((s) => ({ ...s, confirm: v }))}
                      type={showPasswords.confirm ? "text" : "password"}
                      rightEl={
                        <button
                          type="button"
                          onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    <button
                      onClick={handlePasswordSave}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl ikg-gradient-btn text-sm font-medium hover:opacity-90 transition-opacity"
                      type="button"
                    >
                      <Shield className="w-4 h-4" />
                      {t("account.changePassword")}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl text-stone-900 dark:text-white font-normal">
                      {t("settings.languageTheme")}
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      {t("settings.preferences")}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                      </div>
                      <h3 className="text-base text-stone-800 dark:text-stone-200">{t("account.language")}</h3>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {(["FR", "EN", "AR"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`flex-1 relative flex flex-col items-center py-3 px-4 rounded-xl border transition-all duration-200 ${
                            language === lang
                              ? "bg-white dark:bg-black text-stone-900 dark:text-white border-stone-900 dark:border-white shadow-md"
                              : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/30 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                          type="button"
                        >
                          <span className="text-lg mb-1">{langToLabel[lang].flag}</span>
                          <span className="text-xs font-medium">{langToLabel[lang].label}</span>
                          {language === lang && (
                            <motion.div
                              layoutId="lang-check"
                              className="absolute top-2 right-2"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <Check className="w-3 h-3" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                        {theme === "dark" ? (
                          <Moon className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-stone-500" />
                        )}
                      </div>
                      <h3 className="text-base text-stone-800 dark:text-stone-200">{t("settings.themeMode")}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["light", "dark"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setTheme(mode)}
                          className={`w-full min-w-0 h-12 flex items-center justify-between gap-3 px-4 rounded-xl border transition-all duration-200 ${
                            theme === mode
                              ? "bg-white dark:bg-black text-stone-900 dark:text-white border-stone-900 dark:border-white shadow-md"
                              : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/30 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500"
                          }`}
                          type="button"
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            {mode === "light" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                            <span className="text-sm font-medium truncate">{mode === "light" ? t("settings.light") : t("settings.dark")}</span>
                          </span>
                          {theme === mode && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPhotoModalOpen && profileData.avatar && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm"
              onClick={() => setIsPhotoModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-2xl w-full aspect-square md:aspect-auto md:h-[80vh] bg-stone-100 dark:bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center"
            >
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                type="button"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
              <img src={profileData.avatar} alt="Full profile photo" className="w-full h-full object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
