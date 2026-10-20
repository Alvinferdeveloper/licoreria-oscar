/** @type {import('tailwindcss').Config} */
// Tokens del sistema de diseño mapeados — nunca hardcodear hex en componentes
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          copper: 'rgb(var(--brand-copper-rgb) / <alpha-value>)',
          'copper-strong': 'var(--brand-copper-strong)',
          amber: 'var(--brand-amber)',
          cava: 'var(--brand-cava)',
          'cava-soft': 'var(--brand-cava-soft)',
        },
        surface: {
          base: 'var(--surface-base)',
          card: 'var(--surface-card)',
          sunken: 'rgb(var(--surface-sunken-rgb) / <alpha-value>)',
        },
        border: 'var(--border-hairline)',
        ink: 'var(--text-ink)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        'on-cava': 'var(--text-on-cava)',
        'on-cava-muted': 'var(--text-on-cava-muted)',
        status: {
          success: 'rgb(var(--status-success-rgb) / <alpha-value>)',
          danger: 'rgb(var(--status-danger-rgb) / <alpha-value>)',
          warning: 'rgb(var(--status-warning-rgb) / <alpha-value>)',
          info: 'rgb(var(--status-info-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        'display-lg': ['40px', { lineHeight: '1.1' }],
        'display-md': ['28px', { lineHeight: '1.15' }],
        h1: ['24px', { lineHeight: '1.25' }],
        h2: ['18px', { lineHeight: '1.3' }],
        body: ['14px', { lineHeight: '1.5' }],
        small: ['12px', { lineHeight: '1.4' }],
        'mono-base': ['14px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
      },
      boxShadow: {
        'elevation-1': '0 4px 16px rgba(36,28,21,0.12)',
        'elevation-2': '0 12px 32px rgba(36,28,21,0.18)',
      },
    },
  },
  plugins: [],
};
