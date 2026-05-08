/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: { 50: "#fffdfb", 100: "#fdf8f0", 200: "#f5ebe0" },
        gold: { 400: "#e8b84d", 500: "#d4a017", 600: "#b8890f" },
        ocean: { 600: "#1e4a6e", 700: "#163a5a", 800: "#0f2840" },
        sunset: { 500: "#ea7c3c", 600: "#d96a2b" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -10px rgba(15, 40, 70, 0.12)",
        card: "0 4px 24px rgba(15, 40, 70, 0.08)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        pulseSoft: "pulseSoft 1.2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
      },
    },
  },
  plugins: [],
};
