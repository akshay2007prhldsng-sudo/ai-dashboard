/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // APfx HybridDash design tokens — institutional dark terminal.
        // Green-tinted near-black app background; neutral slate-grey panels
        // sitting on top of it (matching the HybridTrader reference).
        app: { DEFAULT: "#070B09", alt: "#0A0F0D" },
        card: { DEFAULT: "#13171C", alt: "#181D24", border: "#272E38" },
        accent: { DEFAULT: "#10B981", bright: "#34D399", hover: "#059669" },
        bull: "#22C55E",
        bear: "#EF4444",
        amber: "#F59E0B",
        violet: "#8B5CF6",
        sky: "#38BDF8",
        neutral: { DEFAULT: "#64748B", badge: "#3B82F6" },
        ink: { DEFAULT: "#E8ECF2", muted: "#8B95A3" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 0 0 1px #272E38, 0 10px 30px rgba(0,0,0,0.4)",
        glow: "0 1px 0 0 rgba(255,255,255,0.02) inset",
      },
    },
  },
  plugins: [],
};
