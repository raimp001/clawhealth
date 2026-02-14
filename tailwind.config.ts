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
        // TrumpRx-inspired dark navy + gold palette
        terra: {
          DEFAULT: "#C5A04E",
          light: "#D4B76A",
          dark: "#A88A3D",
          50: "#FCF9F0",
          100: "#F5EDD3",
          200: "#EBDAA8",
          500: "#C5A04E",
          600: "#A88A3D",
          700: "#8A702F",
        },
        cream: "#0B1426",
        pampas: "#111D35",
        sand: "#1E2D4A",
        cloudy: "#6B7A94",
        warm: {
          800: "#F1F3F7",
          700: "#D4D9E3",
          600: "#A3AEBF",
          500: "#7E8CA0",
        },
        accent: "#4CAF7D",
        "soft-red": "#E05A4F",
        "soft-blue": "#5B9BD5",
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
