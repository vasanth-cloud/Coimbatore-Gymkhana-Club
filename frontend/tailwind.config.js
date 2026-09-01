/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bar: {
          dark: '#0d1117',
          card: '#161b22',
          border: '#21262d',
          accent: '#d97706', // Amber gold accent
          gold: '#f59e0b',
          neon: '#10b981', // Emerald green accent
          purple: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}
