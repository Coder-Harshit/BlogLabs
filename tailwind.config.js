module.exports = {
  theme: {
    extend: {
      animation: {
        flicker: 'flicker 0.15s infinite alternate',
      },
      keyframes: {
        flicker: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.98' }
        }
      }
    },
  },
  // ...
}
