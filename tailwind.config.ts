import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CONSOLE palette — lifted from console.jsx
        bg:      '#0e1014',
        panel:   '#14171d',
        panelHi: '#1a1e26',
        ink:     '#e6e8ed',
        inkMid:  '#b4b9c5',
        inkDim:  '#8a8f9c',
        rule:    'rgba(255,255,255,0.06)',
        accent:  '#a7f3b4', // soft green
        accent2: '#ffd27a', // warm amber
        accent3: '#7db6ff', // blue
        red:     '#ff8a7a',
        pink:    '#ff9ad6',
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Match the original's compact typographic scale
        'micro': ['10px', { lineHeight: '1.2' }],
      },
      letterSpacing: {
        'label': '0.14em',
      },
      borderRadius: {
        'card': '14px',
      },
    },
  },
  plugins: [],
};

export default config;
