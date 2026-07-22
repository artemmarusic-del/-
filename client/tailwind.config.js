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
        // Фирменный зелёный: 600 = #1A7A5B («зелёный»), 800 = #0E5B42 («хвоя»)
        brand: {
          50: "#eff9f5",
          100: "#d6f0e5",
          200: "#ade0cb",
          300: "#7ac9ac",
          400: "#45ac8a",
          500: "#23906d",
          600: "#1a7a5b",
          700: "#166350",
          800: "#0e5b42",
          900: "#0c4a37",
          950: "#062a20",
        },
        // Красная капля: 500 = #E23A3A
        accent: {
          50: "#fef3f2",
          100: "#fee2e1",
          200: "#fecac8",
          300: "#fca6a3",
          400: "#f7736e",
          500: "#e23a3a",
          600: "#cf2626",
          700: "#ae1d1d",
          800: "#901c1c",
          900: "#781d1d",
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
