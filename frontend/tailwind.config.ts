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
        accent: "var(--accent)",
        muted: "var(--text-muted)",
        zinc: {
          850: "#1f1f23",
          925: "#111113",
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: ["Syne", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-emerald": "0 0 20px rgba(16,185,129,0.15), 0 0 40px rgba(16,185,129,0.05)",
        "glow-amber": "0 0 20px rgba(245,158,11,0.15), 0 0 40px rgba(245,158,11,0.05)",
        "glow-blue": "0 0 20px rgba(59,130,246,0.15), 0 0 40px rgba(59,130,246,0.05)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
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
