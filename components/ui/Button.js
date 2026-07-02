/**
 * FINZO Button — Design System v1.0
 * Variants: cobalt | ink | ghost | quiet
 * Sizes: default | mini | lg
 * States: disabled | loading
 *
 * Rule: one cobalt button per screen. Always.
 */

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center"
    >
      <span className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </span>
  );
}

const BASE =
  "relative inline-flex items-center justify-center gap-2 font-sans font-medium border border-transparent cursor-pointer select-none whitespace-nowrap transition-[background-color,color,opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-cobalt focus-visible:ring-offset-2 disabled:opacity-45 disabled:pointer-events-none";

const VARIANTS = {
  cobalt:
    "bg-pro-cobalt text-white shadow-pro-primary hover:bg-pro-cobalt-d rounded-pro-pill",
  ink:
    "bg-pro-ink text-white hover:bg-pro-ink-2 rounded-pro-pill",
  ghost:
    "bg-transparent text-pro-ink border-pro-ink hover:bg-pro-ink hover:text-white rounded-pro-pill",
  quiet:
    "bg-pro-white text-pro-ink border-pro-line hover:bg-pro-cream rounded-pro-pill",
};

const SIZES = {
  default: "px-[18px] py-3 text-[14.5px]",
  mini:    "px-3 py-[7px] text-[12.5px] rounded-pro-md",
  lg:      "px-6 py-4 text-base",
};

export function Button({
  variant = "cobalt",
  size = "default",
  loading = false,
  disabled = false,
  children,
  className = "",
  ...props
}) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.cobalt;
  const sizeClass    = SIZES[size]    ?? SIZES.default;
  const loadingClass = loading ? "text-transparent pointer-events-none" : "";

  return (
    <button
      className={[BASE, variantClass, sizeClass, loadingClass, className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
      {loading && <Spinner />}
    </button>
  );
}

/** Arrow glyph for RTL CTAs — rotated 180° per design rules */
export function BtnArrow() {
  return (
    <span aria-hidden="true" className="inline-block rotate-180 text-[12px] leading-none">
      ›
    </span>
  );
}
