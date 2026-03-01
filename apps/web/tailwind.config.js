/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ChaserNet design tokens — mirrors CSS vars in index.css
        bg:       '#060A12',
        panel:    '#0C1526',
        card:     '#111E35',
        border:   '#1C2E4A',
        borderhi: '#2A4468',
        blue:     '#38BDF8',
        amber:    '#F59E0B',
        green:    '#10B981',
        red:      '#EF4444',
        violet:   '#8B5CF6',
        orange:   '#F97316',
        t1:       '#DCE4F7',
        t2:       '#6B7A9E',
        t3:       '#3A4460',
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Fira Code'", "'Cascadia Code'", 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
