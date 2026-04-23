import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "@/core/i18n/I18nProvider";
import { useAuth } from "@/core/auth/AuthProvider";


type SecureDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  strongMode: boolean;
  onConfirm: (adminPassword?: string) => Promise<void>;
  confirmLabel?: string;
  confirmButtonClassName?: string;
  checkTextA?: string;
  checkTextB?: string;
};

export function SecureDeleteModal({
  isOpen,
  onClose,
  title,
  description,
  strongMode,
  onConfirm,
  confirmLabel,
  confirmButtonClassName,
  checkTextA,
  checkTextB,
}: SecureDeleteModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmA, setConfirmA] = useState(false);
  const [confirmB, setConfirmB] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAdminPassword("");
      setConfirmA(false);
      setConfirmB(false);
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  const passwordLabel =
    user?.role === "ADMIN"
      ? t("admin_password_confirm")
      : user?.role === "EMPLOYE"
        ? t("employee_password_confirm")
        : t("client_password_confirm");

  const canSubmit = strongMode ? !!adminPassword && confirmA && confirmB && !submitting : !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(strongMode ? adminPassword : undefined);
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(typeof message === "string" ? message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/95 dark:bg-[#111113]/95 backdrop-blur-xl border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-lg pointer-events-auto"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 flex items-center justify-center">
                    {strongMode ? (
                      <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{title}</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{description}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {strongMode && (
                  <>
                    <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                      <input
                        type="checkbox"
                        checked={confirmA}
                        onChange={(e) => setConfirmA(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>{checkTextA ?? t("delete_strong_check_1")}</span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                      <input
                        type="checkbox"
                        checked={confirmB}
                        onChange={(e) => setConfirmB(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>{checkTextB ?? t("delete_strong_check_2")}</span>
                    </label>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                        {passwordLabel}
                      </label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm"
                        placeholder={passwordLabel}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="h-px bg-stone-100 dark:bg-stone-800/60" />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      confirmButtonClassName ?? "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {submitting ? t("loading") : (confirmLabel ?? t("delete_permanently"))}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
