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
  "relative inline-flex items-center justify-center gap-2 font-sans font-medium border border-transparent cursor-pointer select-none whitespace-nowrap transition-[background-color,color,opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finzo-cobalt focus-visible:ring-offset-2 disabled:opacity-45 disabled:pointer-events-none";

const VARIANTS = {
  cobalt:
    "bg-finzo-gradient text-white shadow-e-cobalt hover:brightness-110 rounded-finzo-pill",
  ink:
    "bg-finzo-ink text-white hover:bg-finzo-ink-2 rounded-finzo-pill",
  ghost:
    "bg-transparent text-finzo-ink border-finzo-ink hover:bg-finzo-ink hover:text-white rounded-finzo-pill",
  quiet:
    "bg-finzo-white text-finzo-ink border-finzo-line hover:bg-finzo-cream rounded-finzo-pill",
};

const SIZES = {
  default: "px-[18px] py-3 text-[14.5px]",
  mini:    "px-3 py-[7px] text-[12.5px] rounded-finzo-md",
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
