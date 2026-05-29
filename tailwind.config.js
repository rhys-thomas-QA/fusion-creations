module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        page: '#0a0a0f',
        surface: '#111118',
        card: '#1a1a24',
        border: '#242430',
        accent: '#3b82f6',
        'accent-hover': '#60a5fa',
        'text-primary': '#f1f5f9',
        'text-muted': '#94a3b8',
        'text-subtle': '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
