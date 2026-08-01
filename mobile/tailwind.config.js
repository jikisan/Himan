/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Notebook design system — "digital shopping notebook"
        paper: {
          DEFAULT: '#F7F3E9', // light page
          dark: '#1C1B18', // dark page
        },
        rule: {
          DEFAULT: '#D8E3F0', // ruled line (light)
          dark: '#33465C', // ruled line (dark)
        },
        ink: {
          DEFAULT: '#2B2A26', // primary text (light)
          soft: '#6B675C', // secondary text (light)
          dark: '#EDE8DA', // primary text (dark)
          softdark: '#9A9382', // secondary text (dark)
        },
        margin: '#E07A5F', // red left-margin rule
        accent: {
          DEFAULT: '#3D5A80', // active / favorite (light)
          dark: '#98C1D9', // active / favorite (dark)
        },
        sticky: {
          DEFAULT: '#FFE8A3', // sticky-note
          dark: '#4A422A',
        },
      },
      fontFamily: {
        hand: ['Caveat_600SemiBold'],
        handbold: ['Caveat_700Bold'],
      },
    },
  },
  plugins: [],
};
