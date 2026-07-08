# APfx HybridDash — Design System & Visual Components

A portable reference for reproducing this dashboard's look. Hand this whole file
to another AI/designer: it contains the design language, the exact tokens, and
the full source of every reusable visual component (React + TypeScript +
Tailwind CSS, charts via Recharts + hand-rolled SVG).

---

## 1. Design language

**Vibe:** dark "institutional trading terminal" — calm, professional, dense but
legible. Near-black background with a *subtle emerald radial glow*; neutral
slate-grey cards sit on top of it. **Emerald is the only brand accent**;
additional colours appear only to encode data (bias, chart series, regime
states), never as decoration.

- **Background:** vertical gradient `#070B09 → #0A0F0D` with an emerald radial
  glow (`rgba(16,185,129,0.09)`) centred at the top. Grey-green, not pure black.
- **Cards / panels:** neutral slate-grey `#13171C`, 1px border `#272E38`,
  `border-radius: 1rem` (`rounded-2xl`), soft drop shadow + a faint inner top
  highlight. Secondary surfaces (inner tiles) `#181D24`.
- **Accent (single):** emerald `#10B981`, bright `#34D399`, hover `#059669`.
  Active nav/pill = fully emerald-filled; page titles are emerald.
- **Semantic colours:** bullish green `#22C55E`, bearish red `#EF4444`,
  neutral blue `#3B82F6`. Extra data hues: amber `#F59E0B`, violet `#8B5CF6`,
  sky `#38BDF8`.
- **Text:** primary `#E8ECF2`, muted `#8B95A3`. All numbers use
  `font-variant-numeric: tabular-nums`. Font: **Inter**.
- **Chart categorical palette** (colour-blind-safe, validated): `#059669`,
  `#3B82F6`, `#D97706`, `#8B5CF6`, `#EC4899`, `#EA580C`, `#0891B2` — colour
  follows the *entity*, never its rank.

**Layout frame (identical on every page):**
- **Sticky top header:** logo left (emerald mark + "APfx **HybridDash**");
  right side = data-freshness pill + "Refresh" button + notification bell +
  round avatar initial.
- **Left icon sidebar** (92px): vertical icon+label nav; active item gets an
  emerald tint (`text-accent-bright bg-accent/10`).
- **Bottom-centre pill tab-bar** (floating, blurred): `Dashboard · AI Macro
  Desk · Macro view · Macro calendar · Dynamic Journal · Reports`. Active pill
  fully emerald; the rest transparent with a hover border.
- **Content:** responsive card grid, `max-width: 1400px`, generous padding,
  `gap-4`.

**Signature visual motifs:**
- **BiasBadge** — small pill (`Bullish`/`Bearish`/`Neutral`) tinted green/red/
  blue with a glowing dot.
- **ConfidenceBar** — emerald fill on a dark track; **impact** shown as ★ stars.
- **Gauge** — hand-drawn semicircular SVG (Risk-Off ↔ Risk-On) with a needle dot.
- **Traffic-light 3-stop sliders** — green→amber→red gradient track with a marker
  (Thin/Healthy/Crowded, Quiet/Tradable/Wild).
- **Regime glyphs** (pure SVG): audio-style **waveform** (Flow), **ECG pulse**
  (Pulse), choppy declining **area** (Bearing), wireframe **globe** (Policy).
- **Category accent stripe** — a coloured left edge on bias cards keyed to asset
  class (index=sky, metal=amber, fx=emerald, crypto=violet, energy=red).
- **Sparklines / mini price charts** — Recharts area with a vertical fade
  gradient, green when up / red when down.
- **Donut** — small SVG ring for KPI percentages.

**Component inventory** (`components/ui.tsx`): `Card`, `SectionTitle`,
`LiveBadge`, `LastUpdated`, `BiasBadge`, `ConfidenceBar`, `ChangePct`,
`StatTile`, `Unavailable`, `Spinner`, `AiTag`, `Donut`. Plus `Gauge` +
`LevelSlider` (`Gauge.tsx`), `MiniChart` (`MiniChart.tsx`), and the regime
glyphs (`RegimeVisuals.tsx`).

---

## 2. Design tokens — `tailwind.config.js`

```js
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

```

## 3. Global CSS — `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
}

