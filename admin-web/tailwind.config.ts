import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07111f",
        panel: "#0d1728",
        panel2: "#111c30",
        line: "rgba(148,163,184,0.15)",
        text: "#e5eefb",
        muted: "#93a4be",
        accent: "#67e8f9",
        accent2: "#8b5cf6",
        good: "#22c55e",
        warn: "#f59e0b",
        bad: "#ef4444"
      },
      boxShadow: {
        glow: "0 20px 60px rgba(15, 23, 42, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
