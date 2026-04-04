/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ocean: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        risk: {
          low:    '#22c55e',
          medium: '#f59e0b',
          high:   '#ef4444',
        },
      },
      backgroundImage: {
        'gradient-ocean': 'linear-gradient(135deg, #0c4a6e 0%, #082f49 50%, #020617 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(8,47,73,0.6) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(14,165,233,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(14,165,233,0.8), 0 0 40px rgba(14,165,233,0.3)' },
        },
      },
    },
  },
  plugins: [],
}
