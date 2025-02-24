import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
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
        'glow': '0 0 15px -3px rgba(59, 130, 246, 0.3)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #ddd 1px, transparent 1px), linear-gradient(to bottom, #ddd 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid-lg': '4rem 4rem',
      }
    },
  },
  plugins: [],
} satisfies Config;
