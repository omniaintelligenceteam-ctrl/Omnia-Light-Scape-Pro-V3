/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx,js,jsx}',
    '!./node_modules/**',
    '!./dist/**',
    '!./backend/**',
    '!./api/**',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        omnia: {
          gold: '#F6B45A',
          light: '#E3F2FD',
        }
      }
    }
  },
  plugins: [],
}
