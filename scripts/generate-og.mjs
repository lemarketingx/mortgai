import sharp from "sharp";

const W = 1200;
const H = 630;
const CX = W / 2; // 600

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="25%" r="60%">
      <stop offset="0%"   stop-color="#4f46e5" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Decorative circles -->
  <circle cx="1080" cy="100" r="220" fill="#4f46e5" opacity="0.10"/>
  <circle cx="1130" cy="520" r="160" fill="#6366f1" opacity="0.08"/>
  <circle cx="60"   cy="540" r="170" fill="#312e81" opacity="0.22"/>

  <!-- Subtle dot grid -->
  ${Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 12 }, (_, col) =>
      `<circle cx="${col * 100 + 50}" cy="${row * 100 + 50}" r="1.4" fill="#6366f1" opacity="0.15"/>`
    ).join("")
  ).join("")}

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)"/>

  <!-- ── Logo row (top-left) ── -->
  <!-- "F" badge -->
  <rect x="72" y="72" width="56" height="56" rx="14" fill="url(#accent)"/>
  <text x="100" y="116"
        font-family="Arial Black, Arial, sans-serif"
        font-size="32" font-weight="900" fill="white" text-anchor="middle">F</text>
  <!-- FINZO wordmark -->
  <text x="144" y="116"
        font-family="Arial Black, Arial, sans-serif"
        font-size="32" font-weight="900" fill="white" letter-spacing="3">FINZO</text>

  <!-- Tagline below logo -->
  <circle cx="72" cy="162" r="3" fill="#6366f1"/>
  <text x="88" y="168"
        font-family="Arial, sans-serif"
        font-size="17" fill="#a5b4fc" letter-spacing="0.5">Smart Mortgage Platform</text>

  <!-- ── Central content (centered) ── -->

  <!-- Main headline: centered, two words split for size -->
  <text x="${CX}" y="280"
        font-family="Arial Black, Arial, sans-serif"
        font-size="72" font-weight="900" fill="white"
        text-anchor="middle">
    &#x05DE;&#x05D3;&#x05E8;&#x05D9;&#x05DB;&#x05D9; &#x05DE;&#x05E9;&#x05DB;&#x05E0;&#x05EA;&#x05D0;&#x05D5;&#x05EA;
  </text>
  <text x="${CX}" y="365"
        font-family="Arial Black, Arial, sans-serif"
        font-size="72" font-weight="900" fill="url(#accent)"
        text-anchor="middle">
    &#x05D7;&#x05DB;&#x05DE;&#x05D9;&#x05DD;
  </text>

  <!-- Subheadline -->
  <text x="${CX}" y="430"
        font-family="Arial, sans-serif"
        font-size="26" fill="#c7d2fe"
        text-anchor="middle">
    &#x05D6;&#x05DB;&#x05D0;&#x05D5;&#x05EA; &#xB7; &#x05DE;&#x05D7;&#x05D6;&#x05D5;&#x05E8; &#x05DE;&#x05E9;&#x05DB;&#x05E0;&#x05D0; &#xB7; &#x05D4;&#x05D5;&#x05DF; &#x05E2;&#x05E6;&#x05DE;&#x05D9; &#xB7; &#x05D8;&#x05D9;&#x05E4;&#x05D9;&#x05DD; &#x05E4;&#x05D9;&#x05E0;&#x05E0;&#x05E1;&#x05D9;&#x05D9;&#x05DD;
  </text>

  <!-- Accent divider -->
  <rect x="${CX - 120}" y="455" width="240" height="3" rx="2" fill="url(#accent)"/>

  <!-- Three pill tags (centered) -->
  <rect x="${CX - 390}" y="480" width="230" height="38" rx="19" fill="#312e81" opacity="0.9"/>
  <text x="${CX - 275}" y="505"
        font-family="Arial, sans-serif" font-size="17" fill="#a5b4fc" text-anchor="middle">
    &#x05D6;&#x05DB;&#x05D0;&#x05D5;&#x05EA; &#x05DC;&#x05DE;&#x05E9;&#x05DB;&#x05E0;&#x05D0;
  </text>

  <rect x="${CX - 120}" y="480" width="230" height="38" rx="19" fill="#312e81" opacity="0.9"/>
  <text x="${CX - 5}" y="505"
        font-family="Arial, sans-serif" font-size="17" fill="#a5b4fc" text-anchor="middle">
    &#x05DE;&#x05D7;&#x05D6;&#x05D5;&#x05E8; &#x05DE;&#x05E9;&#x05DB;&#x05E0;&#x05D0;
  </text>

  <rect x="${CX + 150}" y="480" width="230" height="38" rx="19" fill="#312e81" opacity="0.9"/>
  <text x="${CX + 265}" y="505"
        font-family="Arial, sans-serif" font-size="17" fill="#a5b4fc" text-anchor="middle">
    &#x05D4;&#x05D5;&#x05DF; &#x05E2;&#x05E6;&#x05DE;&#x05D9;
  </text>

  <!-- Bottom: domain left, count right -->
  <text x="80" y="${H - 36}"
        font-family="Arial, sans-serif" font-size="18" fill="#6366f1">finzo.co.il</text>

  <text x="${W - 80}" y="${H - 36}"
        font-family="Arial, sans-serif" font-size="18" fill="#6366f1" text-anchor="end">
    15+ expert articles
  </text>

  <!-- Bottom accent bar -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#accent)"/>
</svg>`;

await sharp(Buffer.from(svg))
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile("/home/user/mortgai/public/og-finzo.jpg");

console.log("og-finzo.jpg created successfully");
