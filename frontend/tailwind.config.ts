import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system — locked, do not deviate
        cream: "#faf9f6",        // Background
        terracotta: "#c84b11",   // Accent / CTA
        forest: "#2d7a4f",       // Green (kept promises, safe seats)
        crimson: "#c0392b",      // Red (false, danger, broken)
        gold: "#b8860b",         // Yellow (partial, warning)
        navy: "#1a5276",         // Blue (info, TVK)

        // Party colors
        dmk: "#c0392b",
        aiadmk: "#2d7a4f",
        tvk: "#1a5276",
        bjp: "#d35400",
        ntk: "#6c3483",
        inc: "#1565c0",
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        tamil: ["Noto Serif Tamil", "serif"],
      },
      borderRadius: {
        card: "14px",
        badge: "9px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
