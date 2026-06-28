/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        // legacy — keep intact, still used by existing pages
        sans: ['"Assistant"', '"Heebo"', '"Rubik"', "Arial", "sans-serif"],
        number: ['"Manrope"', '"Assistant"', "Arial", "sans-serif"],
        // FINZO design system v1.0
        serif: ['"Frank Ruhl Libre"', '"Times New Roman"', "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // legacy — keep intact
        mort: {
          ink: "#0b1720",
          text: "#243746",
          muted: "#64748b",
          emerald: "#059669",
          teal: "#0f766e",
          blue: "#2563eb",
          gold: "#b7791f",
          danger: "#dc2626",
        },
        surface: {
          DEFAULT: "#f8f9ff",
          low: "#eff4ff",
          mid: "#e5eeff",
          high: "#dce9ff",
        },
        // FINZO design system v1.0 — under `finzo` namespace, no conflicts
        finzo: {
          ink:       "#0A1733",
          "ink-2":   "#1A2A57",
          "ink-3":   "#4A5980",
          mute:      "#8090B0",
          paper:     "#EEF1F7",
          white:     "#FFFFFF",
          cream:     "#DDE5F0",
          "cream-2": "#C6D2E4",
          line:      "#DDE3EE",
          "line-2":  "#C1CADD",
          cobalt:    "#2C5BFF",
          "cobalt-d":"#1A3FCC",
          "cobalt-l":"#DCE7FF",
          azure:     "#6BA8FF",
          sky:       "#BFD7FF",
          teal:      "#0E3E6E",
          coral:     "#FF8A47",
          success:   "#1DAF6B",
          warning:   "#E0A93D",
          danger:    "#DA4949",
        },
      },
      boxShadow: {
        // legacy — keep intact
        luxury: "0 26px 80px rgba(13, 31, 37, 0.14)",
        soft:   "0 16px 45px rgba(13, 31, 37, 0.09)",
        glow:   "0 22px 55px rgba(5, 150, 105, 0.20)",
        // FINZO elevation tokens
        "e-1":     "0 1px 2px rgba(10,23,51,.04)",
        "e-2":     "0 4px 12px -4px rgba(10,23,51,.08)",
        "e-3":     "0 12px 24px -12px rgba(10,23,51,.14)",
        "e-4":     "0 24px 48px -24px rgba(10,23,51,.18)",
        "e-cobalt":"0 12px 24px -16px rgba(44,91,255,.55)",
        "neo":     "8px 8px 0 #0A1733",
      },
      borderRadius: {
        // FINZO radius tokens (Tailwind already has sm/md/lg/xl — using finzo- prefix)
        "finzo-xs":   "4px",
        "finzo-sm":   "6px",
        "finzo-md":   "10px",
        "finzo-lg":   "14px",
        "finzo-xl":   "18px",
        "finzo-pill": "999px",
      },
    },
  },
  plugins: [],
};
