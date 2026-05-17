/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6C47FF', hover: '#5535e0', light: '#ede9ff' },
        accent: '#FF6B6B',
      }
    }
  },
  plugins: []
}
