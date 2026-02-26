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
        // OpenRx 2026 UI system — bright, trusted, high-contrast
        terra: {
          DEFAULT: "#F05A3D",
          light: "#F47F5C",
          dark: "#CF4326",
          50: "#FFF2EE",
          100: "#FFE5DD",
          200: "#FFC7B7",
          500: "#F05A3D",
          600: "#CF4326",
          700: "#A7351D",
        },
        cream: "#F3F8F6",
        pampas: "#FFFFFF",
        sand: "#DCE9E4",
        cloudy: "#6C7D75",
        warm: {
          800: "#14231F",
          700: "#243530",
          600: "#3E524A",
          500: "#677A72",
        },
        accent: "#1FA971",
        "soft-red": "#D1495B",
        "soft-blue": "#1E88B6",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        "soft-card": "0 10px 28px rgba(20, 35, 31, 0.08)",
        "topbar": "0 8px 20px rgba(20, 35, 31, 0.06)",
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
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease",
        "slide-up": "slide-up 0.5s ease",
        "float-slow": "float-slow 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
export default config
