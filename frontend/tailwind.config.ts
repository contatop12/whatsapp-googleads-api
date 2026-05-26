import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        foreground: "var(--text-primary)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          light: "var(--accent-light)",
        },
        muted: "var(--text-muted)",
        comic: {
          red: "var(--accent)",
          "red-dim": "var(--accent-dim)",
          blue: "var(--comic-blue)",
          "blue-dim": "var(--comic-blue-dim)",
          yellow: "var(--comic-yellow)",
          "yellow-dim": "var(--comic-yellow-dim)",
        },
        zinc: {
          850: "#1f1f23",
          925: "#111113",
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: ["Syne", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        comic: ["Bangers", "Syne", "cursive"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        full: "9999px",
      },
      boxShadow: {
        "comic": "3px 3px 0px rgba(0,0,0,0.95)",
        "comic-lg": "5px 5px 0px rgba(0,0,0,0.95)",
        "comic-red": "3px 3px 0px #C41525",
        "comic-blue": "3px 3px 0px #0D3D99",
        "comic-yellow": "3px 3px 0px #D4B800",
        "comic-inner": "inset 2px 2px 0px rgba(0,0,0,0.5)",
        "card": "4px 4px 0px rgba(0,0,0,0.9)",
        "card-hover": "5px 5px 0px rgba(0,0,0,0.95)",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
