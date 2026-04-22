/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 18px 45px rgba(24, 33, 28, 0.08)',
      },
      colors: {
        paper: {
          50: '#fbf7ee',
          100: '#f3ecdd',
          200: '#e7dec8',
        },
        signal: {
          400: '#72f2a3',
          500: '#39d887',
          700: '#176648',
        },
        ink: {
          950: '#142018',
          700: '#46604f',
          500: '#7c8f82',
        },
      },
      animation: {
        shimmer: 'shimmer 2.8s linear infinite',
        floaty: 'floaty 9s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
      },
    },
  },
  plugins: [],
}
