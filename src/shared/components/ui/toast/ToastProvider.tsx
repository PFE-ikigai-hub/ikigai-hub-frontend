import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";


type PopupType = "default" | "success" | "error" | "warning" | "info";
type PopupId = string | number;

type PopupAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

type PopupOptions = {
  duration?: number;
  description?: string;
  action?: PopupAction;
  cancel?: PopupAction;
  actionButtonStyle?: React.CSSProperties;
};

type PopupItem = {
  id: PopupId;
  type: PopupType;
  message: string;
  description?: string;
  duration?: number;
  action?: PopupAction;
  cancel?: PopupAction;
  actionButtonStyle?: React.CSSProperties;
};

export type AppToast = ((message: string, options?: PopupOptions) => PopupId) & {
  success: (message: string, options?: PopupOptions) => PopupId;
  error: (message: string, options?: PopupOptions) => PopupId;
  warning: (message: string, options?: PopupOptions) => PopupId;
  info: (message: string, options?: PopupOptions) => PopupId;
  confirm: (
    message: string,
    options: {
      confirmLabel: string;
      onConfirm: () => void | Promise<void>;
      cancelLabel?: string;
      onCancel?: () => void;
      toastOptions?: PopupOptions;
    }
  ) => PopupId;
  dismiss: (id?: PopupId) => void;
};

const ToastContext = createContext<AppToast | null>(null);

function iconForType(type: PopupType) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "error":
      return <CircleAlert className="w-4 h-4 text-red-500" />;
    case "warning":
      return <TriangleAlert className="w-4 h-4 text-amber-500" />;
    case "info":
      return <Info className="w-4 h-4 text-indigo-500" />;
    default:
      return <Info className="w-4 h-4 text-stone-500 dark:text-stone-300" />;
  }
}

function borderClass(type: PopupType) {
  switch (type) {
    case "success":
      return "border-emerald-200/70 dark:border-emerald-500/25";
    case "error":
      return "border-red-200/70 dark:border-red-500/25";
    case "warning":
      return "border-amber-200/70 dark:border-amber-500/25";
    case "info":
      return "border-indigo-200/70 dark:border-indigo-500/25";
    default:
      return "border-stone-200/70 dark:border-white/10";
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PopupItem[]>([]);

  const dismiss = useCallback((id?: PopupId) => {
    if (typeof id === "undefined") {
      setItems([]);
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const push = useCallback(
    (type: PopupType, message: string, options?: PopupOptions): PopupId => {
      const id = `${Date.now()}-${Math.random()}`;
      const next: PopupItem = {
        id,
        type,
        message,
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
        cancel: options?.cancel,
        actionButtonStyle: options?.actionButtonStyle,
      };

      setItems((prev) => [next, ...prev].slice(0, 4));

      const hasActions = !!(options?.action || options?.cancel);
      if (!hasActions) {
        const duration = options?.duration ?? (type === "error" || type === "warning" ? 5200 : 4200);
        window.setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const toastApi = useMemo<AppToast>(() => {
    const base = ((message: string, options?: PopupOptions) => push("default", message, options)) as AppToast;
    base.success = (message, options) => push("success", message, options);
    base.error = (message, options) => push("error", message, options);
    base.warning = (message, options) => push("warning", message, options);
    base.info = (message, options) => push("info", message, options);
    base.confirm = (message, options) =>
      push("default", message, {
        ...(options.toastOptions ?? {}),
        action: {
          label: options.confirmLabel,
          onClick: options.onConfirm,
        },
        cancel: options.cancelLabel
          ? {
              label: options.cancelLabel,
              onClick: options.onCancel ?? (() => {}),
            }
          : undefined,
        duration: options.toastOptions?.duration ?? 6500,
      });
    base.dismiss = dismiss;
    return base;
  }, [dismiss, push]);

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,520px)] pointer-events-none">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto mb-3 rounded-2xl border ${borderClass(
                item.type
              )} bg-white/88 dark:bg-stone-900/78 backdrop-blur-xl shadow-xl shadow-stone-200/50 dark:shadow-black/35`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{iconForType(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{item.message}</p>
                    {item.description && (
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{item.description}</p>
                    )}
                    {(item.action || item.cancel) && (
                      <div className="mt-3 flex items-center gap-2">
                        {item.action && (
                          <button
                            onClick={async () => {
                              await item.action?.onClick();
                              dismiss(item.id);
                            }}
                            type="button"
                            style={item.actionButtonStyle}
                            className="px-3 h-8 rounded-lg text-xs font-semibold ikg-gradient-btn"
                          >
                            {item.action.label}
                          </button>
                        )}
                        {item.cancel && (
                          <button
                            onClick={() => {
                              item.cancel?.onClick();
                              dismiss(item.id);
                            }}
                            type="button"
                            className="px-3 h-8 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200"
                          >
                            {item.cancel.label}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(item.id)}
                    type="button"
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100/80 dark:hover:bg-stone-800/70"
                    aria-label="Close message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
