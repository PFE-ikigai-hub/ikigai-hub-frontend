// Ce fichier gere une partie du frontend.
import { useEffect, useRef, useState } from "react";
import {

  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { authApi, usersApi } from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { PageLoader } from "@/shared/components/feedback/PageLoader";
import { SecureDeleteModal } from "@/modules/admin/components/SecureDeleteModal";
import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";
import { Loadable, TableSkeleton } from "@/shared/components/skeleton";

type UserRole = "ADMIN" | "EMPLOYE" | "CLIENT";

type ManagedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: UserRole;
  status: "actif" | "inactif";
  createdAt: string;
  photoUrl?: string | null;
};

type UserFilters = {
  role: "" | UserRole | "all";
  status: "" | "actif" | "inactif" | "all";
  company: string;
  createdAt: string;
};

type NewUserData = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  company: string;
  status: "actif" | "inactif";
};

function getApiErrorMessage(err: any, fallback: string) {
  const message = err?.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

// Ce modal gere la creation rapide d'un nouvel utilisateur.
function AddUserModal({
  isOpen,
  onClose,
  onAddUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (payload: NewUserData) => void;
}) {
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "EMPLOYE" as UserRole,
    company: "",
  });

  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  // Cette validation verifie les champs minimum avant envoi.
  const validate = () => {
    const next: Partial<typeof formData> = {};
    if (!formData.email) next.email = t("error_email_required");
    return next;
  };

  // Cette action construit le payload puis ferme le modal.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const payload: NewUserData = {
      ...formData,
      status: "actif",
    };
    onAddUser(payload);
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      role: "EMPLOYE",
      company: "",
    });
    setErrors({});
    onClose();
  };

  // Cette action reinitialise le formulaire a la fermeture.
  const handleClose = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      role: "EMPLOYE",
      company: "",
    });
    setErrors({});
    onClose();
  };

  const roles: UserRole[] = ["EMPLOYE", "CLIENT"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">
                    {t("add_user_full")}
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    {t("create_new_account")}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    {t("email_star")}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    placeholder="email@example.com"
                    className={`w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm ${
                      errors.email ? "border-red-300 dark:border-red-800" : "border-stone-200 dark:border-stone-700"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                      {t("first_name_caps")}
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Marie"
                      className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                      {t("last_name_caps")}
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Dupont"
                      className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    {t("role_caps")}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {roles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                          formData.role === r
                            ? "bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-sm"
                            : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/30 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                        }`}
                      >
                        {formData.role === r && <Check className="w-3 h-3" />}
                        {r === "ADMIN" ? t("admin_role") : r === "EMPLOYE" ? t("employee_role") : t("client_role")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    {t("org_caps")}
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder={t("organisation")}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium  transition-colors shadow-sm"
                  >
                    {t("add_user")}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Ce modal affiche les details d'un utilisateur et ses actions de gestion.
function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onToggleStatus,
  onDeletePermanent,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  onUpdateUser: (userId: string, userData: Partial<ManagedUser>) => void;
  onToggleStatus: (userId: string, nextStatus: "actif" | "inactif") => Promise<boolean>;
  onDeletePermanent: (user: ManagedUser) => void;
}) {
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "EMPLOYE" as UserRole,
    company: "",
    status: "actif" as "actif" | "inactif",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cet effet recharge les donnees du formulaire quand on change d'utilisateur.
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: user.company,
        status: user.status,
      });
      setHasChanges(false);
      setSaveSuccess(false);
    }
  }, [user]);

  const handleChange = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((p) => ({ ...p, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const didToggle = formData.status !== user.status
      ? await onToggleStatus(user.id, formData.status)
      : true;
    if (!didToggle) return;

    onUpdateUser(user.id, formData as Partial<ManagedUser>);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleToggle = () => {
    if (!user) return;
    handleChange("status", formData.status === "actif" ? "inactif" : "actif");
  };

  const handleClose = () => {
    setHasChanges(false);
    setSaveSuccess(false);
    onClose();
  };

  const inputClass =
    "w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm";
  const labelClass =
    "block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide";

  const roles: UserRole[] = ["EMPLOYE", "CLIENT"];

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-3">
                  {(() => {
                    const avatar = (() => {
                      try {
                        const saved = localStorage.getItem(`ikigai-avatar-${user.id}`);
                        return saved || user.photoUrl || undefined;
                      } catch {
                        return user.photoUrl || undefined;
                      }
                    })();
                    return (
                      <DefaultAvatar
                        src={avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        size="lg"
                        className="shrink-0"
                      />
                    );
                  })()}
                  <div>
                    <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  aria-label={t("close")}
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl text-xs text-green-700 dark:text-green-400"
                    >
                      <Check className="w-4 h-4" />
                      {t("save_success")}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("email")}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("first_name")}</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("last_name")}</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("role_caps")}</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {roles.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleChange("role", r)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                            formData.role === r
                              ? "bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-sm"
                              : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/30 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                        >
                          {formData.role === r && <Check className="w-3 h-3" />}
                          {r === "ADMIN" ? t("admin_role") : r === "EMPLOYE" ? t("employee_role") : t("client_role")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t("organisation")}</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    className={inputClass}
                    placeholder={t("organisation")}
                  />
                </div>

                <AnimatePresence>
                  {hasChanges && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {t("unsaved_changes")}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-px bg-stone-100 dark:bg-stone-800/60" />

                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium  transition-colors shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    {t("save_changes")}
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleToggle}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      formData.status === "actif"
                        ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/30"
                        : "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/40 hover:bg-green-100 dark:hover:bg-green-950/30"
                    }`}
                  >
                    {formData.status === "actif" ? t("deactivate_account") : t("activate_account")}
                  </button>

                  <button
                    type="button"
                    onClick={() => user && onDeletePermanent(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("delete_permanently")}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("close")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Pagination(_props: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}) {
  const { t } = useI18n();
  const { currentPage, totalPages, onPageChange, itemsPerPage, totalItems } = _props;
  const tr = (key: string, fallback: string) => {
    const value = t(key);
    const resolved = value === key ? fallback : value;
    return resolved.replace(/_/g, " ");
  };

  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const getPageNumbers = () => {
    const pages: Array<number | "ellipsis"> = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      else if (currentPage >= totalPages - 2)
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 dark:border-stone-800/60 bg-white dark:bg-stone-900/50">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          {totalItems !== undefined && itemsPerPage !== undefined && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {tr("showing_results_prefix", "Showing ")}
              <span className="font-medium text-stone-900 dark:text-white">
                {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
              </span>
              {tr("showing_results_to", " to ")}
              <span className="font-medium text-stone-900 dark:text-white">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>
              {tr("showing_results_of", " of ")}
              <span className="font-medium text-stone-900 dark:text-white">{totalItems}</span>
              {tr("showing_results_suffix", " results")}
            </p>
          )}
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-l-xl px-2 py-2 text-stone-400 focus:z-20 focus:outline-offset-0 ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed bg-stone-50 dark:bg-stone-800/20"
                  : "hover:bg-stone-50 dark:hover:bg-stone-800/40 bg-white dark:bg-[#111113] ring-1 ring-inset ring-stone-200 dark:ring-stone-800"
              }`}
              type="button"
            >
              <span className="sr-only">{t("previous")}</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {getPageNumbers().map((page, index) => {
              if (page === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-300 ring-1 ring-inset ring-stone-200 dark:ring-stone-800 bg-white dark:bg-[#111113] focus:outline-offset-0"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </span>
                );
              }

              const isCurrent = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                    isCurrent
                      ? "z-10 ikg-gradient-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                      : "text-stone-900 dark:text-stone-300 ring-1 ring-inset ring-stone-200 dark:ring-stone-800 bg-white dark:bg-[#111113] hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                  type="button"
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-r-xl px-2 py-2 text-stone-400 focus:z-20 focus:outline-offset-0 ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed bg-stone-50 dark:bg-stone-800/20"
                  : "hover:bg-stone-50 dark:hover:bg-stone-800/40 bg-white dark:bg-[#111113] ring-1 ring-inset ring-stone-200 dark:ring-stone-800"
              }`}
              type="button"
            >
              <span className="sr-only">{t("next")}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { t, language } = useI18n();
  const { isFullyReady, user } = useAuth();
  const userDataCache = useRef<Record<string, any>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [deleteUserState, setDeleteUserState] = useState<{ isOpen: boolean; user: ManagedUser | null }>({
    isOpen: false,
    user: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    role: "",
    status: "",
    company: "",
    createdAt: "",
  });

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Cet effet charge la liste des utilisateurs selon la recherche et les filtres.
  useEffect(() => {
    if (!isFullyReady || !user) return;
    const cacheKey = `users-p${currentPage}-q${searchQuery}-r${filters.role}-s${filters.status}`;

    const fetchData = async () => {
      if (userDataCache.current[cacheKey]) {
        const cached = userDataCache.current[cacheKey];
        setUsers(cached.users);
        setTotalItems(cached.totalItems);
        if (refreshTrigger === 0) setLoading(false);
      } else {
        setLoading(true);
      }

      setError(null);
      try {
        const params: Record<string, unknown> = {
          page: currentPage - 1,
          size: ITEMS_PER_PAGE,
          sort: "id,desc",
        };
        if (searchQuery) params.search = searchQuery;
        if (filters.role && filters.role !== "all") params.role = filters.role;
        if (filters.status && filters.status !== "all") params.actif = filters.status === "actif";

        const response = await usersApi.list(params);
        const mapped: ManagedUser[] = (response.content ?? []).map((u) => ({
          id: String(u.id),
          firstName: u.prenom || "",
          lastName: u.nom || "",
          email: u.email || "",
          company: u.organisation || "",
          role: (u.role as UserRole) || "CLIENT",
          status: u.actif ? "actif" : "inactif",
          createdAt: u.dateCreation ? u.dateCreation.split("T")[0] : "",
          photoUrl: u.photoUrl,
        }));

        setUsers(mapped);
        setTotalItems(response.totalElements ?? mapped.length);
        userDataCache.current[cacheKey] = { users: mapped, totalItems: response.totalElements ?? mapped.length };
      } catch (err: any) {
        if (err?.response?.status !== 401) setError(getApiErrorMessage(err, t("common.error")));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isFullyReady, user?.id, currentPage, searchQuery, filters.role, filters.status, refreshTrigger, t, userDataCache]);

  if (!isFullyReady) {
    return <PageLoader minHeightClassName="min-h-[400px]" variant="table" />;
  }

  // Cette action cree un utilisateur via l'API puis rafraichit la liste.
  const handleAddUser = async (userData: NewUserData) => {
    try {
      await authApi.register({
        email: userData.email,
        motDePasse: "Temp1234!",
        nom: userData.lastName,
        prenom: userData.firstName,
        role: userData.role,
        organisation: userData.company,
      });
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(getApiErrorMessage(err, t("admin.users.createFailed")));
    }
  };

  // Cette action met a jour localement les donnees d'un utilisateur modifie.
  const handleUpdateUser = (userId: string, userData: Partial<ManagedUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...userData } : u)));
    Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
  };

  // Cette action active ou desactive un utilisateur puis recharge la liste.
  const handleToggleStatus = async (userId: string, nextStatus: "actif" | "inactif") => {
    try {
      const numericId = Number(userId);
      if (nextStatus === "inactif") await usersApi.deactivate(numericId);
      else await usersApi.activate(numericId);
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, t("common.error")));
      return false;
    }
  };

  // Cette action supprime definitivement un utilisateur apres confirmation.
  const handleDeleteUserPermanently = async (adminPassword?: string) => {
    if (!deleteUserState.user || !adminPassword) return;
    await usersApi.deletePermanent(Number(deleteUserState.user.id), adminPassword);
    Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
    setSelectedUser(null);
    setDeleteUserState({ isOpen: false, user: null });
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setFilters({ role: "", status: "", company: "", createdAt: "" });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const removeFilter = (filterKey: keyof UserFilters) => {
    setFilters((prev) => ({ ...prev, [filterKey]: "" }));
    setCurrentPage(1);
  };

  const filteredUsers = users.filter((u) => {
    if (filters.createdAt && u.createdAt !== filters.createdAt) return false;
    return true;
  });
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers;
  const activeFiltersCount = [filters.role, filters.status, filters.createdAt].filter((v) => v !== "").length;

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-900/40",
      EMPLOYE: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/40",
      CLIENT: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/40",
    };
    const labelMap: Record<string, string> = {
      ADMIN: t("admin_role"),
      EMPLOYE: t("employee_role"),
      CLIENT: t("client_role"),
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
          map[role] ?? "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
        }`}
      >
        {labelMap[role] ?? role}
      </span>
    );
  };

  const getStatusBadge = (status: string) =>
    status === "actif"
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400";

  const getLocale = () => (language === "AR" ? "fr-FR" : language === "EN" ? "en-US" : "fr-FR");

  const searchInputClass =
    "block w-full pl-12 pr-28 py-4 border border-stone-200 dark:border-stone-700 rounded-2xl bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 focus:border-stone-400 dark:focus:border-stone-600 text-base transition-all";
  const dateInputClass =
    "w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:outline-none focus:bg-white dark:focus:bg-stone-900 transition-all [color-scheme:light] dark:[color-scheme:dark]";

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl tracking-tight text-stone-900 dark:text-white">{t("users_management")}</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {totalItems} {totalItems === 1 ? t("users_count_one") : t("users_count_other")} {t("total")}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 ikg-gradient-btn rounded-xl  transition-colors text-sm font-medium shadow-sm"
          type="button"
        >
          <Plus className="w-4 h-4" />
          {t("add_user")}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 max-w-4xl mx-auto"
      >
        <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400 group-focus-within:text-stone-700 dark:group-focus-within:text-white transition-colors" />
          </div>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("search_placeholder")}
            className={searchInputClass}
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`relative h-9 px-3.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-md"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-700"
              }`}
              type="button"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{t("filter.apply")}</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-xl shadow-stone-100/60 dark:shadow-black/30 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("all_roles")}</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "", label: t("all_roles") },
                        { value: "ADMIN", label: t("admin_role") },
                        { value: "EMPLOYE", label: t("employee_role") },
                        { value: "CLIENT", label: t("client_role") },
                      ].map((r) => (
                        <button
                          key={r.value || "all"}
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, role: r.value as any }));
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${
                            (filters.role || "") === (r.value as any)
                              ? "ikg-gradient-btn border-stone-900 dark:border-white"
                              : "bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                          type="button"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("all_statuses")}</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "", label: t("all_statuses") },
                        { value: "actif", label: t("active") },
                        { value: "inactif", label: t("inactive") },
                      ].map((s) => (
                        <button
                          key={s.value || "all"}
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, status: s.value as any }));
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${
                            (filters.status || "") === (s.value as any)
                              ? "ikg-gradient-btn border-stone-900 dark:border-white"
                              : "bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                          type="button"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("created_at")}</label>
                    <input
                      type="date"
                      value={filters.createdAt}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, createdAt: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className={dateInputClass}
                    />
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 mb-2">
                      <Filter className="w-3.5 h-3.5" />
                      {t("active_filters")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filters.role && (
                        <button
                          onClick={() => removeFilter("role")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          type="button"
                        >
                          {filters.role === "ADMIN"
                            ? t("admin_role")
                            : filters.role === "EMPLOYE"
                              ? t("employee_role")
                              : filters.role === "CLIENT"
                                ? t("client_role")
                                : filters.role}{" "}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {filters.status && (
                        <button
                          onClick={() => removeFilter("status")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          type="button"
                        >
                          {filters.status === "actif" ? t("active") : t("inactive")} <X className="w-3 h-3" />
                        </button>
                      )}
                      {filters.createdAt && (
                        <button
                          onClick={() => removeFilter("createdAt")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          type="button"
                        >
                          {new Date(filters.createdAt).toLocaleDateString(getLocale())} <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("filter.reset")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 overflow-hidden"
      >
        <Loadable isLoading={loading} skeleton={<TableSkeleton rows={4} />}>
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-stone-800/60">
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {t("user")}
                    </th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {t("email")}
                    </th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {t("organisation")}
                    </th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {t("role")}
                    </th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {t("status")}
                    </th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {t("created_at")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {paginatedUsers.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b border-stone-50 dark:border-stone-800/30 hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors cursor-pointer group"
                        onClick={() => setSelectedUser(u)}
                      >
                        <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const avatar = (() => {
                              try {
                                const saved = localStorage.getItem(`ikigai-avatar-${u.id}`);
                                return saved || u.photoUrl || undefined;
                              } catch {
                                return u.photoUrl || undefined;
                              }
                            })();
                            return (
                              <DefaultAvatar
                                src={avatar}
                                alt={`${u.firstName} ${u.lastName}`}
                                size="md"
                                className="shrink-0"
                              />
                            );
                          })()}
                          <span className="text-sm font-medium text-stone-900 dark:text-white group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors">
                            {u.firstName} {u.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">{u.email}</td>
                      <td className="py-3.5 px-5 text-sm text-stone-700 dark:text-stone-300">{u.company}</td>
                      <td className="py-3.5 px-5">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(u.status)}`}>
                          {u.status === "actif" ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">
                        {new Date(u.createdAt).toLocaleDateString(getLocale())}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-stone-100 dark:divide-stone-800/40">
            <AnimatePresence initial={false}>
              {paginatedUsers.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="p-4 hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const avatar = (() => {
                          try {
                            const saved = localStorage.getItem(`ikigai-avatar-${u.id}`);
                            return saved || u.photoUrl || undefined;
                          } catch {
                            return u.photoUrl || undefined;
                          }
                        })();
                        return (
                          <DefaultAvatar
                            src={avatar}
                            alt={`${u.firstName} ${u.lastName}`}
                            size="sm"
                            className="shrink-0"
                          />
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusBadge(u.status)}`}>
                      {u.status === "actif" ? t("active") : t("inactive")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pl-12">
                    <span className="text-stone-500 dark:text-stone-400 truncate">{u.company}</span>
                    <span className="ml-2 shrink-0">{getRoleBadge(u.role)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </>
        </Loadable>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={totalItems}
          />
        )}
      </motion.div>

      <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddUser={handleAddUser} />

      <UserDetailsModal
        isOpen={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
        onUpdateUser={handleUpdateUser}
        onToggleStatus={handleToggleStatus}
        onDeletePermanent={(u) => {
          setSelectedUser(null);
          setDeleteUserState({ isOpen: true, user: u });
        }}
      />

      <SecureDeleteModal
        isOpen={deleteUserState.isOpen}
        onClose={() => setDeleteUserState({ isOpen: false, user: null })}
        title={t("delete_permanently")}
        description={t("delete_user_warning")}
        strongMode={true}
        onConfirm={handleDeleteUserPermanently}
      />
    </div>
  );
}
