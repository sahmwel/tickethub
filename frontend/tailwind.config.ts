import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0C",
        panel: "#131316",
        panel2: "#1A1A1F",
        line: "#26262C",
        gold: {
          DEFAULT: "#F2B33D",
          bright: "#FFC94D",
          dim: "#8A6A24",
        },
        bone: "#F5F1E8",
        smoke: "#9A99A2",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "Anton", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      spacing: {
        'navbar': '64px',
        'navbar-mobile': '56px',
        'logo': '40px',
        'logo-mobile': '32px',
      },
      keyframes: {
        floatA: {
          "0%, 100%": { transform: "translateY(0px) rotate(-2deg)" },
          "50%": { transform: "translateY(-18px) rotate(-1deg)" },
        },
        floatB: {
          "0%, 100%": { transform: "translateY(0px) rotate(3deg)" },
          "50%": { transform: "translateY(-26px) rotate(4deg)" },
        },
        floatC: {
          "0%, 100%": { transform: "translateY(0px) rotate(-1deg)" },
          "50%": { transform: "translateY(-14px) rotate(0deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        floatA: "floatA 6s ease-in-out infinite",
        floatB: "floatB 7.5s ease-in-out infinite",
        floatC: "floatC 5.2s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        riseIn: "riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;