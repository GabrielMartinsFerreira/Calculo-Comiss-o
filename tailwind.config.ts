import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        neon: {
          cyan: "#06b6d4",
          green: "#10b981",
          purple: "#8b5cf6",
          orange: "#f97316",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "neon-cyan": "0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(6,182,212,0.1)",
        "neon-green": "0 0 20px rgba(16,185,129,0.3), 0 0 40px rgba(16,185,129,0.1)",
        "neon-purple": "0 0 20px rgba(139,92,246,0.3)",
        "card-dark": "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
      },
      keyframes: {
        "pulse-slow": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        "slide-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(6,182,212,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(6,182,212,0.7), 0 0 40px rgba(6,182,212,0.3)" },
        },
        "fill-bar": { from: { width: "0%" }, to: { width: "var(--bar-width)" } },
      },
      animation: {
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "fill-bar": "fill-bar 1s cubic-bezier(0.34,1.56,0.64,1) forwards",
      },
      backgroundImage: {
        "gradient-cyan": "linear-gradient(135deg, #06b6d4, #0891b2)",
        "gradient-green": "linear-gradient(135deg, #10b981, #059669)",
        "gradient-purple": "linear-gradient(135deg, #8b5cf6, #7c3aed)",
        "gradient-card": "linear-gradient(135deg, rgba(22,27,38,0.9), rgba(15,20,30,0.95))",
      },
    },
  },
  plugins: [],
};
export default config;