body {
  @apply bg-app text-ink font-sans antialiased;
  background: radial-gradient(1100px 560px at 50% -12%, rgba(16, 185, 129, 0.09), transparent),
    linear-gradient(180deg, #070b09, #0a0f0d);
  font-variant-numeric: tabular-nums;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: #272e38;
  border-radius: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}

```

## 4. Chart palette & tokens — `src/lib/palette.ts`

```ts
// Categorical series palette — validated for the dark card surface (#0E1512)
// with the dataviz six-checks validator (lightness band, chroma, CVD ΔE, contrast).
// Fixed assignment order: color follows the entity, never its rank.
export const SERIES = ["#059669", "#3B82F6", "#D97706", "#8B5CF6", "#EC4899", "#EA580C", "#0891B2"] as const;

export const CURRENCY_COLORS: Record<string, string> = {
  USD: SERIES[0],
  EUR: SERIES[1],
  GBP: SERIES[2],
  JPY: SERIES[3],
  AUD: SERIES[4],
  CAD: SERIES[5],
  CHF: SERIES[6],
};

export const BASKET_COLORS: Record<string, string> = {
  US100: SERIES[0],
  DXY: SERIES[1],
  US10Y: SERIES[2],
  VIX: SERIES[3],
};

export const TOKENS = {
  bull: "#22C55E",
  bear: "#EF4444",
  accent: "#10B981",
  accentBright: "#34D399",
  amber: "#F59E0B",
  violet: "#8B5CF6",
  sky: "#38BDF8",
  neutral: "#64748B",
  grid: "#272E38",
  ink: "#E8ECF2",
  muted: "#8B95A3",
  card: "#13171C",
};

```

## 5. Reusable UI components — `src/components/ui.tsx`

```tsx
import type { ReactNode } from "react";
import { timeAgo } from "../lib/format";
import type { Bias } from "../lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-card border border-card-border shadow-glow p-4 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title, sub, right,
}: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-3 gap-2">
      <div>
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">{title}</h2>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-accent-bright bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-pulse" />
      {label}
    </span>
  );
}

export function LastUpdated({ ts }: { ts?: number | string }) {
  if (!ts) return null;
  return (
    <span className="text-[10px] text-ink-muted flex items-center gap-1">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
      </svg>
      Last update {timeAgo(ts)}
    </span>
  );
}

