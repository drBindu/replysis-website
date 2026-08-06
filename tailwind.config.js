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
        // ── Verchor · Light + Terracotta ──
        // The accent layer is `zinc-*`; redefine it to a terracotta ramp so
        // every accent (buttons, links, chips, gradients) turns terracotta.
        zinc: {
          50:  '#EEF7EF',
          100: '#D6EAD8',
          200: '#ADD6B2',
          300: '#7DBD86',
          400: '#4DA35E',
          500: '#2E8B45',
          600: '#21924A',
          700: '#1C7A3E',
          800: '#186433',
          900: '#14532B',
          950: '#0E3D20',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          soft:    '#FAFAF9',
          sunken:  '#F4F4F5',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          strong:  '#18181B',
          soft:    '#3F3F46',
          muted:   '#71717A',
          faint:   '#A1A1AA',
        },
        line: {
          DEFAULT: '#ECECEC',
          strong:  '#DEDEDE',
        },
        'dark-bg': '#0a0a0f',
      },
      boxShadow: {
        'premium':    '0 4px 14px rgba(9,9,11,0.07), 0 2px 5px rgba(9,9,11,0.05)',
        'premium-lg': '0 18px 50px rgba(9,9,11,0.10), 0 6px 16px rgba(9,9,11,0.06)',
        'premium-xl': '0 34px 84px rgba(9,9,11,0.12), 0 10px 24px rgba(9,9,11,0.08)',
      },
    },
  },
  plugins: [],
};