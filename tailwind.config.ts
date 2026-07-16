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
        /* Brand foundation */
        wood: "#2C1810",
        walnut: "#604026",
        ember: "#C17B1A",
        ink: "#1C1210",
        parchment: "#F2EAE0",
        paper: "#FFFBF4",

        /* Action (green forest) */
        action: {
          DEFAULT: "#2D7A6B",
          hover: "#236054",
          subtle: "#E8F3F0",
          light: "#5BA899"
        },

        /* Accent (amber/gold) */
        accent: {
          DEFAULT: "#C17B1A",
          hover: "#A66815",
          subtle: "#F5E6CC",
          light: "#E8B44F"
        },

        /* Semantic */
        error: {
          DEFAULT: "#C4423A",
          subtle: "#FDF0EF"
        },

        /* Surfaces */
        surface: {
          base: "#F6F1EA",
          card: "#FFFBF4",
          muted: "#EDE6D9",
          dark: "#1C1210",
          "dark-hover": "#2A1B14"
        },

        /* Text */
        "text-primary": "#2C1810",
        "text-secondary": "#6B5344",
        "text-tertiary": "#9C8B7E",
        "text-on-dark": "#F2EAE0",
        "text-on-dark-muted": "#B8A99A",

        /* Borders */
        "border-default": "#DDD4C8",
        "border-subtle": "#EDE6D9",
        "border-strong": "#C4B8A8"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(44, 24, 16, 0.08)",
        tavern: "0 14px 34px rgba(44, 24, 16, 0.12)",
        insetPanel: "inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -1px 0 rgba(90,58,36,0.08)"
      },
      letterSpacing: {
        eyebrow: "0.12em",
        ui: "0.02em"
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem" }],
        caption: ["0.75rem", { lineHeight: "1.1rem" }],
        ui: ["0.875rem", { lineHeight: "1.35rem" }],
        body: ["1rem", { lineHeight: "1.6" }],
        subhead: ["1.125rem", { lineHeight: "1.4" }],
        heading: ["1.375rem", { lineHeight: "1.25" }],
      }
    }
  },
  plugins: []
};

export default config;
