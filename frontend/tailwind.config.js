/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kibo: {
          primary: "#690BA8",
          deep: "#340771",
          magenta: "#E81778",
          coral: "#F16A65",
          lavender: "#F5EFFB",
          bg: "#F8F9FC",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(26, 12, 67, 0.05), 0 1px 2px -1px rgba(26, 12, 67, 0.05)",
        card: "0 4px 6px -1px rgba(105, 11, 168, 0.05), 0 2px 4px -2px rgba(105, 11, 168, 0.05)",
        elevated: "0 10px 25px -5px rgba(52, 7, 113, 0.08), 0 8px 10px -6px rgba(52, 7, 113, 0.04)",
        brand: "0 10px 25px -5px rgba(105, 11, 168, 0.25)",
      },
    },
  },
  plugins: [],
};