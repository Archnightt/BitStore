/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        softblack: "#1A1A1A",
        beige: "#EFECE3",
        paleblue: "#8FABD4",
        deepblue: "#4A70A9",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neobrutalism': '4px 4px 0px 0px #1A1A1A',
      },
    },
  },
  plugins: [],
}