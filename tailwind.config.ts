import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'bounce-right': 'bounce-right 1s infinite',
      },
      keyframes: {
        'bounce-right': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(3px)' },
        }
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      transitionDuration: {
        '250': '250ms',
      },
      boxShadow: {
        'hover': '0 0 15px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};

export default config;
