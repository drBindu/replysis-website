"use client";

// Toast notifications for transient failures and confirmations.
//
// Two behaviours matter more than the visuals here:
//   - the same message cannot stack up (a retry loop firing every second must
//     not produce twenty identical toasts), and
//   - a toast clears itself once it is stale, so a recovered error does not sit
//     on screen implying the app is still broken.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { copyFor, type FailureKind } from "./messages";

type ToastTone = "error" | "info" | "success";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
};

type ToastInput = {
  tone?: ToastTone;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  /** Milliseconds on screen. Errors linger longer than confirmations. */
  duration?: number;
};

type ToastContextValue = {
  /** Show an arbitrary toast. */
  notify: (toast: ToastInput) => void;
  /** Show the house copy for a known failure. Preferred over `notify`. */
  notifyFailure: (kind: FailureKind, onRetry?: () => void) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 6000;
const ERROR_DURATION = 9000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    ({ tone = "error", title, body, action, duration }: ToastInput) => {
      // Identity is the message itself, so a repeated failure refreshes the
      // existing toast instead of adding another copy of it.
      const id = `${tone}:${title}:${body}`;

      setToasts((current) => {
        const withoutDuplicate = current.filter((t) => t.id !== id);
        const next: Toast = { id, tone, title, body, action };
        return [...withoutDuplicate, next].slice(-MAX_VISIBLE);
      });

      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);

      const ttl = duration ?? (tone === "error" ? ERROR_DURATION : DEFAULT_DURATION);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ttl)
      );
    },
    [dismiss]
  );

  const notifyFailure = useCallback(
    (kind: FailureKind, onRetry?: () => void) => {
      const copy = copyFor(kind);
      notify({
        tone: "error",
        title: copy.title,
        body: copy.body,
        action: copy.action && onRetry ? { label: copy.action, onClick: onRetry } : undefined,
      });
    },
    [notify]
  );

  // Clear pending timers if the provider itself unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ notify, notifyFailure, dismiss }),
    [notify, notifyFailure, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Returns a no-op implementation when no provider is mounted, so a component
 * that reports a failure can never itself throw and take the page down.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    notify: () => {},
    notifyFailure: () => {},
    dismiss: () => {},
  };
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      // Errors interrupt; anything else waits for a pause in speech.
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className="rounded-xl border bg-white p-4 text-left"
          style={{
            borderColor: toast.tone === "error" ? "#E3C8C0" : "#E9E7E0",
            boxShadow: "0 10px 30px rgba(22,21,15,0.12), 0 2px 8px rgba(22,21,15,0.06)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#16150F] mb-0.5">{toast.title}</p>
              <p className="text-[12.5px] text-[#4A4A41] leading-relaxed">{toast.body}</p>

              {toast.action && (
                <button
                  onClick={() => {
                    onDismiss(toast.id);
                    toast.action?.onClick();
                  }}
                  className="mt-2.5 text-[12.5px] font-semibold text-[#1C7A3E] hover:text-[#14532B] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C7A3E] rounded"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 -mt-1 -mr-1 w-7 h-7 flex items-center justify-center rounded-lg text-[#9A9C90] hover:text-[#16150F] hover:bg-[#F7F6F1] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C7A3E]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
