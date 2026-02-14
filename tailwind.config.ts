import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TrumpRx-matched palette — very dark navy + gold
        terra: {
          DEFAULT: "#C5A04E",  // Gold accent
          light: "#D9B96B",
          dark: "#A8883B",
          50: "#1A1610",
          100: "#2A2315",
          200: "#3D321D",
          500: "#C5A04E",
          600: "#A8883B",
          700: "#8A702F",
        },
        cream: "#060D1B",      // Main background — near black navy
        pampas: "#0C1628",     // Card/surface background
        sand: "#162040",       // Borders
        cloudy: "#5A6B84",     // Muted text
        warm: {
          800: "#FFFFFF",      // Primary text — pure white
          700: "#E2E7EF",      // Secondary text
          600: "#B0BAC9",      // Tertiary text
          500: "#7E8CA2",      // Quaternary text
        },
        accent: "#4CAF7D",     // Green for success
        "soft-red": "#E05A4F", // Red for errors/alerts
        "soft-blue": "#5B9BD5",// Blue for info
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease",
        "slide-up": "slide-up 0.5s ease",
      },
    },
  },
  plugins: [],
}
export default config
