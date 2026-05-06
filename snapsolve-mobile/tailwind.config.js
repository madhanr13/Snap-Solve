/**
 * Tailwind CSS Configuration for NativeWind
 * Customizes color palette for the "Industrial Minimalist" design system
 */

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome palette
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Semantic colors (limited palette)
        green: {
          50: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
        },
        yellow: {
          50: '#fef3c7',
          400: '#facc15',
          500: '#eab308',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          600: '#dc2626',
        },
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        xl: '12px',
      },
      shadowColor: {
        sm: 'rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
