/**
 * FINZO Card — Design System v1.0
 * Variants: quiet (default) | featured | dark | neo
 *
 * Rules:
 * - Quiet is the default — no shadow, 1px line border
 * - Featured: cobalt border + inset ring (lead marketplace)
 * - Dark: ink background (refinance, pro panels)
 * - Neo: 8px 8px 0 ink hard shadow — hero calculator only
 */

const BASE = "rounded-finzo-lg overflow-hidden";

const VARIANTS = {
  quiet:    "bg-finzo-white border border-finzo-line",
  elevated: "bg-finzo-white border border-finzo-line shadow-e-2",
  featured: "bg-finzo-white border-2 border-finzo-cobalt ring-4 ring-finzo-cobalt-l",
  dark:     "bg-finzo-ink text-white border border-finzo-ink",
  neo:      "bg-finzo-paper border-[1.5px] border-finzo-ink shadow-neo",
};

export function Card({ variant = "quiet", children, className = "", ...props }) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.quiet;
  return (
    <div className={[BASE, variantClass, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}

export function CardHead({ children, className = "" }) {
  return (
    <div className={`px-[22px] py-[18px] border-b border-finzo-line flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return (
    <div className={`p-[22px] ${className}`}>
      {children}
    </div>
  );
}

/** Dark card head — for ink-bg cards */
export function CardHeadDark({ children, className = "" }) {
  return (
    <div className={`px-[22px] py-[18px] border-b border-white/10 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

/** Eyebrow label above section headings */
export function Eyebrow({ children, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-[10px] font-mono text-[12px] tracking-[0.12em] uppercase text-finzo-ink-3 ${className}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-finzo-cobalt shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}

/** Empty state — glyph + serif headline + 1-line copy + optional CTA */
export function EmptyState({ glyph, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center p-14 bg-finzo-white border border-dashed border-finzo-line-2 rounded-finzo-lg">
      <div className="w-14 h-14 rounded-finzo-lg bg-finzo-cream text-finzo-ink-3 grid place-items-center font-serif font-bold text-2xl mb-[18px]">
        {glyph}
      </div>
      <h4 className="font-serif text-[20px] mb-[6px] text-finzo-ink">{title}</h4>
      <p className="text-[14px] text-finzo-ink-2 max-w-[340px]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Skeleton loading — mirrors exact layout of loaded state */
export function Skeleton({ variant = "line", className = "" }) {
  const variants = {
    line:  "h-3 w-full",
    title: "h-[22px] w-3/5",
    block: "h-14 w-full",
    circle: "w-7 h-7 rounded-full",
  };
  return (
    <div
      className={[
        "rounded-finzo-sm bg-gradient-to-r from-finzo-cream via-finzo-paper to-finzo-cream bg-[length:200%_100%] animate-[shimmer_1400ms_linear_infinite]",
        variants[variant] ?? variants.line,
        className,
      ].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  );
}
