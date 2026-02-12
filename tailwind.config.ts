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
        terra: {
          DEFAULT: "#C15F3C",
          light: "#D4836A",
          dark: "#A04E30",
          50: "#FEF6F3",
          100: "#FBEAE3",
          200: "#F5CDBF",
          500: "#C15F3C",
          600: "#A04E30",
          700: "#7E3D25",
        },
        cream: "#F4F3EE",
        pampas: "#EDE9E0",
        sand: "#D9D2C5",
        cloudy: "#B1ADA1",
        warm: {
          800: "#3D2E24",
          700: "#5C4A3D",
          600: "#7A6B5D",
          500: "#96887A",
        },
        accent: "#2D6A4F",
        "soft-red": "#B85042",
        "soft-blue": "#4A7C96",
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
