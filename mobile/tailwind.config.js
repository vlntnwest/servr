/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DMSans_400Regular"],
        display: ["ArchivoBlack_400Regular"],
        "sans-light": ["DMSans_300Light"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-semibold": ["DMSans_600SemiBold"],
        "sans-italic": ["DMSans_400Regular_Italic"],
        "sans-bold-italic": ["DMSans_700Bold_Italic"],
      },
      fontSize: {
        caption: "11px",
        action: "12px",
        "body-sm": "13px",
        body: "15px",
        heading: "22px",
        "card-label": "32px",
        "display-sm": "42px",
        display: "56px",
      },
      letterSpacing: {
        cta: "0.02em",
        pill: "0.04em",
        meta: "0.06em",
        label: "0.08em",
        eyebrow: "0.1em",
        section: "0.14em",
      },
      borderWidth: {
        hairline: "1.5px",
      },
      spacing: {
        13: "52px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          cream: "#F5EFE0",
          sand: "#E8E0CE",
          ink: "#1A1A1A",
          stone: "#8A7F72",
          orange: "#E8521C",
          maroon: "#6B1A1A",
          lime: "#A8D040",
          yellow: "#F0C030",
          pink: "#E840B0",
          forest: "#1A4A20",
        },
      },
    },
  },
  plugins: [],
};
