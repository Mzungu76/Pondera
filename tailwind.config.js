/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf7f2',
        surface: '#fffdf9',
        ink: { DEFAULT: '#23221f', soft: '#4a4843', mute: '#6f6c65' },
        line: '#e6e0d5',
        navy: { DEFAULT: '#1f3a5f', dark: '#16294a', soft: '#e8edf4' },
        amber: { risk: '#9a5b0b', soft: '#fbf0dc', line: '#e8cf9c' },
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', 'Charter', 'Georgia', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { rise: 'rise .35s ease-out both' },
    },
  },
  plugins: [],
};
