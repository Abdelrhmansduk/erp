/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        ink: '#000000',
        'on-primary': '#ffffff',
        'on-dark': '#ffffff',
        'canvas-night': '#000000',
        'canvas-night-elevated': '#0a0a0a',
        'canvas-light': '#ffffff',
        'canvas-cream': '#fbfbf5',
        'surface-elevated-dark': '#1e2c31',
        'shade-30': '#d4d4d8',
        'shade-40': '#a1a1aa',
        'shade-50': '#71717a',
        'shade-60': '#52525b',
        'shade-70': '#3f3f46',
        'hairline-light': '#e4e4e7',
        'hairline-dark': '#1e2c31',
        'aloe-10': '#c1fbd4',
        'pistachio-10': '#d4f9e0',
        'link-cool-1': '#9dabad',
        'link-cool-2': '#9797a2',
        'link-cool-3': '#bdbdca',
        'link-mint': '#d4b36a',
        // Warm Champagne Gold Luxury Identity Palette
        champagne: {
          DEFAULT: '#CFA64A',
          light: '#E4C77B',
          dark: '#A98232',
          pale: '#F5EDDC',
        },
        charcoal: {
          DEFAULT: '#1D2428',
          deep: '#14181B',
        },
        accent: {
          DEFAULT: '#CFA64A',
          light: '#E4C77B',
          dark: '#A98232',
          pale: '#F5EDDC',
        },
        // Legacy brand tints preserved for backward compatibility
        alsalim: {
          teal: '#005154',
          gold: '#CFA64A',
          purple: '#714B67',
          dark: '#1D2428',
        }
      },
      fontFamily: {
        display: ['"saudi_riyal"', '"NeueHaasGrotesk Display"', '"Inter Display"', '"Plus Jakarta Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['"saudi_riyal"', '"Inter Variable"', 'Inter', 'Tajawal', 'Cairo', 'sans-serif'],
        heading: ['"saudi_riyal"', 'Cairo', '"NeueHaasGrotesk Display"', '"Inter Display"', 'sans-serif'],
        body: ['"saudi_riyal"', '"Inter Variable"', 'Inter', 'Tajawal', 'sans-serif'],
        mono: ['"saudi_riyal"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontWeight: {
        330: '330',
        420: '420',
        550: '550',
      },
      borderRadius: {
        xs: '4px',
        sm: '5px',
        md: '8px',
        lg: '12px',
        xl: '20px',
        pill: '9999px',
      },
      boxShadow: {
        'level-0': 'none',
        'level-1': '0 1px 2px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
        'level-2': '0 0 0 1px rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.2)',
        'level-3': '0 8px 8px rgba(0,0,0,0.1), 0 4px 4px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.1)',
        'level-4': '0 25px 50px -12px rgba(0,0,0,0.25)',
      },
      spacing: {
        'xxs': '2px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'xxl': '32px',
        'huge': '64px',
      }
    },
  },
  plugins: [],
}
