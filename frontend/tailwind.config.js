/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dae7ff',
          200: '#bdd2ff',
          300: '#8fb4ff',
          400: '#5a8cff',
          500: '#3464ff',
          600: '#1f44f5',
          700: '#1a34db',
          800: '#1b2eb0',
          900: '#1e2e8a',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#64748b',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(15, 23, 42, 0.15)',
        glass: '0 8px 32px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #3464ff 0%, #8b5cf6 50%, #ec4899 100%)',
        'hero-glow':
          'radial-gradient(circle at 20% 20%, rgba(52,100,255,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.10) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
};
