/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eefbf6",
          100: "#d5f3e6",
          200: "#ade6d0",
          300: "#79d2b4",
          400: "#49b895",
          500: "#2b9c7c",
          600: "#1e7d64",
          700: "#1a6452",
          800: "#175043",
          900: "#154238",
          950: "#082720",
        },
        accent: {
          50: "#fdf3f4",
          100: "#fbe6e9",
          200: "#f7d0d7",
          300: "#f0a9b6",
          400: "#e57892",
          500: "#d54d70",
          600: "#bc305a",
          700: "#9c244b",
          800: "#832143",
          900: "#711f3d",
        },
      },
      boxShadow: {
        soft: "0 2px 8px 0 rgb(0 0 0 / 0.06), 0 1px 2px 0 rgb(0 0 0 / 0.04)",
        card: "0 4px 24px -4px rgb(0 0 0 / 0.08), 0 2px 8px -2px rgb(0 0 0 / 0.04)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
