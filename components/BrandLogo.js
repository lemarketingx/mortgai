// LOCKED BRAND COMPONENT
// Single source of truth for FINZO / FINZO PRO / operator branding.
// Keep this component simple: no floating decorative lines, no RTL/LTR tricks outside this file.

const TAGLINES = {
  public: "בדיקת זכאות חכמה למשכנתא בישראל",
  advisor: "פלטפורמה חכמה ליועצי משכנתאות בישראל",
  operator: "ל.א.ה דיגיטל",
};

const SIZE = {
  sm: {
    mark: "h-6 w-6",
    word: "text-lg",
    pro: "text-sm",
    tagline: "text-[10px]",
    gap: "gap-2",
  },
  md: {
    mark: "h-9 w-9",
    word: "text-3xl",
    pro: "text-2xl",
    tagline: "text-xs",
    gap: "gap-3",
  },
  lg: {
    mark: "h-12 w-12",
    word: "text-4xl",
    pro: "text-3xl",
    tagline: "text-sm",
    gap: "gap-4",
  },
};

function FinzoMark({ className = "", appIcon = false, pro = false }) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      aria-hidden="true"
    >
      {appIcon && (
        <span className={`absolute inset-0 rounded-[26%] ${pro ? "bg-[#0B132B]" : "bg-white"} shadow-[0_16px_40px_rgba(15,19,43,0.16)]`} />
      )}
      <svg viewBox="0 0 96 96" className="relative h-full w-full overflow-visible" fill="none">
        <defs>
          <linearGradient id="finzoMarkGradient" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6B3DFF" />
            <stop offset="0.55" stopColor="#8A35F6" />
            <stop offset="1" stopColor="#FF2EA6" />
          </linearGradient>
          <linearGradient id="finzoMarkShadow" x1="18" y1="54" x2="48" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0B132B" stopOpacity="0.2" />
            <stop offset="1" stopColor="#0B132B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M20 16H78L69.5 31.5H11.5L20 16Z" fill="url(#finzoMarkGradient)" />
        <path d="M15.5 42H65L56.5 57.5H7L15.5 42Z" fill="url(#finzoMarkGradient)" />
        <path d="M7 58H32.5V84L7 94V58Z" fill="url(#finzoMarkGradient)" />
        <path d="M7 58H32.5V72H7V58Z" fill="url(#finzoMarkShadow)" />
        {pro && appIcon && (
          <g>
            <circle cx="72" cy="72" r="17" fill="#0B132B" stroke="url(#finzoMarkGradient)" strokeWidth="3" />
            <rect x="63" y="73" width="4" height="8" rx="1" fill="#FFFFFF" />
            <rect x="70" y="66" width="4" height="15" rx="1" fill="#FFFFFF" opacity="0.92" />
            <rect x="77" y="59" width="4" height="22" rx="1" fill="#FFFFFF" opacity="0.86" />
          </g>
        )}
      </svg>
    </span>
  );
}

function FinzoO({ dark = false }) {
  return (
    <span className="relative inline-flex h-[1em] w-[0.92em] items-center justify-center align-[-0.12em]">
      <span className={`absolute inset-[0.12em] rounded-full border-[0.15em] ${dark ? "border-white" : "border-[#0B132B]"}`} />
      <span className="absolute right-[0.02em] top-[0.08em] h-[0.31em] w-[0.12em] rotate-45 rounded-full bg-[#7B3DFF]" />
      <span className="absolute right-[0.02em] bottom-[0.08em] h-[0.31em] w-[0.12em] -rotate-45 rounded-full bg-[#FF2EA6]" />
    </span>
  );
}

export function FinzoAppIcon({ variant = "public", className = "" }) {
  const pro = variant === "advisor";
  return (
    <span className={`inline-grid place-items-center rounded-[28%] ${pro ? "bg-[#0B132B]" : "bg-white"} shadow-[0_16px_40px_rgba(15,19,43,0.16)] ${className}`}>
      <FinzoMark appIcon pro={pro} className="h-[72%] w-[72%]" />
    </span>
  );
}

export default function BrandLogo({
  variant = "public",
  mode = "light",
  size = "md",
  withTagline = true,
  className = "",
}) {
  const isAdvisor = variant === "advisor";
  const isOperator = variant === "operator";
  const isIcon = size === "icon";
  const cfg = SIZE[size] || SIZE.md;
  const dark = mode === "dark";
  const tagline = TAGLINES[variant] || TAGLINES.public;

  if (isOperator) {
    return (
      <span dir="rtl" className={`inline-flex items-center gap-2 whitespace-nowrap font-black text-[#0B132B] dark:text-white ${className}`}>
        <span className="inline-flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#7B3DFF] shadow-[0_0_14px_rgba(123,61,255,0.45)]" />
          <span className="h-2 w-2 rounded-full bg-[#19C7C9] shadow-[0_0_14px_rgba(25,199,201,0.45)]" />
        </span>
        <span>ל.א.ה דיגיטל</span>
      </span>
    );
  }

  if (isIcon) {
    return <FinzoAppIcon variant={variant} className={className || "h-10 w-10"} />;
  }

  return (
    <span
      className={`inline-flex max-w-full items-center ${cfg.gap} whitespace-nowrap leading-none ${className}`}
      dir="ltr"
      aria-label={isAdvisor ? "FINZO PRO - פלטפורמה ליועצי משכנתאות" : "FINZO - בדיקת זכאות חכמה למשכנתא בישראל"}
      style={{ unicodeBidi: "isolate" }}
    >
      <FinzoMark className={cfg.mark} />
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className="inline-flex items-baseline gap-2 whitespace-nowrap" dir="ltr" style={{ unicodeBidi: "isolate" }}>
          <span
            className={`${cfg.word} font-black tracking-[0.12em] ${dark ? "text-white" : "text-[#0B132B]"}`}
            style={{ fontFamily: "Heebo, Arial, sans-serif" }}
          >
            FINZ<FinzoO dark={dark} />
          </span>
          {isAdvisor && (
            <span
              className={`${cfg.pro} font-black tracking-[0.04em] bg-gradient-to-r from-[#7B3DFF] to-[#FF2EA6] bg-clip-text text-transparent`}
              style={{ fontFamily: "Heebo, Arial, sans-serif" }}
            >
              PRO
            </span>
          )}
        </span>
        {withTagline && (
          <span
            dir="rtl"
            className={`mt-1 block max-w-full truncate whitespace-nowrap text-right ${cfg.tagline} font-extrabold tracking-normal ${dark ? "text-slate-300" : "text-slate-500"}`}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
