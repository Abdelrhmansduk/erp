/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#141414',
        ink: '#141414',
        'on-primary': '#ffffff',
        'on-dark': '#ffffff',
        'canvas-night': '#141414',
        'canvas-night-elevated': '#262626',
        'canvas-light': '#ffffff',
        'canvas-cream': '#ffffff',
        'surface-elevated-dark': '#262626',
        'shade-30': '#e0e0e0',
        'shade-40': '#adadad',
        'shade-50': '#707070',
        'shade-60': '#262626',
        'shade-70': '#141414',
        'hairline-light': '#e0e0e0',
        'hairline-dark': '#262626',
        'aloe-10': '#f3f3f3',
        'pistachio-10': '#f3f3f3',
        'link-cool-1': '#707070',
        'link-cool-2': '#707070',
        'link-cool-3': '#707070',
        'link-mint': '#141414',
        // Mobbin Gallery-White Monochrome & Electric Blue Identity Palette
        champagne: {
          DEFAULT: '#141414',
          light: '#141414',
          dark: '#141414',
          pale: '#f3f3f3',
        },
        charcoal: {
          DEFAULT: '#f3f3f3',
          deep: '#f3f3f3',
        },
        accent: {
          DEFAULT: '#0066ff',
          light: '#f3f3f3',
          dark: '#141414',
          pale: '#f3f3f3',
        },
        // Legacy brand aliases mapped to Mobbin Monochrome
        alsalim: {
          teal: '#141414',
          gold: '#141414',
          purple: '#141414',
          dark: '#141414',
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
