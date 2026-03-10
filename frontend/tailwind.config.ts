import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1f4493",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#e67400",
        },
        muted: {
          DEFAULT: "rgba(208, 208, 208, 0.12)",
          foreground: "#676767",
        },
        border: "rgba(0, 0, 0, 0.08)",
        background: "rgba(208, 208, 208, 0.12)",
        foreground: "#1a1a1a",
      },
      fontFamily: {
        sans: ["Roboto Condensed", "sans-serif"],
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
