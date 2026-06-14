import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        wood: "#362016",
        walnut: "#604026",
        hearth: "#9c5b2c",
        ember: "#c9821f",
        moss: "#2f6f62",
        ruby: "#7b2d2d",
        tavern: "#2f4f6f",
        slate: "#6b7280",
        mauve: "#8b6f7a",
        ink: "#1f1f1f",
        parchment: "#f7f1e6",
        paper: "#fffaf0"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(59, 33, 22, 0.1)",
        tavern: "0 14px 34px rgba(59, 33, 22, 0.15)",
        insetPanel: "inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -1px 0 rgba(90,58,36,0.08)"
      }
    }
  },
  plugins: []
};

export default config;
