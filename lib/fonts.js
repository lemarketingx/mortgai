// Self-hosted replacements for the Google Fonts previously loaded over the
// network from fonts.googleapis.com/fonts.gstatic.com. next/font downloads
// the font files at build time and serves them from our own origin, so
// there is no external font request at runtime, no render-blocking
// stylesheet fetch, and no layout shift from a late-swapping webfont
// (Next computes fallback-font metrics automatically).
import { Frank_Ruhl_Libre, Heebo, IBM_Plex_Mono, Assistant, Manrope } from "next/font/google";

export const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-frank-ruhl-libre",
  display: "swap",
});

export const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
  display: "swap",
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const fontVariables = [
  frankRuhlLibre.variable,
  heebo.variable,
  ibmPlexMono.variable,
  assistant.variable,
  manrope.variable,
].join(" ");