export function BiasBadge({ bias }: { bias: Bias }) {
  const styles: Record<Bias, string> = {
    Bullish: "text-bull bg-bull/10 border-bull/30",
    Bearish: "text-bear bg-bear/10 border-bear/30",
    Neutral: "text-neutral-badge bg-neutral-badge/10 border-neutral-badge/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase rounded-full border px-2 py-0.5 ${styles[bias]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {bias}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-ink-muted">Confidence</span>
        <span className="text-ink font-medium">{v}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-card-alt border border-card-border overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function ChangePct({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-ink-muted">—</span>;
  const cls = value > 0 ? "text-bull" : value < 0 ? "text-bear" : "text-ink-muted";
  const arrow = value > 0 ? "↗" : value < 0 ? "↘" : "→";
  return (
    <span className={`${cls} font-medium`}>
      {arrow} {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function StatTile({
  label, value, sub, valueClass = "text-ink", right,
}: { label: string; value: ReactNode; sub?: ReactNode; valueClass?: string; right?: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <p className="text-xs text-ink-muted">{label}</p>
        {right}
      </div>
      <p className={`text-2xl font-semibold mt-1 ${valueClass}`}>{value}</p>
      {sub && <div className="text-xs text-ink-muted mt-1">{sub}</div>}
    </Card>
  );
}

export function Unavailable({ what = "data" }: { what?: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-xs text-ink-muted border border-dashed border-card-border rounded-xl">
      {what} unavailable
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-24">
      <div className="w-5 h-5 border-2 border-card-border border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export function AiTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent-bright">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.1 5.6L20 9.7l-5.9 2.1L12 17.4l-2.1-5.6L4 9.7l5.9-2.1L12 2z" />
      </svg>
      AI Analysis
    </span>
  );
}

export function Donut({ pct, label, color = "#10B981" }: { pct: number; label: string; color?: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative w-14 h-14">
      <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90">
        <circle cx="25" cy="25" r={r} fill="none" stroke="#1C2A24" strokeWidth="5" />
        <circle cx="25" cy="25" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-ink">
        {label}
      </div>
    </div>
  );
}

```

## 6. Semicircular gauge + level slider — `src/components/Gauge.tsx`

```tsx
// Custom SVG semicircular gauge (Risk-Off <-> Risk-On, etc.)

export function Gauge({
  value, leftLabel, rightLabel, centerLabel,
}: { value: number; leftLabel: string; rightLabel: string; centerLabel: string }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = (v / 100) * 180; // 0 = far left, 180 = far right
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 100, cy = 95, r = 70;
  const nx = cx + Math.cos(rad) * (r - 14);
  const ny = cy - Math.sin(rad) * (r - 14);

  const arc = (from: number, to: number, color: string, width = 10) => {
    const a1 = ((180 - from) * Math.PI) / 180;
    const a2 = ((180 - to) * Math.PI) / 180;
    const x1 = cx + Math.cos(a1) * r, y1 = cy - Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r, y2 = cy - Math.sin(a2) * r;
    return (
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none"
        stroke={color} strokeWidth={width} strokeLinecap="round" />
    );
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 105" className="w-full max-w-[220px]">
        {arc(2, 178, "#1C2A24", 10)}
        {arc(2, Math.max(4, angle - 2), "#10B981", 10)}
        <circle cx={nx} cy={ny} r="5" fill="#E6EDEA" stroke="#10B981" strokeWidth="2" />
        <text x={cx} y={cy - 18} textAnchor="middle" fill="#E6EDEA" fontSize="13" fontWeight="700"
          style={{ letterSpacing: "0.2em" }}>
          {centerLabel.toUpperCase()}
        </text>
      </svg>
      <div className="flex justify-between w-full max-w-[220px] text-[10px] text-ink-muted -mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

/** Three-stop slider indicator (Thin/Healthy/Crowded, Quiet/Tradable/Wild). */
export function LevelSlider({
  levels, active, activeColor = "#10B981",
}: { levels: string[]; active: string; activeColor?: string }) {
  const idx = Math.max(0, levels.indexOf(active));
  const pct = levels.length > 1 ? (idx / (levels.length - 1)) * 100 : 50;
  return (
    <div className="mt-2">
      <div className="relative h-1.5 rounded-full bg-card-alt border border-card-border">
        <div
          className="absolute -top-[3px] w-3 h-3 rounded-full border-2 border-app"
          style={{ left: `calc(${pct}% - 6px)`, background: activeColor }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-1.5">
        {levels.map((l) => (
          <span key={l} className={l === active ? "text-ink font-semibold" : ""}>{l}</span>
        ))}
      </div>
    </div>
  );
}

```

## 7. Sparkline / mini price chart — `src/components/MiniChart.tsx`

```tsx
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtPrice } from "../lib/format";
import { TOKENS } from "../lib/palette";
import type { Candle } from "../lib/types";

/** Area sparkline / mini price chart with crosshair tooltip. */
export function MiniChart({
  candles, height = 120, positive,
}: { candles: Candle[]; height?: number; positive?: boolean }) {
  const data = candles.map((c) => ({ t: c.t, price: c.c }));
  const up = positive ?? (data.length > 1 && data[data.length - 1].price >= data[0].price);
  const color = up ? TOKENS.bull : TOKENS.bear;
  const id = `mini-${color.replace("#", "")}`;
  const lo = Math.min(...data.map((d) => d.price));
  const hi = Math.max(...data.map((d) => d.price));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis domain={[lo, hi]} hide />
        <Tooltip
          contentStyle={{
            background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11,
          }}
          labelStyle={{ color: TOKENS.muted }}
          itemStyle={{ color: TOKENS.ink }}
          labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          formatter={(v) => [fmtPrice(Number(v)), "Price"]}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

```

## 8. Market-regime SVG glyphs — `src/components/RegimeVisuals.tsx`

```tsx
// Visual "what's happening in the market" glyphs for the Macro-view regime cards.
// Pure SVG, deterministic — mirror the HybridTrader deep-dive: an audio-style
// waveform for Flow, a choppy red downtrend for Bearing, an ECG pulse for Pulse.

import { TOKENS } from "../lib/palette";

/** Traffic-light gradient slider (green → amber → red) with a marker at the active stop. */
export function TrafficSlider({ levels, active }: { levels: string[]; active: string }) {
  const idx = Math.max(0, levels.indexOf(active));
  const pct = levels.length > 1 ? (idx / (levels.length - 1)) * 100 : 50;
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full overflow-visible"
        style={{ background: "linear-gradient(90deg,#22C55E 0%,#F59E0B 50%,#EF4444 100%)" }}>
        <div
          className="absolute -top-1 w-4 h-4 rounded-full border-2 border-app shadow-md"
          style={{ left: `calc(${pct}% - 8px)`, background: "#E8ECF2" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-1.5">
        {levels.map((l) => (
          <span key={l} className={l === active ? "text-ink font-semibold" : ""}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/** Audio-style participation waveform. Denser + redder = more crowded. */
export function FlowWaveform({ level }: { level: "Thin" | "Healthy" | "Crowded" }) {
  const bars = 28;
  const color = level === "Crowded" ? TOKENS.bear : level === "Thin" ? TOKENS.amber : TOKENS.bull;
  const intensity = level === "Crowded" ? 1 : level === "Healthy" ? 0.7 : 0.4;
  const heights = Array.from({ length: bars }, (_, i) => {
    // Deterministic pseudo-random envelope, tallest in the middle.
    const env = Math.sin((i / (bars - 1)) * Math.PI);
    const jitter = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    return 0.2 + env * intensity * (0.5 + jitter * 0.5);
  });
  return (
    <svg viewBox="0 0 120 40" className="w-full h-12" preserveAspectRatio="none">
      {heights.map((h, i) => {
        const barH = h * 34;
        const x = (i / bars) * 120 + 1;
        return (
          <rect key={i} x={x} y={20 - barH / 2} width={120 / bars - 1.5} height={barH}
            rx="1" fill={color} opacity={0.35 + h * 0.5} />
        );
      })}
    </svg>
  );
}

/** Choppy declining area chart for market bearing. */
export function BearingChart({ label }: { label: string }) {
  const down = label.toLowerCase().includes("down");
  const up = label.toLowerCase().includes("up");
  const color = down ? TOKENS.bear : up ? TOKENS.bull : TOKENS.amber;
  const n = 26;
  const pts = Array.from({ length: n }, (_, i) => {
    const trend = down ? 1 - i / (n - 1) : up ? i / (n - 1) : 0.5;
    const chop = Math.sin(i * 1.7) * 0.12 + ((Math.sin(i * 91.7) * 4373.3) % 1) * 0.12;
    const y = 4 + (1 - Math.max(0, Math.min(1, trend * 0.8 + 0.1 + chop))) * 30;
    return [i * (120 / (n - 1)), y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L120,38 L0,38 Z`;
  const id = `bearing-${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 120 40" className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/** ECG-style volatility pulse. Wilder = taller, redder spikes. */
export function PulseLine({ level }: { level: "Quiet" | "Tradable" | "Wild" }) {
  const color = level === "Wild" ? TOKENS.bear : level === "Quiet" ? TOKENS.muted : TOKENS.bull;
  const amp = level === "Wild" ? 15 : level === "Tradable" ? 10 : 4;
  // One heartbeat spike centred, flat baseline either side.
  const d = `M0,20 L38,20 L44,20 L48,${20 - amp} L52,${20 + amp} L56,20 L62,20 L120,20`;
  return (
    <svg viewBox="0 0 120 40" className="w-full h-12" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Simple wireframe globe for the Market Policy panel. */
export function GlobeGlyph({ tone = TOKENS.muted }: { tone?: string }) {
  return (
    <svg viewBox="0 0 60 60" className="w-16 h-16 opacity-70">
      <circle cx="30" cy="30" r="24" fill="none" stroke={tone} strokeWidth="1" />
      <ellipse cx="30" cy="30" rx="10" ry="24" fill="none" stroke={tone} strokeWidth="1" />
      <ellipse cx="30" cy="30" rx="20" ry="24" fill="none" stroke={tone} strokeWidth="0.7" opacity="0.6" />
      <line x1="6" y1="30" x2="54" y2="30" stroke={tone} strokeWidth="1" />
      <path d="M10 19 h40 M10 41 h40" stroke={tone} strokeWidth="0.7" opacity="0.6" />
    </svg>
  );
}

```

## 9. Layout frame (header + sidebar + pill tab-bar) — `src/layout/AppLayout.tsx`

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAgentState, useMeta, useRefreshNow } from "../lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: "M4 6h16M4 12h16M4 18h16" },
  { to: "/reports", label: "Reports", icon: "M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { to: "/calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/macro-desk", label: "Macro Desk", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { to: "/journal", label: "Journal", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/psychology", label: "Psychology", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { to: "/community", label: "Community", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
];

const TABS = [
  { to: "/", label: "Dashboard" },
  { to: "/macro-desk", label: "AI Macro Desk" },
  { to: "/macro-view/US100", label: "Macro view", match: "/macro-view" },
  { to: "/calendar", label: "Macro calendar" },
  { to: "/journal", label: "Dynamic Journal" },
  { to: "/reports", label: "Reports" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 17l5-10 3 6 3-4 5 8" />
        </svg>
      </div>
      <span className="font-semibold text-ink tracking-tight">
        APfx <span className="text-accent-bright">HybridDash</span>
      </span>
    </div>
  );
}

function RefreshStatus() {
  const { data } = useAgentState();
  const refresh = useRefreshNow();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const running = data?.running || refresh.isPending;
  const completedAt = data?.completedAt ?? null;
  const ageMin = completedAt ? (Date.now() - completedAt) / 60_000 : null;
  // green < 15m · yellow 15–30m · red > 30m
  const tone =
    ageMin === null ? "text-ink-muted" : ageMin < 15 ? "text-bull" : ageMin < 30 ? "text-amber" : "text-bear";
  const dot =
    ageMin === null ? "bg-ink-muted" : ageMin < 15 ? "bg-bull" : ageMin < 30 ? "bg-amber" : "bg-bear";
  const label = running
    ? "Refreshing…"
    : completedAt
    ? `Updated ${ageMin! < 1 ? "just now" : `${Math.floor(ageMin!)}m ago`}`
    : "Awaiting first cycle";

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-muted">
        <span className={`w-2 h-2 rounded-full ${dot} ${running ? "animate-pulse" : ""}`} />
        <span className={tone}>{label}</span>
      </div>
      <button
        onClick={() => refresh.mutate()}
        disabled={running}
        title="Run a full macro + pair analysis cycle now"
        className="flex items-center gap-1 text-[11px] font-medium text-ink border border-card-border rounded-full px-2.5 py-1 hover:border-accent/40 disabled:opacity-50 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={running ? "animate-spin" : ""}>
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        Refresh
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: meta } = useMeta();
  const initial = (meta?.traderName ?? "T").charAt(0).toUpperCase();

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-card-border/60 sticky top-0 bg-app/80 backdrop-blur z-20">
        <Logo />
        <div className="flex items-center gap-3">
          <RefreshStatus />
          <button className="relative text-ink-muted hover:text-ink transition-colors" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-bold text-accent-bright">
            {initial}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 px-2 py-4 w-[92px] border-r border-card-border/60 shrink-0">
          {NAV.map((n) => {
            const active = n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] transition-colors ${
                  active ? "text-accent-bright bg-accent/10" : "text-ink-muted hover:text-ink hover:bg-card-alt"
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={n.icon} />
                </svg>
                {n.label}
              </NavLink>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Bottom pill tab bar */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 bg-app/90 backdrop-blur border border-card-border rounded-full px-2 py-1.5 shadow-card overflow-x-auto max-w-[95vw]">
        {TABS.map((t) => {
          const matchPath = t.match ?? t.to;
          const active = matchPath === "/" ? location.pathname === "/" : location.pathname.startsWith(matchPath);
          return (
            <NavLink
              key={t.label}
              to={t.to}
              className={`whitespace-nowrap text-xs font-medium rounded-full px-4 py-2 transition-colors ${
                active
                  ? "bg-accent text-app font-semibold"
                  : "text-ink-muted border border-transparent hover:border-card-border hover:text-ink"
              }`}
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

```
