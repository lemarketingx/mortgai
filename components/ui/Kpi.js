/**
 * FINZO KPI Tile — Design System v1.0
 * Always 3 rows: mono-uppercase label → serif value → mono delta
 * Variants: default (white) | dark (ink bg)
 *
 * Rule: monetary values always use tnum tabular numbers.
 */

export function KpiTile({ label, value, unit, delta, deltaDir = "up", variant = "default", className = "" }) {
  const isDark = variant === "dark";

  const deltaColor =
    deltaDir === "up"   ? "text-finzo-success" :
    deltaDir === "down" ? "text-finzo-danger"  :
                          "text-finzo-mute";

  return (
    <div
      className={[
        "rounded-finzo-lg p-4 border",
        isDark
          ? "bg-finzo-ink text-white border-finzo-ink"
          : "bg-finzo-white border-finzo-line",
        className,
      ].filter(Boolean).join(" ")}
    >
      {/* Row 1: mono uppercase label */}
      <p className={`font-mono text-[11.5px] tracking-[0.08em] uppercase ${isDark ? "text-white/65" : "text-finzo-ink-3"}`}>
        {label}
      </p>

      {/* Row 2: serif value */}
      <p
        className="font-serif text-[30px] leading-none mt-1.5 tracking-[-0.02em]"
        style={{ fontFeatureSettings: '"tnum" 1' }}
      >
        {value}
        {unit && (
          <small className={`font-mono text-[14px] mr-1 ${isDark ? "text-white/60" : "text-finzo-ink-3"}`}>
            {unit}
          </small>
        )}
      </p>

      {/* Row 3: mono delta */}
      {delta && (
        <p className={`mt-1.5 font-mono text-[11px] ${deltaColor}`}>
          {delta}
        </p>
      )}
    </div>
  );
}

/** Compact strip of KPI tiles */
export function KpiStrip({ children, className = "" }) {
  return (
    <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(${Math.min(4, children?.length ?? 4)}, 1fr)` }}>
      {children}
    </div>
  );
}
