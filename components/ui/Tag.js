/**
 * FINZO Tags · Pills · Status — Design System v1.0
 *
 * Tag — lead taxonomy badges (first-purchase, refi, upgrade, hot, exclusive)
 * Pill — filter chips with optional count badge
 * StatusDot — lead pipeline status indicator (new/progress/docs/won/lost)
 */

/* ------------------------------------------------------------------ */
/*  TAG                                                                 */
/* ------------------------------------------------------------------ */

const TAG_BASE = "inline-flex items-center gap-[6px] font-mono text-[11.5px] px-[10px] py-[5px] rounded-pro-sm tracking-[0.04em]";

const TAG_VARIANTS = {
  default:   "bg-pro-cream text-pro-ink-2",
  first:     "bg-pro-cobalt-l text-pro-cobalt-d",
  refi:      "bg-pro-coral/10 text-pro-coral",
  upgrade:   "bg-success-50 text-success-700",
  hot:       "bg-pro-cobalt text-white",
  exclusive: "bg-pro-ink text-white",
  danger:    "bg-danger-50 text-danger-700 border border-danger-100",
};

export function Tag({ variant = "default", children, className = "" }) {
  const variantClass = TAG_VARIANTS[variant] ?? TAG_VARIANTS.default;
  return (
    <span className={[TAG_BASE, variantClass, className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  PILL (filter chip)                                                  */
/* ------------------------------------------------------------------ */

const PILL_BASE =
  "inline-flex items-center gap-2 px-[14px] py-[7px] rounded-pro-pill border font-mono text-[13px] tracking-[0.04em] cursor-pointer select-none transition-[background-color,color,border-color]";

export function Pill({ active = false, count, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        PILL_BASE,
        active
          ? "bg-pro-ink text-white border-pro-ink"
          : "bg-pro-white text-pro-ink-2 border-pro-line hover:bg-pro-cream hover:border-pro-cream-2",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
      {count !== undefined && (
        <span
          className={`font-mono text-[10.5px] px-[6px] py-[1px] rounded-pro-xs ${
            active ? "bg-white/16 text-white" : "bg-pro-cream text-pro-ink-2"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  STATUS DOT                                                          */
/* ------------------------------------------------------------------ */

const STATUS_DOTS = {
  new:      "bg-pro-cobalt",
  progress: "bg-warning-500",
  docs:     "bg-pro-azure",
  won:      "bg-success-600",
  lost:     "bg-danger-500",
};

const STATUS_LABELS = {
  new:      "חדש",
  progress: "בתהליך",
  docs:     "מסמכים",
  won:      "סגור",
  lost:     "אבוד",
};

export function StatusDot({ status, label, className = "" }) {
  const dotClass = STATUS_DOTS[status] ?? "bg-pro-mute";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center gap-[6px] font-mono text-[12px] text-pro-ink-2 tracking-[0.04em] ${className}`}>
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  DEMO PILL — visible when NODE_ENV !== 'production'                  */
/* ------------------------------------------------------------------ */

export function DemoPill() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <span className="font-mono text-[11px] tracking-[0.06em] text-warning-500 border border-warning-500 px-[10px] py-1 rounded-pro-pill bg-warning-500/8">
      DEMO · נתוני המחשה
    </span>
  );
}
