/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#005293',
        compliant: '#22c55e',
        noncompliant: '#ef4444',
        neutral: '#9ca3af',
      }
    },
  },
  plugins: [],
}
