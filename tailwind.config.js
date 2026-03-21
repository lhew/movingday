/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        movingday: {
          primary: '#f59e0b',       // amber - warmth of a new chapter
          'primary-content': '#1c1917',
          secondary: '#0ea5e9',     // sky blue - open skies ahead
          'secondary-content': '#ffffff',
          accent: '#10b981',        // emerald - fresh start
          'accent-content': '#ffffff',
          neutral: '#374151',
          'neutral-content': '#f3f4f6',
          'base-100': '#fafafa',
          'base-200': '#f4f4f5',
          'base-300': '#e4e4e7',
          'base-content': '#1c1917',
          info: '#3b82f6',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      'light',
      'dark',
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};
