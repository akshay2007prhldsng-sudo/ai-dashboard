/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // APfx HybridDash design tokens — institutional dark terminal
        app: { DEFAULT: "#070B09", alt: "#0A0F0D" },
        card: { DEFAULT: "#0E1512", alt: "#111A16", border: "#1C2A24" },
        accent: { DEFAULT: "#10B981", bright: "#34D399", hover: "#059669" },
        bull: "#22C55E",
        bear: "#EF4444",
        neutral: { DEFAULT: "#64748B", badge: "#3B82F6" },
        ink: { DEFAULT: "#E6EDEA", muted: "#8A9A93" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 0 0 1px #1C2A24, 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(16,185,129,0.08) inset",
      },
    },
  },
  plugins: [],
};
