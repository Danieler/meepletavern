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
        hearth: "#9c5b2c",
        ember: "#c77b2b",
        moss: "#2f6f62",
        ruby: "#8f3048",
        ink: "#1d2530",
        parchment: "#f7f0df"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(29, 37, 48, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

