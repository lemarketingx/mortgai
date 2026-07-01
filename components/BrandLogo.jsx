// FINZO brand logo — single source of truth for the FINZO / FINZO PRO / operator marks.
// Recreates the approved reference lockup: a ribbon "F" mark, a ring-styled "O" in the
// wordmark, plain "PRO" text (no pill), and a tagline flanked by thin gradient rules.
// The site is RTL, so the Latin wordmark must stay isolated with dir="ltr" + unicodeBidi,
// otherwise it renders reversed (this previously broke as "oFinz").
import { useId } from "react";

const PUBLIC_TAGLINE = "בדיקת זכאות חכמה למשכנתא בישראל";
const ADVISOR_TAGLINE = "פלטפורמה חכמה ליועצי משכנתאות בישראל";
const OPERATOR_NAME = "ל.א.ה דיגיטל";

const MARK_HEIGHTS = { sm: 22, md: 32, lg: 46 };
const RING_SIZES = { sm: 13, md: 19, lg: 27 };
const WORDMARK_SIZES = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
};
const PRO_SIZES = {
  sm: "text-[10px]",
  md: "text-sm",
  lg: "text-xl",
};
const TAGLINE_SIZES = {
  sm: "text-[9px]",
  md: "text-[11px]",
  lg: "text-sm",
};
const ICON_BOX_SIZES = { icon: 40 };

/** Ribbon/flag "F" mark — purple → pink diagonal gradient. Matches the approved lockup. */
function FMark({ height = 32, gradientId }) {
  const width = height * (44 / 56);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 44 56"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="24" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7B3DFF" />
          <stop offset="1" stopColor="#FF2EA6" />
        </linearGradient>
      </defs>
      <path d="M4 2H34L24 16H4V2Z" fill={`url(#${gradientId})`} />
      <path d="M4 22H26L16 36H4V22Z" fill={`url(#${gradientId})`} />
      <path d="M4 40H14L4 54V40Z" fill={`url(#${gradientId})`} />
    </svg>
  );
}

/** Ring built from 4 arcs (dark ring + purple tick + pink tick) — stands in for the "O" in FINZO. */
function RingO({ size = 19, ringColor, id }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M12.5 15.06A7 7 0 1 1 12.5 2.94" stroke={ringColor} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M12.5 2.94A7 7 0 0 1 15.34 6.04" stroke="#7B3DFF" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M15.34 6.04A7 7 0 0 1 15.34 11.96" stroke={ringColor} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M15.34 11.96A7 7 0 0 1 12.5 15.06" stroke="#FF2EA6" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

/** Small ring/graph badge used to differentiate the PRO app icon. */
function ProDataBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8.2" fill="#0B132B" stroke="#F6F4FF" strokeWidth="1.4" />
      <path d="M12.5 3.44A7 7 0 0 1 15.34 6.54" stroke="#7B3DFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.34 11.46A7 7 0 0 1 12.5 14.56" stroke="#FF2EA6" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 12V9.8M9 12V6.8M12 12V8.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
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
      <FMark height={size * 0.58} gradientId={gradientId} />
      {isAdvisor && (
        <span className="absolute -bottom-1.5 -left-1.5">
          <ProDataBadge />
        </span>
      )}
    </span>
  );
}

/** Thin gradient rule used to flank the tagline. */
function TaglineRule({ id }) {
  return (
    <svg width="20" height="2" viewBox="0 0 20 2" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="20" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7B3DFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FF2EA6" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="20" y1="0" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7B3DFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FF2EA6" />
        </linearGradient>
      </defs>
      <rect width="20" height="2" fill={`url(#${id})`} />
    </svg>
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
  const ruleId = `finzo-rule-${uid}`;
  const isDark = mode === "dark";
  // When mode="light" we still fall back to dark: variants so the logo stays legible
  // if it ends up inside a container that flips with the site-wide dark-mode toggle.
  const wordmarkColor = isDark ? "text-white" : "text-[#0B132B] dark:text-white";
  const ringColor = isDark ? "#FFFFFF" : "#0B132B";
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

  const markHeight = MARK_HEIGHTS[size] ?? MARK_HEIGHTS.md;
  const ringSize = RING_SIZES[size] ?? RING_SIZES.md;
  const wordmarkSize = WORDMARK_SIZES[size] ?? WORDMARK_SIZES.md;
  const proSize = PRO_SIZES[size] ?? PRO_SIZES.md;
  const taglineSize = TAGLINE_SIZES[size] ?? TAGLINE_SIZES.md;
  const tagline = variant === "advisor" ? ADVISOR_TAGLINE : PUBLIC_TAGLINE;

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <span dir="ltr" className="inline-flex items-center gap-2" style={{ unicodeBidi: "isolate" }} aria-label={variant === "advisor" ? "Finzo Pro" : "Finzo"}>
        <FMark height={markHeight} gradientId={gradientId} />
        <span className={`inline-flex items-center font-black tracking-tight ${wordmarkSize} ${wordmarkColor}`}>
          FINZ
          <RingO size={ringSize} ringColor={ringColor} />
          {variant === "advisor" && <span className={`ms-2 ${proSize}`}>PRO</span>}
        </span>
      </span>
      {withTagline && (
        <span dir="rtl" className={`mt-1.5 inline-flex items-center gap-2 self-stretch font-extrabold ${taglineSize} ${taglineColor}`}>
          <TaglineRule id={`${ruleId}-a`} />
          <span className="whitespace-nowrap">{tagline}</span>
          <TaglineRule id={`${ruleId}-b`} />
        </span>
      )}
    </span>
  );
}
