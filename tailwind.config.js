/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
        darkMode: 'class',
        theme: {
          extend: {
            keyframes: {
              fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
            },
            animation: {
              fadeIn: 'fadeIn 0.15s ease-out',
            },
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
            },
            colors: {
              'moura-yellow': {
                50: '#FFF5D9',
                100: '#FFEBC4',
                200: '#FFD88F',
                300: '#FEC75A',
                500: '#FDB813',
              },
              'moura-orange': {
                50: '#FEF3EE',
                100: '#FCD1B8',
                200: '#F9B396',
                300: '#F4804D',
                400: '#F26B35',
                500: '#F05523',
                600: '#DC4A1A',
                700: '#C44018',
                800: '#9C3415',
                900: '#7A2A12',
                950: '#43150A',
              },
              'moura-gray': {
                100: '#E7E8E9',
                300: '#D1D2D4',
                600: '#939598',
                900: '#58585A',
              }
            }
          }
        }
      };
