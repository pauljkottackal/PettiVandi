import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#0B6157',
          dark: '#094d45',
          light: '#0d7a6e',
        },
        amber: {
          DEFAULT: '#E8820C',
          dark: '#c46e09',
          light: '#f0943a',
        },
        stone: {
          DEFAULT: '#F5F2EE',
          dark: '#E8E3DC',
        },
        text: '#1A1A1A',
        muted: '#7A8694',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
    },
  },
  plugins: [],
}

export default config
