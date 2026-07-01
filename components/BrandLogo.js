// LOCKED BRAND COMPONENT
// BrandLogo must NOT redraw or reinterpret the logo.
// It only displays fixed logo assets from /public/brand/finzo/.
// Replace the PNG/SVG files in that folder to update branding.

const ASSETS = {
  public: {
    light: "/brand/finzo/finzo-logo-light.png",
    dark: "/brand/finzo/finzo-logo-dark.png",
    icon: "/brand/finzo/finzo-app-icon.png",
    alt: "FINZO - בדיקת זכאות חכמה למשכנתא בישראל",
    fallback: "FINZO",
  },
  advisor: {
    light: "/brand/finzo/finzo-pro-logo-light.png",
    dark: "/brand/finzo/finzo-pro-logo-dark.png",
    icon: "/brand/finzo/finzo-pro-app-icon.png",
    alt: "FINZO PRO - פלטפורמה חכמה ליועצי משכנתאות בישראל",
    fallback: "FINZO PRO",
  },
  operator: {
    light: "/brand/finzo/lah-digital-logo-light.png",
    dark: "/brand/finzo/lah-digital-logo-dark.png",
    icon: "/brand/finzo/lah-digital-mark.png",
    alt: "ל.א.ה דיגיטל",
    fallback: "ל.א.ה דיגיטל",
  },
};

const SIZE_CLASSES = {
  public: {
    sm: "h-14 w-auto max-w-[260px] scale-[1.55]",
    md: "h-20 w-auto max-w-[400px] scale-[1.45]",
    lg: "h-28 w-auto max-w-[620px] scale-[1.35]",
    icon: "h-10 w-10",
  },
  advisor: {
    sm: "h-14 w-auto max-w-[310px] scale-[1.45]",
    md: "h-20 w-auto max-w-[500px] scale-[1.38]",
    lg: "h-28 w-auto max-w-[720px] scale-[1.28]",
    icon: "h-10 w-10",
  },
  operator: {
    sm: "h-8 w-auto max-w-[160px]",
    md: "h-10 w-auto max-w-[220px]",
    lg: "h-12 w-auto max-w-[280px]",
    icon: "h-9 w-9",
  },
};

function FallbackLogo({ variant, mode, size, className = "" }) {
  const isDark = mode === "dark";
  const label = ASSETS[variant]?.fallback || "FINZO";
  const textSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <span
      dir={variant === "operator" ? "rtl" : "ltr"}
      className={`inline-flex items-center gap-2 whitespace-nowrap font-black tracking-tight ${textSize} ${
        isDark ? "text-white" : "text-[#0B132B]"
      } ${className}`}
    >
      <span className="inline-block h-5 w-5 rounded bg-gradient-to-br from-[#7B3DFF] to-[#FF2EA6]" />
      {label}
    </span>
  );
}

export function FinzoAppIcon({ variant = "public", className = "" }) {
  const safeVariant = ASSETS[variant] ? variant : "public";
  const asset = ASSETS[safeVariant];

  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-[28%] ${className || SIZE_CLASSES[safeVariant].icon}`}>
      <img
        src={asset.icon}
        alt={asset.alt}
        className="block h-full w-full object-contain"
        loading="eager"
        decoding="async"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
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
  const safeVariant = ASSETS[variant] ? variant : "public";
  const asset = ASSETS[safeVariant];
  const isDark = mode === "dark";
  const src = size === "icon" ? asset.icon : isDark ? asset.dark : asset.light;
  const sizeClass = SIZE_CLASSES[safeVariant]?.[size] || SIZE_CLASSES[safeVariant].md;

  if (size === "icon") {
    return <FinzoAppIcon variant={safeVariant} className={className || sizeClass} />;
  }

  return (
    <span dir="ltr" className={`inline-flex shrink-0 items-center justify-center overflow-visible ${className}`} style={{ unicodeBidi: "isolate" }}>
      <img
        src={src}
        alt={asset.alt}
        className={`block object-contain ${sizeClass}`}
        loading="eager"
        decoding="async"
        data-with-tagline={withTagline ? "true" : "false"}
        onError={(event) => {
          const wrapper = event.currentTarget.parentElement;
          if (wrapper) wrapper.dataset.logoMissing = "true";
          event.currentTarget.style.display = "none";
        }}
      />
      <span className="hidden [[data-logo-missing=true]_&]:inline-flex">
        <FallbackLogo variant={safeVariant} mode={mode} size={size} />
      </span>
    </span>
  );
}
