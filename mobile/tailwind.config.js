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
        // Broadsheet "Notes-app minimalist" — one flat paper ground, one cyan accent.
        paper: {
          DEFAULT: '#f3f2f2', // light page
          dark: '#1a1918', // dark page
        },
        surface: {
          DEFAULT: '#eae9e9', // inputs / faint fills (light)
          dark: '#242220', // inputs / faint fills (dark)
        },
        rule: {
          DEFAULT: 'rgba(32,30,29,0.16)', // hairline (light)
          dark: 'rgba(236,233,230,0.16)', // hairline (dark)
        },
        ink: {
          DEFAULT: '#201e1d', // primary text (light)
          soft: '#7d7979', // secondary text (light)
          faint: '#9b9797', // faint text (light)
          dark: '#ece9e6', // primary text (dark)
          softdark: '#9b9590', // secondary text (dark)
          faintdark: '#736e69', // faint text (dark)
        },
        margin: '#aa0b56', // destructive (danger)
        accent: {
          DEFAULT: '#0088b0', // fills & icons (light)
          text: '#006786', // text-sized accent, meets contrast (light)
          dark: '#3bb6d8', // fills & icons (dark)
          textdark: '#5cc4e0', // text-sized accent (dark)
        },
        sticky: {
          DEFAULT: '#e9f8ff', // faint accent tint (banners)
          dark: '#0c2b34',
        },
      },
      fontFamily: {
        serif: ['SourceSerif4_400Regular'],
        serifsemi: ['SourceSerif4_600SemiBold'],
        serifitalic: ['SourceSerif4_400Regular_Italic'],
        // Legacy aliases — headings now render in Source Serif 4.
        hand: ['SourceSerif4_600SemiBold'],
        handbold: ['SourceSerif4_600SemiBold'],
      },
    },
  },
  plugins: [],
};
