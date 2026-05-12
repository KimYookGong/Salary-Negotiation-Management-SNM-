/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#014421",
        secondary: "#003C71",
        "accent-1": "#A4D65E",
        "accent-2": "#FF6A13",
      },
    },
  },
  plugins: [],
}
