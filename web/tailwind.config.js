/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#0B3D2E",
          dark: "#082F24",
          deep: "#051F18",
        },
        emerald: {
          brand: "#22C55E",
          light: "#35E77B",
        },
        gold: {
          brand: "#FACC15",
          light: "#FFD83D",
        },
        ivory: "#F8FAF6",
        charcoal: "#1F2937",
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      height: {
        "18": "4.5rem",
      },
      borderWidth: {
        "3": "3px",
      },
    },
  },
  plugins: [],
};
