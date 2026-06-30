/**
 * ל.א.ה דיגיטל logo component.
 * variant="full"    — symbol + name + tagline (default)
 * variant="compact" — symbol + name only
 * variant="symbol"  — symbol only (the three letters with dots)
 * dark={true}       — inverts text to white for dark backgrounds
 */
export default function LahDigitalLogo({ variant = "full", dark = false, className = "" }) {
  const textColor = dark ? "#ffffff" : "#0f172a";
  const subColor  = dark ? "#94a3b8" : "#64748b";

  return (
    <span
      dir="rtl"
      aria-label="ל.א.ה דיגיטל"
      className={`inline-flex flex-col items-center gap-0.5 ${className}`}
    >
      {/* Symbol — the three Hebrew letters with colored dots */}
      <svg
        viewBox="0 0 120 52"
        aria-hidden="true"
        className="w-16 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Letter ל (right) */}
        <text
          x="96" y="42"
          textAnchor="middle"
          fontSize="46"
          fontWeight="900"
          fontFamily="'Frank Ruhl Libre', serif"
          fill={textColor}
        >ל</text>

        {/* Purple dot between ל and א */}
        <circle cx="72" cy="28" r="5.5" fill="#7C3AED" />

        {/* Letter א (center) */}
        <text
          x="56" y="42"
          textAnchor="middle"
          fontSize="46"
          fontWeight="900"
          fontFamily="'Frank Ruhl Libre', serif"
          fill={textColor}
        >א</text>

        {/* Teal dot between א and ה */}
        <circle cx="36" cy="28" r="5.5" fill="#06B6D4" />

        {/* Letter ה (left) */}
        <text
          x="20" y="42"
          textAnchor="middle"
          fontSize="46"
          fontWeight="900"
          fontFamily="'Frank Ruhl Libre', serif"
          fill={textColor}
        >ה</text>
      </svg>

      {/* Name */}
      {variant !== "symbol" && (
        <span style={{ color: textColor }} className="text-xs font-bold leading-none tracking-wide">
          <span className="font-black">ל.א.ה</span>{" "}דיגיטל
        </span>
      )}

      {/* Tagline */}
      {variant === "full" && (
        <span style={{ color: subColor }} className="text-[10px] font-light tracking-widest leading-none mt-0.5">
          הופכים דיגיטל לתוצאות
        </span>
      )}
    </span>
  );
}
