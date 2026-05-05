/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Assistant"', '"Heebo"', '"Rubik"', "Arial", "sans-serif"],
        number: ['"Manrope"', '"Assistant"', "Arial", "sans-serif"],
      },
      colors: {
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
      },
      boxShadow: {
        luxury: "0 26px 80px rgba(13, 31, 37, 0.14)",
        soft: "0 16px 45px rgba(13, 31, 37, 0.09)",
        glow: "0 22px 55px rgba(5, 150, 105, 0.20)",
      },
    },
  },
  plugins: [],
};
