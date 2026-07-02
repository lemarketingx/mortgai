/**
 * FINZO Toast / Notification — Design System v1.0
 * Variants: info (default) | success | warning | danger
 *
 * Rules:
 * - border-inline-start 4px in semantic color
 * - Auto-dismiss 6s, dismissible
 * - Max 480px wide
 * - Position: bottom-start desktop / top-start mobile
 *
 * Usage:
 *   const { toasts, addToast, removeToast } = useToast();
 *   <ToastContainer toasts={toasts} onRemove={removeToast} />
 *   addToast({ title: "שמרנו", variant: "success" });
 */

import { useState, useCallback, useEffect, useId } from "react";

/* ------------------------------------------------------------------ */
/*  SINGLE TOAST                                                        */
/* ------------------------------------------------------------------ */

const VARIANT_STYLES = {
  info:    { border: "border-pro-cobalt",   icon: "bg-pro-cobalt-l text-pro-cobalt-d",  char: "i" },
  success: { border: "border-success-600",  icon: "bg-success-50 text-success-700",     char: "✓" },
  warning: { border: "border-warning-500",  icon: "bg-warning-50 text-warning-700",     char: "!" },
  danger:  { border: "border-danger-500",   icon: "bg-danger-50 text-danger-700",       char: "✕" },
};

export function Toast({ id, title, description, variant = "info", onRemove }) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info;

  useEffect(() => {
    const t = setTimeout(() => onRemove(id), 6000);
    return () => clearTimeout(t);
  }, [id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`grid grid-cols-[28px_1fr_auto] gap-[14px] items-center px-[18px] py-[14px] bg-pro-white border border-pro-line border-s-4 ${styles.border} rounded-pro-md shadow-pro-3 max-w-[480px] w-full animate-[slideUp_200ms_ease-out]`}
    >
      {/* Icon */}
      <span className={`w-7 h-7 rounded-pro-sm grid place-items-center font-mono text-[13px] font-semibold shrink-0 ${styles.icon}`}>
        {styles.char}
      </span>

      {/* Body */}
      <div className="min-w-0">
        {title && <p className="font-semibold text-[14px] text-pro-ink mb-[2px]">{title}</p>}
        {description && <p className="text-[12.5px] text-pro-ink-2">{description}</p>}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="w-6 h-6 rounded-pro-sm text-pro-mute hover:text-pro-ink transition-colors grid place-items-center shrink-0"
        aria-label="סגור"
      >
        ✕
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST CONTAINER                                                     */
/* ------------------------------------------------------------------ */

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts?.length) return null;
  return (
    <div
      aria-label="התראות"
      className="fixed bottom-4 start-4 z-[300] flex flex-col gap-2 md:bottom-6 md:start-6 sm:top-4 sm:bottom-auto"
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  useToast HOOK                                                       */
/* ------------------------------------------------------------------ */

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, variant = "info" }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
