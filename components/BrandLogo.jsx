// FINZO brand logo — single source of truth for the FINZO / FINZO PRO / operator marks.
// Renders the official brand PNG assets from public/brand/finzo/ as-is (no redrawing,
// no cropping, no recoloring). The site is RTL; images are plain <img> tags so no
// bidi-isolation hacks are needed here (that issue was specific to the old text wordmark).

const ASSET_BASE = "/brand/finzo";

// finzo-logo-{light,dark}.png and finzo-pro-logo-{light,dark}.png are currently
// byte-identical files (opaque near-white background, dark navy text) — there is no
// distinct dark-background export yet. When mode="dark" we wrap the image in a light
// card so it reads intentionally instead of showing a stray white box on a dark surface.
const LOGO_ASSET = {
  public: { light: "finzo-logo-light.png", dark: "finzo-logo-dark.png", ratio: 979 / 325 },
  advisor: { light: "finzo-pro-logo-light.png", dark: "finzo-pro-logo-dark.png", ratio: 1258 / 311 },
};

const ICON_ASSET = {
  public: "finzo-app-icon.png",
  advisor: "finzo-pro-app-icon.png",
};

const OPERATOR_ASSET = {
  light: "lah-digital-logo-light.png",
  dark: "lah-digital-logo-dark.png",
  ratio: 520 / 140,
};
const OPERATOR_MARK_ASSET = "lah-digital-mark.png";

const LOGO_HEIGHTS = { sm: 26, md: 36, lg: 52 };
const ICON_BOX_SIZE = 40;
const OPERATOR_HEIGHTS = { sm: 14, md: 18, lg: 24, icon: 20 };

export default function BrandLogo({
  variant = "public",
  mode = "light",
  size = "md",
  withTagline = false,
  className = "",
}) {
  if (variant === "operator") {
    if (size === "icon") {
      const h = OPERATOR_HEIGHTS.icon;
      return (
        <img
          src={`${ASSET_BASE}/${OPERATOR_MARK_ASSET}`}
          alt="ל.א.ה דיגיטל"
          height={h}
          width={h}
          className={`inline-block shrink-0 ${className}`}
        />
      );
    }
    const h = OPERATOR_HEIGHTS[size] ?? OPERATOR_HEIGHTS.md;
    const file = mode === "dark" ? OPERATOR_ASSET.dark : OPERATOR_ASSET.light;
    return (
      <img
        src={`${ASSET_BASE}/${file}`}
        alt="ל.א.ה דיגיטל"
        height={h}
        width={Math.round(h * OPERATOR_ASSET.ratio)}
        className={`inline-block shrink-0 ${className}`}
      />
    );
  }

  if (size === "icon") {
    const file = ICON_ASSET[variant] ?? ICON_ASSET.public;
    return (
      <span className={`inline-flex shrink-0 overflow-hidden rounded-2xl ${className}`} style={{ width: ICON_BOX_SIZE, height: ICON_BOX_SIZE }}>
        <img
          src={`${ASSET_BASE}/${file}`}
          alt={variant === "advisor" ? "FINZO PRO" : "FINZO"}
          width={ICON_BOX_SIZE}
          height={ICON_BOX_SIZE}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const asset = LOGO_ASSET[variant] ?? LOGO_ASSET.public;
  const file = mode === "dark" ? asset.dark : asset.light;
  const h = LOGO_HEIGHTS[size] ?? LOGO_HEIGHTS.md;
  const w = Math.round(h * asset.ratio);
  const alt = variant === "advisor" ? "FINZO PRO — פלטפורמה חכמה ליועצי משכנתאות בישראל" : "FINZO — בדיקת זכאות חכמה למשכנתא בישראל";

  const img = (
    <img
      src={`${ASSET_BASE}/${file}`}
      alt={withTagline ? alt : variant === "advisor" ? "FINZO PRO" : "FINZO"}
      height={h}
      width={w}
      className="block"
      style={{ height: h, width: w }}
    />
  );

  if (mode === "dark") {
    // finzo-logo-dark.png has an opaque near-white background (see note above) — a light
    // card keeps it legible and intentional-looking against a navy/dark surface.
    return (
      <span className={`inline-flex items-center rounded-xl bg-white/95 px-2.5 py-1.5 shadow-sm ${className}`}>
        {img}
      </span>
    );
  }

  return <span className={`inline-flex items-center ${className}`}>{img}</span>;
}
