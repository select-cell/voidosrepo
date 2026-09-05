/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // VoidOS-Markenfarben (aus dem Landingpage-Screenshot übernommen):
        // Terracotta/Kupfer als Akzent statt des ursprünglichen Blau.
        brand: {
          50: '#fbf3ec',
          100: '#f5e3d3',
          200: '#eac6a8',
          300: '#dea87c',
          400: '#d28f5f',
          500: '#c97c4e',
          600: '#b76a3e',
          700: '#97542f',
          800: '#784023',
          900: '#5c2f19',
        },
        // Warme Neutraltöne statt kühlem Blaugrau, passend zum
        // Creme/Espresso-Look der Landingpage. Überschreibt Tailwinds
        // Standard-`slate`, damit alle bestehenden slate-*-Klassen im
        // Code automatisch mitziehen, ohne jede Komponente anzufassen.
        slate: {
          50: '#f8f5f0',
          100: '#f0eae1',
          200: '#e3d9cb',
          300: '#cdbfac',
          400: '#a99a85',
          500: '#8c7b65',
          600: '#6e5d48',
          700: '#53442f',
          800: '#382d1e',
          900: '#241a14',
        },
      },
    },
  },
  plugins: [],
}
