// FINZO brand logo — single source of truth for the FINZO / FINZO PRO / operator marks.
// The site is RTL, so the Latin wordmark must stay isolated with dir="ltr" + unicodeBidi,
// otherwise it renders reversed (this previously broke as "oFinz").
import { useId } from "react";

const PUBLIC_TAGLINE = "בדיקת זכאות חכמה למשכנתא בישראל";
const ADVISOR_TAGLINE = "פלטפורמה חכמה ליועצי משכנתאות בישראל";
const OPERATOR_NAME = "ל.א.ה דיגיטל";

const MARK_SIZES = { sm: 24, md: 32, lg: 44 };
const WORDMARK_SIZES = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
};
const TAGLINE_SIZES = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};
const ICON_BOX_SIZES = { icon: 40 };

/** Abstract "F" flag/ribbon mark — purple → pink diagonal gradient. */
function FMark({ size = 32, gradientId }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="30" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7B3DFF" />
          <stop offset="1" stopColor="#FF2EA6" />
        </linearGradient>
      </defs>
      <path d="M4 4H32L21 16H4V4Z" fill={`url(#${gradientId})`} />
      <path d="M4 20H26L16 32H4V20Z" fill={`url(#${gradientId})`} />
      <path d="M4 34H14L4 44V34Z" fill={`url(#${gradientId})`} />
    </svg>
  );
}

/** Small ring/graph badge used to differentiate the PRO app icon. */
function ProDataBadge({ id }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#0B132B" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M8 1.5A6.5 6.5 0 0114.5 8" stroke="#7B3DFF" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M8 14.5A6.5 6.5 0 011.5 8" stroke="#FF2EA6" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M5.5 9.5V11M8 8V11M10.5 6.5V11" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Rounded-square app icon: light + clean for public, dark navy + PRO data badge for advisor. */
function AppIcon({ variant, gradientId }) {
  const size = ICON_BOX_SIZES.icon;
  const isAdvisor = variant === "advisor";
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: isAdvisor ? "#0B132B" : "#F6F4FF",
      }}
      aria-hidden="true"
    >
      <FMark size={size * 0.6} gradientId={gradientId} />
      {isAdvisor && (
        <span className="absolute -bottom-1 -left-1">
          <ProDataBadge id={`${gradientId}-badge`} />
        </span>
      )}
    </span>
  );
}

export default function BrandLogo({
  variant = "public",
  mode = "light",
  size = "md",
  withTagline = false,
  className = "",
}) {
  const uid = useId();
  const gradientId = `finzo-mark-${uid}`;
  const isDark = mode === "dark";
  // When mode="light" we still fall back to dark: variants so the logo stays legible
  // if it ends up inside a container that flips with the site-wide dark-mode toggle.
  const wordmarkColor = isDark ? "text-white" : "text-[#0B132B] dark:text-white";
  const taglineColor = isDark ? "text-slate-400" : "text-[#64748B] dark:text-slate-400";

  if (variant === "operator") {
    return (
      <span
        className={`inline-flex items-center font-black tracking-tight ${wordmarkColor} ${TAGLINE_SIZES[size] ?? TAGLINE_SIZES.sm} ${className}`}
        dir="rtl"
      >
        {OPERATOR_NAME}
      </span>
    );
  }

  if (size === "icon") {
    return (
      <span className={`inline-flex ${className}`} aria-label={variant === "advisor" ? "FINZO PRO" : "FINZO"}>
        <AppIcon variant={variant} gradientId={gradientId} />
      </span>
    );
  }

  const markSize = MARK_SIZES[size] ?? MARK_SIZES.md;
  const wordmarkSize = WORDMARK_SIZES[size] ?? WORDMARK_SIZES.md;
  const taglineSize = TAGLINE_SIZES[size] ?? TAGLINE_SIZES.md;
  const tagline = variant === "advisor" ? ADVISOR_TAGLINE : PUBLIC_TAGLINE;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <FMark size={markSize} gradientId={gradientId} />
      <span className="flex flex-col items-start leading-none">
        <span dir="ltr" className="inline-flex items-center gap-1.5" style={{ unicodeBidi: "isolate" }} aria-label={variant === "advisor" ? "Finzo Pro" : "Finzo"}>
          <span className={`font-black tracking-tight ${wordmarkSize} ${wordmarkColor}`}>FINZO</span>
          {variant === "advisor" && (
            <span
              className="rounded-full border px-1.5 py-0.5 text-[10px] font-black tracking-widest"
              style={{
                borderColor: "#7B3DFF66",
                color: isDark ? "#C6A6FF" : "#7B3DFF",
                background: isDark ? "#7B3DFF1A" : "#7B3DFF0D",
              }}
            >
              PRO
            </span>
          )}
        </span>
        {withTagline && (
          <span dir="rtl" className={`mt-1 font-extrabold ${taglineSize} ${taglineColor}`}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
