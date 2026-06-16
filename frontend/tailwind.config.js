/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        niveshaay: {
          dark: '#0f4f2f',      // deep forest green (logo NIVESH text)
          mid: '#1f7a47',       // brand mid green
          light: '#73c075',     // light green leaves
          accent: '#9bd99c',    // soft accent
          cream: '#f6faf4',     // cream background
          ink: '#0f1c14',       // text on cream
          paper: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 6px rgba(15, 79, 47, 0.06), 0 8px 24px rgba(15, 79, 47, 0.08)',
      },
    },
  },
  plugins: [],
};
