// LOCKED BRAND COMPONENT
// BrandLogo must NOT redraw or reinterpret the logo.
// It only displays fixed logo assets from /public/brand/finzo/.
// Replace the PNG/SVG files in that folder to update branding.

const ASSETS = {
  public: {
    light: "/brand/finzo/finzo-logo-light.png",
    dark: "/brand/finzo/finzo-logo-dark.png",
    lightCompact: "/brand/finzo/finzo-logo-light-compact.png",
    darkCompact: "/brand/finzo/finzo-logo-dark-compact.png",
    icon: "/brand/finzo/finzo-app-icon.png",
    alt: "FINZO - בדיקת זכאות חכמה למשכנתא בישראל",
    fallback: "FINZO",
  },
  advisor: {
    light: "/brand/finzo/finzo-pro-logo-light.png",
    dark: "/brand/finzo/finzo-pro-logo-dark.png",
    lightCompact: "/brand/finzo/finzo-pro-logo-light-compact.png",
    darkCompact: "/brand/finzo/finzo-pro-logo-dark-compact.png",
    icon: "/brand/finzo/finzo-pro-app-icon.png",
    alt: "FINZO PRO - פלטפורמה חכמה ליועצי משכנתאות בישראל",
    fallback: "FINZO PRO",
  },
  operator: {
    light: "/brand/finzo/lah-digital-logo-light.png",
    dark: "/brand/finzo/lah-digital-logo-dark.png",
    lightCompact: "/brand/finzo/lah-digital-logo-light.png",
    darkCompact: "/brand/finzo/lah-digital-logo-dark.png",
    icon: "/brand/finzo/lah-digital-mark.png",
    alt: "ל.א.ה דיגיטל",
    fallback: "ל.א.ה דיגיטל",
  },
};

// Direct pixel heights — no CSS scale() transforms. Scaling a rasterized
// <img> box with transform upscales an already-downsampled bitmap and
// blurs it; sizing the box itself lets the browser downsample straight
// from the source PNG, which stays crisp at every size.
const SIZE_CLASSES = {
  public: {
    withTagline: { sm: "h-16", md: "h-[88px]", lg: "h-[120px]" },
    compact: { sm: "h-9", md: "h-11", lg: "h-14" },
    icon: "h-10 w-10",
  },
  advisor: {
    withTagline: { sm: "h-16", md: "h-[84px]", lg: "h-[112px]" },
    compact: { sm: "h-8", md: "h-10", lg: "h-[52px]" },
    icon: "h-10 w-10",
  },
  operator: {
    withTagline: { sm: "h-8", md: "h-10", lg: "h-12" },
    compact: { sm: "h-8", md: "h-10", lg: "h-12" },
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

  if (size === "icon") {
    return <FinzoAppIcon variant={safeVariant} className={className || SIZE_CLASSES[safeVariant].icon} />;
  }

  const src = withTagline
    ? isDark ? asset.dark : asset.light
    : isDark ? asset.darkCompact : asset.lightCompact;
  const sizeGroup = withTagline ? "withTagline" : "compact";
  const sizeClass = SIZE_CLASSES[safeVariant]?.[sizeGroup]?.[size] || SIZE_CLASSES[safeVariant][sizeGroup].md;

  return (
    <span dir="ltr" className={`inline-flex shrink-0 items-center ${className}`} style={{ unicodeBidi: "isolate" }}>
      <img
        src={src}
        alt={asset.alt}
        className={`block w-auto object-contain ${sizeClass}`}
        loading="eager"
        decoding="async"
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
