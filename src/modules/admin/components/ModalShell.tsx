import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";


export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidthClassName = "max-w-lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
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
              className={`bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto pointer-events-auto`}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{title}</h2>
                  {description && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

