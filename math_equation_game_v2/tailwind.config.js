/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        card: '#FFFFFF',
        brand: {
          sky: '#0284C7',
          'sky-light': '#E0F2FE',
          indigo: '#4F46E5',
          'indigo-light': '#EEF2FF',
        },
        peel: {
          emerald: '#059669',
          'emerald-bg': '#ECFDF5',
          'emerald-ring': '#34D399',
        },
        error: {
          rose: '#DC2626',
          'rose-bg': '#FEF2F2',
          'rose-ring': '#F87171',
        },
        sparkle: {
          amber: '#D97706',
          'amber-bg': '#FEF3C7',
        },
        tier: {
          round: '#2563EB',
          curly: '#7C3AED',
          square: '#D97706',
        }
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        body: ['Quicksand', 'Inter', 'system-ui', 'sans-serif'],
        math: ['KaTeX_Main', 'Cambria Math', 'STIX Two Math', 'serif'],
      },
      boxShadow: {
        'subtle': '0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'popover': '0 20px 30px -10px rgba(15, 23, 42, 0.12), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
        'emerald-glow': '0 0 15px 3px rgba(52, 211, 153, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake-blocked 0.4s ease-in-out',
        'bounce-short': 'bounce-short 0.5s ease',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'shake-blocked': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'bounce-short': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
