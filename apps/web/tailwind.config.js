/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0f0f0f',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#262626',
        'bg-card': '#1f1f1f',
        
        // Text
        'text-primary': '#f5f5f5',
        'text-secondary': '#a3a3a3',
        'text-muted': '#737373',
        
        // Habit intensity (GitHub-style)
        'habit-none': '#161b22',
        'habit-low': '#0e4429',
        'habit-medium': '#006d32',
        'habit-high': '#26a641',
        'habit-max': '#39d353',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
