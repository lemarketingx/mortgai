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

const TAG_BASE = "inline-flex items-center gap-[6px] font-mono text-[11.5px] px-[10px] py-[5px] rounded-finzo-sm tracking-[0.04em]";

const TAG_VARIANTS = {
  default:   "bg-finzo-cream text-finzo-ink-2",
  first:     "bg-finzo-cobalt-l text-finzo-cobalt-d",
  refi:      "bg-[#fff3ec] text-[#C25E2A]",
  upgrade:   "bg-[#edfaf3] text-[#0F7A48]",
  hot:       "bg-finzo-cobalt text-white",
  exclusive: "bg-finzo-ink text-white",
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
  "inline-flex items-center gap-2 px-[14px] py-[7px] rounded-finzo-pill border font-mono text-[13px] tracking-[0.04em] cursor-pointer select-none transition-[background-color,color,border-color]";

export function Pill({ active = false, count, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        PILL_BASE,
        active
          ? "bg-finzo-ink text-white border-finzo-ink"
          : "bg-finzo-white text-finzo-ink-2 border-finzo-line hover:bg-finzo-cream hover:border-finzo-cream-2",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
      {count !== undefined && (
        <span
          className={`font-mono text-[10.5px] px-[6px] py-[1px] rounded-finzo-xs ${
            active ? "bg-white/16 text-white" : "bg-finzo-cream text-finzo-ink-2"
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
  new:      "bg-finzo-cobalt",
  progress: "bg-finzo-warning",
  docs:     "bg-finzo-azure",
  won:      "bg-finzo-success",
  lost:     "bg-finzo-danger",
};

const STATUS_LABELS = {
  new:      "חדש",
  progress: "בתהליך",
  docs:     "מסמכים",
  won:      "סגור",
  lost:     "אבוד",
};

export function StatusDot({ status, label, className = "" }) {
  const dotClass = STATUS_DOTS[status] ?? "bg-finzo-mute";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center gap-[6px] font-mono text-[12px] text-finzo-ink-2 tracking-[0.04em] ${className}`}>
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
    <span className="font-mono text-[11px] tracking-[0.06em] text-finzo-warning border border-finzo-warning px-[10px] py-1 rounded-finzo-pill bg-finzo-warning/8">
      DEMO · נתוני המחשה
    </span>
  );
}
