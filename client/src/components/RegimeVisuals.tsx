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
