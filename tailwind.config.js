/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wedding-gold': '#D4AF37', 
        'wedding-dark': '#1A1A1A',
        'wedding-light': '#F9F6F0'
      },
      fontFamily: {
        'accent': ['"Playfair Display"', 'serif'],
        'sans': ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}