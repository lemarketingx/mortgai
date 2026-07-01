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
        // FINZO brand purple — overrides Tailwind's built-in violet-* scale so every
        // existing `violet-*` utility class across the app repaints to the new brand hue.
        violet: {
          50:  "#F5F1FF",
          100: "#EDE5FF",
          200: "#DCCBFF",
          300: "#C3A3FF",
          400: "#A473FF",
          500: "#8C52FF",
          600: "#7B3DFF",
          700: "#6423E8",
          800: "#4F1AC2",
          900: "#3D1494",
          950: "#241064",
        },
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
        // FINZO design system v2.0 — purple/pink brand refresh, under `finzo` namespace
        finzo: {
          purple:    "#7B3DFF",
          pink:      "#FF2EA6",
          navy:      "#0B132B",
          light:     "#F6F4FF",
          ink:       "#0B132B",
          "ink-2":   "#1A2A57",
          "ink-3":   "#4A5980",
          mute:      "#64748B",
          paper:     "#F6F4FF",
          white:     "#FFFFFF",
          cream:     "#EDE5FF",
          "cream-2": "#DCCBFF",
          line:      "#E4E0F5",
          "line-2":  "#D3CBEC",
          cobalt:    "#7B3DFF",
          "cobalt-d":"#6423E8",
          "cobalt-l":"#EDE5FF",
          azure:     "#6BA8FF",
          sky:       "#BFD7FF",
          teal:      "#0E3E6E",
          coral:     "#FF2EA6",
          success:   "#1DAF6B",
          warning:   "#E0A93D",
          danger:    "#DA4949",
        },
      },
      backgroundImage: {
        "finzo-gradient": "linear-gradient(135deg, #7B3DFF 0%, #FF2EA6 100%)",
      },
      boxShadow: {
        // legacy — keep intact
        luxury: "0 26px 80px rgba(13, 31, 37, 0.14)",
        soft:   "0 16px 45px rgba(13, 31, 37, 0.09)",
        glow:   "0 22px 55px rgba(123, 61, 255, 0.20)",
        // FINZO elevation tokens
        "e-1":     "0 1px 2px rgba(10,23,51,.04)",
        "e-2":     "0 4px 12px -4px rgba(10,23,51,.08)",
        "e-3":     "0 12px 24px -12px rgba(10,23,51,.14)",
        "e-4":     "0 24px 48px -24px rgba(10,23,51,.18)",
        "e-cobalt":"0 12px 24px -16px rgba(123,61,255,.45)",
        "neo":     "8px 8px 0 #0B132B",
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
