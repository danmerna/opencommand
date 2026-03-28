/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0F14",
        surface: "#0F1419",
        accent: "#00D4AA",
        "accent-dark": "#00A888",
        "text-primary": "#E8EAED",
        "text-muted": "#6B7B8A",
        "layer-transactional": "#4A90D9",
        "layer-behavioral": "#9B6FCF",
        "layer-relationship": "#00D4AA",
        "layer-machine": "#D4883A",
        "layer-market": "#C8645A",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
