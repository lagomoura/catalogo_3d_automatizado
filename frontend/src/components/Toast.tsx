import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "ok" | "info" | "warn";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastInput {
  kind?: ToastKind;
  message: string;
  action?: ToastAction;
  /** Tiempo en ms antes de auto-cerrar. Default 4000. 0 = no auto-cerrar. */
  duration?: number;
}

interface ToastContextValue {
  push: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook que devuelve el API para empujar toasts a la cola global.
 * Si se usa fuera de un `<ToastProvider>` devuelve un fallback no-op
 * (no rompe — el llamador puede invocarlo sin chequear).
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { push: () => -1, dismiss: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      idRef.current += 1;
      const id = idRef.current;
      const toast: Toast = {
        id,
        kind: input.kind ?? "ok",
        message: input.message,
        action: input.action,
      };
      setToasts((curr) => [...curr, toast]);
      const duration = input.duration ?? 4000;
      if (duration > 0) {
        const handle = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  // Cleanup de timers pendientes al desmontar el provider.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((handle) => window.clearTimeout(handle));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notificaciones">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.kind}`}
          role={t.kind === "warn" ? "alert" : "status"}
          aria-live={t.kind === "warn" ? "assertive" : "polite"}
        >
          <span className="toast__message">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action!.onClick();
                onDismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            aria-label="Cerrar notificación"
            onClick={() => onDismiss(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
