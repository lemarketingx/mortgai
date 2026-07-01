// LOCKED BRAND COMPONENT
// FINZO and FINZO PRO must render from one fixed SVG wordmark.
// Do not rebuild the logo ad-hoc in pages.

const TAGLINES = {
  public: "בדיקת זכאות חכמה למשכנתא בישראל",
  advisor: "פלטפורמה חכמה ליועצי משכנתאות בישראל",
  operator: "ל.א.ה דיגיטל",
};

const WIDTH = {
  public: {
    sm: "w-[168px]",
    md: "w-[270px]",
    lg: "w-[390px]",
  },
  advisor: {
    sm: "w-[218px]",
    md: "w-[340px]",
    lg: "w-[500px]",
  },
};

function MarkShape({ pro = false }) {
  return (
    <g>
      <defs>
        <linearGradient id="finzoGradient" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6B3DFF" />
          <stop offset="0.55" stopColor="#8A35F6" />
          <stop offset="1" stopColor="#FF2EA6" />
        </linearGradient>
        <linearGradient id="finzoShadow" x1="8" y1="55" x2="36" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0B132B" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0B132B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M19 10H83L74 27H10L19 10Z" fill="url(#finzoGradient)" />
      <path d="M14 39H69L60 56H5L14 39Z" fill="url(#finzoGradient)" />
      <path d="M5 56H35V86L5 98V56Z" fill="url(#finzoGradient)" />
      <path d="M5 56H35V72H5V56Z" fill="url(#finzoShadow)" />
      {pro && (
        <g transform="translate(64 66)">
          <circle cx="10" cy="10" r="18" fill="#0B132B" stroke="url(#finzoGradient)" strokeWidth="3.5" />
          <rect x="1" y="11" width="4" height="8" rx="1" fill="#FFFFFF" />
          <rect x="8" y="5" width="4" height="14" rx="1" fill="#FFFFFF" opacity="0.92" />
          <rect x="15" y="0" width="4" height="19" rx="1" fill="#FFFFFF" opacity="0.86" />
        </g>
      )}
    </g>
  );
}

function LogoO({ x, y, dark }) {
  const stroke = dark ? "#FFFFFF" : "#0B132B";
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="24" fill="none" stroke={stroke} strokeWidth="12" />
      <path d="M16 -18 A24 24 0 0 1 23 -5" fill="none" stroke="#7B3DFF" strokeWidth="12" strokeLinecap="round" />
      <path d="M20 12 A24 24 0 0 1 7 23" fill="none" stroke="#FF2EA6" strokeWidth="12" strokeLinecap="round" />
    </g>
  );
}

function WordmarkSvg({ variant, mode, withTagline }) {
  const isAdvisor = variant === "advisor";
  const dark = mode === "dark";
  const textColor = dark ? "#FFFFFF" : "#0B132B";
  const muted = dark ? "#CBD5E1" : "#64748B";
  const width = isAdvisor ? 620 : 470;
  const height = withTagline ? 124 : 82;
  const oX = isAdvisor ? 340 : 340;
  const proX = 397;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full overflow-visible"
      role="img"
      aria-label={isAdvisor ? "FINZO PRO - פלטפורמה חכמה ליועצי משכנתאות בישראל" : "FINZO - בדיקת זכאות חכמה למשכנתא בישראל"}
    >
      <g transform="translate(0 4) scale(0.72)">
        <MarkShape />
      </g>

      <text
        x="98"
        y="57"
        fill={textColor}
        fontFamily="Heebo, Arial, sans-serif"
        fontSize="54"
        fontWeight="900"
        letterSpacing="10"
      >
        FINZ
      </text>
      <LogoO x={oX} y={39} dark={dark} />

      {isAdvisor && (
        <text
          x={proX}
          y="57"
          fill="#7B3DFF"
          fontFamily="Heebo, Arial, sans-serif"
          fontSize="43"
          fontWeight="900"
          letterSpacing="3"
        >
          PRO
        </text>
      )}

      {withTagline && (
        <text
          x={isAdvisor ? 330 : 250}
          y="104"
          fill={muted}
          fontFamily="Heebo, Arial, sans-serif"
          fontSize={isAdvisor ? "23" : "22"}
          fontWeight="800"
          textAnchor="middle"
          direction="rtl"
        >
          {TAGLINES[variant]}
        </text>
      )}
    </svg>
  );
}

function OperatorLogo({ className = "" }) {
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

export function FinzoAppIcon({ variant = "public", className = "" }) {
  const pro = variant === "advisor";
  return (
    <span className={`inline-grid place-items-center rounded-[28%] ${pro ? "bg-[#0B132B]" : "bg-white"} shadow-[0_16px_40px_rgba(15,19,43,0.16)] ${className}`}>
      <svg viewBox="0 0 96 96" className="h-[72%] w-[72%] overflow-visible" fill="none" aria-hidden="true">
        <MarkShape pro={pro} />
      </svg>
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
  if (variant === "operator") return <OperatorLogo className={className} />;
  if (size === "icon") return <FinzoAppIcon variant={variant} className={className || "h-10 w-10"} />;

  const bucket = variant === "advisor" ? "advisor" : "public";
  const widthClass = WIDTH[bucket][size] || WIDTH[bucket].md;

  return (
    <span dir="ltr" className={`inline-block max-w-full shrink-0 ${widthClass} ${className}`} style={{ unicodeBidi: "isolate" }}>
      <WordmarkSvg variant={bucket} mode={mode} withTagline={withTagline} />
    </span>
  );
}
