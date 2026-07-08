// Visual "what's happening in the market" glyphs for the Macro-view regime cards.
// Pure SVG, deterministic, with soft glows and state-driven colour so each panel
// takes on a tint that matches the data it shows (DovyFX-style).

import type { CSSProperties } from "react";
import { TOKENS } from "../lib/palette";

/* ---------- state → colour ---------- */

export function flowColor(level: string): string {
  return level === "Crowded" ? TOKENS.bear : level === "Thin" ? TOKENS.amber : TOKENS.bull;
}
export function pulseColor(level: string): string {
  return level === "Wild" ? TOKENS.bear : level === "Quiet" ? TOKENS.sky : TOKENS.bull;
}
export function bearingColor(label: string): string {
  const l = label.toLowerCase();
  return l.includes("down") ? TOKENS.bear : l.includes("up") ? TOKENS.bull : TOKENS.amber;
}
export function moodColor(score: number): string {
  return score >= 60 ? TOKENS.bull : score <= 40 ? TOKENS.bear : TOKENS.sky;
}
export function policyColor(stance: string): string {
  return stance === "Hawkish" ? TOKENS.bear : stance === "Dovish" ? TOKENS.bull : TOKENS.sky;
}

/* ---------- descriptive one-liners (more text, matching the reference) ---------- */

export function flowSummary(level: string): string {
  return level === "Crowded"
    ? "Crowded tape — momentum may be over-extended."
    : level === "Thin"
    ? "Thin participation — liquidity is light and prone to slippage."
    : "Normal participation — tape is well-structured.";
}
export function pulseSummary(level: string): string {
  return level === "Wild"
    ? "Volatility elevated — widen stops or reduce size."
    : level === "Quiet"
    ? "Volatility compressed — breakout potential building."
    : "Volatility in a healthy band — setups have room to breathe.";
}
export function bearingSummary(label: string): string {
  const l = label.toLowerCase();
  return l.includes("down")
    ? "Directional pressure lower — sell rallies, respect the trend."
    : l.includes("up")
    ? "Directional pressure higher — buy dips, respect the trend."
    : "Price oscillating within bounds — fade the extremes.";
}

/* ---------- luxe tinted-card style ---------- */

/** Soft radial glow + gradient wash + coloured border, keyed to the state colour. */
export function regimeTint(hex: string): CSSProperties {
  return {
    background: `radial-gradient(130% 90% at 50% -10%, ${hex}26, transparent 55%), linear-gradient(180deg, ${hex}12, #13171C 72%)`,
    borderColor: `${hex}55`,
    boxShadow: `inset 0 1px 0 0 ${hex}2b, 0 12px 34px rgba(0,0,0,0.45)`,
  };
}

/* ---------- glyphs ---------- */

/** Traffic-light gradient slider (green → amber → red) with a marker at the active stop. */
export function TrafficSlider({ levels, active }: { levels: string[]; active: string }) {
  const idx = Math.max(0, levels.indexOf(active));
  const pct = levels.length > 1 ? (idx / (levels.length - 1)) * 100 : 50;
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full overflow-visible"
        style={{ background: "linear-gradient(90deg,#22C55E 0%,#F59E0B 50%,#EF4444 100%)", boxShadow: "0 0 12px rgba(0,0,0,0.4) inset" }}>
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

/** Audio-style participation waveform, glowing in the state colour. */
export function FlowWaveform({ level }: { level: "Thin" | "Healthy" | "Crowded" }) {
  const bars = 30;
  const color = flowColor(level);
  const intensity = level === "Crowded" ? 1 : level === "Healthy" ? 0.7 : 0.4;
  const heights = Array.from({ length: bars }, (_, i) => {
    const env = Math.sin((i / (bars - 1)) * Math.PI);
    const jitter = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    return 0.18 + env * intensity * (0.5 + jitter * 0.5);
  });
  return (
    <svg viewBox="0 0 120 44" className="w-full h-14" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}>
      {heights.map((h, i) => {
        const barH = h * 38;
        const x = (i / bars) * 120 + 1;
        return (
          <rect key={i} x={x} y={22 - barH / 2} width={120 / bars - 1.6} height={barH}
            rx="1.5" fill={color} opacity={0.35 + h * 0.55} />
        );
      })}
    </svg>
  );
}

/** Bearing: smooth flowing wave for a range, or a trending curve for up/down. Glows. */
export function BearingChart({ label }: { label: string }) {
  const l = label.toLowerCase();
  const color = bearingColor(label);
  const id = `bearing-${color.replace("#", "")}`;
  const n = 72;
  const trend = l.includes("down") ? -1 : l.includes("up") ? 1 : 0;
  const pts = Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1)) * 120;
    let y: number;
    if (trend === 0) {
      // Smooth double sine — "range" oscillation.
      y = 22 + Math.sin((i / (n - 1)) * Math.PI * 3.2) * 11;
    } else {
      // Gentle trend with a light wave riding on it.
      const base = trend > 0 ? 34 - (i / (n - 1)) * 24 : 10 + (i / (n - 1)) * 24;
      y = base + Math.sin((i / (n - 1)) * Math.PI * 2.4) * 3.5;
    }
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L120,44 L0,44 Z`;
  return (
    <svg viewBox="0 0 120 44" className="w-full h-14" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.42} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** ECG-style volatility pulse, glowing. */
export function PulseLine({ level }: { level: "Quiet" | "Tradable" | "Wild" }) {
  const color = pulseColor(level);
  const amp = level === "Wild" ? 16 : level === "Tradable" ? 10 : 4;
  const d =
    level === "Quiet"
      ? "M0,22 L44,22 L48,20 L52,24 L56,22 L120,22"
      : `M0,22 L34,22 L40,22 L46,${22 - amp} L52,${22 + amp} L58,22 L64,22 L70,${22 - amp * 0.5} L76,22 L120,22`;
  return (
    <svg viewBox="0 0 120 44" className="w-full h-14" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Market-policy emblem: a refined bird-in-flight silhouette (dove for easy/
 * neutral policy, hawk-tinted for tightening), with a soft gradient + glow.
 */
export function PolicyBird({ stance }: { stance: string }) {
  const color = policyColor(stance);
  const id = `policy-${color.replace("#", "")}`;
  // Stylised bird in flight — swept wings + body + head.
  const bird =
    "M8 40 C 26 30, 40 30, 52 36 C 58 28, 70 22, 86 24 C 78 28, 74 33, 76 38 " +
    "C 90 33, 104 37, 114 48 C 100 45, 88 48, 82 55 C 80 46, 68 46, 60 52 " +
    "C 58 45, 44 44, 34 50 C 32 42, 20 40, 8 40 Z";
  return (
    <svg viewBox="0 0 120 72" className="w-24 h-16" style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <path d={bird} fill={`url(#${id})`} stroke={color} strokeWidth="0.6" strokeOpacity={0.5} />
    </svg>
  );
}
