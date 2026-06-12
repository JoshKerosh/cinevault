/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f0f13',
        panel: '#16161d',
        border: '#2a2a35',
      },
    },
  },
  plugins: [],
}
