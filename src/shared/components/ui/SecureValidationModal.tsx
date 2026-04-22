import { useEffect, useState } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "@/core/i18n/I18nProvider";

type SecureValidationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  deliverableName?: string;
};

export function SecureValidationModal({ isOpen, onClose, onConfirm, deliverableName }: SecureValidationModalProps) {
  const { t } = useI18n();
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );
  const [password, setPassword] = useState("");
  const [confirmA, setConfirmA] = useState(false);
  const [confirmB, setConfirmB] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setConfirmA(false);
      setConfirmB(false);
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  const canSubmit = !!password && confirmA && confirmB && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(password);
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
            initial={isMobileViewport ? false : { opacity: 0 }}
            animate={isMobileViewport ? undefined : { opacity: 1 }}
            exit={isMobileViewport ? undefined : { opacity: 0 }}
            transition={isMobileViewport ? undefined : { duration: 0.2 }}
            className={`fixed inset-0 z-50 ${isMobileViewport ? "bg-black/45" : "bg-black/40 backdrop-blur-sm"}`}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={isMobileViewport ? false : { opacity: 0, scale: 0.96, y: 16 }}
              animate={isMobileViewport ? undefined : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobileViewport ? undefined : { opacity: 0, scale: 0.96, y: 16 }}
              transition={isMobileViewport ? undefined : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full max-w-lg pointer-events-auto border rounded-2xl ${
                isMobileViewport
                  ? "bg-white dark:bg-[#111113] border-stone-200 dark:border-stone-800 shadow-lg"
                  : "bg-white/95 dark:bg-[#111113]/95 backdrop-blur-xl border-stone-200/70 dark:border-stone-800/60 shadow-2xl shadow-stone-200/40 dark:shadow-black/60"
              }`}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{t("validation.title")}</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t("validation.secureMessage")}</p>
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
                {deliverableName && (
                  <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700">
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                      <span className="font-medium">{t("deliverables.name")}:</span> {deliverableName}
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={confirmA}
                    onChange={(e) => setConfirmA(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{t("validation.strongCheck1")}</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={confirmB}
                    onChange={(e) => setConfirmB(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{t("validation.strongCheck2")}</span>
                </label>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    {t("user_password_confirm")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm"
                    placeholder={t("user_password_confirm")}
                  />
                </div>

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
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {submitting ? t("loading") : t("validation.confirm")}
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
