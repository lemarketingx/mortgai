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
        // ============================================================
        // FINZO brand tokens — single source of truth for color.
        // Every value here is derived from the FINZO / FINZO PRO logo
        // (violet → magenta gradient mark + deep navy wordmark).
        // Do not hardcode Tailwind palette names (blue/emerald/violet/
        // red/...) or raw hex in components — use these tokens instead.
        // ============================================================

        // brand.* — the public, consumer-facing FINZO identity.
        // Primary = the logo's violet. Accent = the logo's magenta tip.
        // Used across the marketing site, calculator, lead forms.
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
          DEFAULT: "#6d28d9",
          primary: "#6d28d9",
          "primary-hover": "#5b21b6",
          secondary: "#0A1733",
          accent: "#F00090",
          "accent-hover": "#BB0070",
          background: "#f8f9ff",
          surface: "#ffffff",
          border: "#ede9fe",
          text: "#0b1720",
          "text-soft": "#243746",
          muted: "#64748b",
        },

        // accent.* — full magenta ramp (the logo's pink tip), for
        // secondary CTAs, highlights and gradient tails.
        accent: {
          50: "#fff0f9",
          100: "#ffe4f4",
          200: "#ffcbea",
          300: "#ffa1d9",
          400: "#ff63c1",
          500: "#ff1da5",
          600: "#F00090",
          700: "#bb0070",
          800: "#9e005f",
          900: "#880052",
          950: "#570034",
          DEFAULT: "#F00090",
        },

        // pro.* — the FINZO PRO identity (advisor CRM / Back Office).
        // Same violet-to-magenta family as brand.*, but led by the deep
        // navy ink from the wordmark for a denser, professional,
        // dashboard-grade surface — related to FINZO, not identical.
        pro: {
          ink: "#0A1733",
          "ink-2": "#1A2A57",
          "ink-3": "#4A5980",
          mute: "#8090B0",
          paper: "#EEF1F7",
          white: "#FFFFFF",
          cream: "#DDE5F0",
          "cream-2": "#C6D2E4",
          line: "#DDE3EE",
          "line-2": "#C1CADD",
          cobalt: "#7B3DFF",
          "cobalt-d": "#5B21B6",
          "cobalt-l": "#EDE4FF",
          azure: "#A78BFA",
          sky: "#DDD6FE",
          teal: "#0E3E6E",
          magenta: "#FF2EA6",
          "magenta-d": "#C2187D",
          "magenta-l": "#FFE1F2",
          coral: "#FF8A47",
          // semantic aliases (the vocabulary used across pro screens)
          primary: "#7B3DFF",
          "primary-hover": "#5B21B6",
          secondary: "#0A1733",
          accent: "#FF2EA6",
          background: "#EEF1F7",
          surface: "#FFFFFF",
          border: "#DDE3EE",
          text: "#0A1733",
          muted: "#8090B0",
        },

        // Shared semantic states — consistent across brand and pro.
        // Reserved for real success/warning/danger meaning only.
        success: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
          400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857",
          800: "#065f46", 900: "#064e3b", 950: "#022c22", DEFAULT: "#059669",
        },
        warning: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
          400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309",
          800: "#92400e", 900: "#78350f", 950: "#451a03", DEFAULT: "#f59e0b",
        },
        danger: {
          50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5",
          400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c",
          800: "#991b1b", 900: "#7f1d1d", 950: "#450a0a", DEFAULT: "#dc2626",
        },

        // legacy — kept for compatibility, repointed to brand ink/muted
        // instead of the old blue/emerald/gold set.
        mort: {
          ink: "#0b1720",
          text: "#243746",
          muted: "#64748b",
          emerald: "#059669",
          teal: "#0f766e",
          blue: "#6d28d9",
          gold: "#b7791f",
          danger: "#dc2626",
        },
        // legacy light-background scale — retinted to the brand's violet
        // wash instead of the old blue wash.
        surface: {
          DEFAULT: "#f9f7ff",
          low: "#f5f3ff",
          mid: "#ede9fe",
          high: "#ddd6fe",
        },
      },
      boxShadow: {
        // legacy — keep intact
        luxury: "0 26px 80px rgba(13, 31, 37, 0.14)",
        soft:   "0 16px 45px rgba(13, 31, 37, 0.09)",
        glow:   "0 22px 55px rgba(109, 40, 217, 0.20)",
        // FINZO PRO elevation tokens
        "pro-1":       "0 1px 2px rgba(10,23,51,.04)",
        "pro-2":       "0 4px 12px -4px rgba(10,23,51,.08)",
        "pro-3":       "0 12px 24px -12px rgba(10,23,51,.14)",
        "pro-4":       "0 24px 48px -24px rgba(10,23,51,.18)",
        "pro-primary": "0 12px 24px -16px rgba(123,61,255,.45)",
        "neo":         "8px 8px 0 #0A1733",
      },
      borderRadius: {
        // FINZO PRO radius tokens (Tailwind already has sm/md/lg/xl)
        "pro-xs":   "4px",
        "pro-sm":   "6px",
        "pro-md":   "10px",
        "pro-lg":   "14px",
        "pro-xl":   "18px",
        "pro-pill": "999px",
      },
    },
  },
  plugins: [],
};
