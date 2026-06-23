/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Aligned with index.css CSS variables (Obsidian dark theme)
        gdt: {
          'bg-root': '#1e1e1e',
          'bg-panel': '#262626',
          'bg-surface': '#2a2a2a',
          'bg-hover': 'rgba(255,255,255,0.08)',
          'bg-active': 'rgba(255,255,255,0.12)',
          'text-primary': '#dadada',
          'text-secondary': '#999999',
          'text-tertiary': '#666666',
          'accent': '#a882ff',
          'border-subtle': 'rgba(255,255,255,0.06)',
          'border-medium': 'rgba(255,255,255,0.1)',
        },
        gdtl: {
          'bg-root': '#ffffff',
          'bg-panel': '#f5f5f5',
          'bg-surface': '#fafafa',
          'bg-hover': 'rgba(0,0,0,0.05)',
          'bg-active': 'rgba(0,0,0,0.09)',
          'text-primary': '#222222',
          'text-secondary': '#5c5c5c',
          'text-tertiary': '#7c7c7c',
          'accent': '#8b7cf7',
          'border-subtle': 'rgba(0,0,0,0.08)',
          'border-medium': 'rgba(0,0,0,0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      borderRadius: {
        ide: '4px',
      },
    },
  },
  plugins: [],
};
