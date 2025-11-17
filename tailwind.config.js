import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fb',
          100: '#e9ecf6',
          200: '#cfd5eb',
          300: '#aab5d9',
          400: '#8592c5',
          500: '#6674ae',
          600: '#4e5b92',
          700: '#3e4773',
          800: '#2e3452',
          900: '#1f2335',
          950: '#111322'
        }
      },
      boxShadow: {
        soft: '0 10px 25px -15px rgba(15, 23, 42, 0.5)'
      }
    }
  },
  plugins: []
} satisfies Config

