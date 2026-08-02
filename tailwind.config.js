/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00ffff',
        'neon-purple': '#8b5cf6',
        'dark-bg': '#0a0a0f',
      },
      boxShadow: {
        'neon': '0 0 20px #00ffff, 0 0 40px #8b5cf6',
      },
    },
  },
  plugins: [],
};