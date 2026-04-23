/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/tailwind/native")],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#1B3A2D",
        },
      },
    },
  },
  plugins: [],
};
