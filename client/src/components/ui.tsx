import type { CSSProperties, ReactNode } from "react";
import { timeAgo } from "../lib/format";
import type { Bias } from "../lib/types";

export function Card({
  children, className = "", style,
}: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`rounded-2xl bg-card border border-card-border shadow-glow p-4 ${className}`}
      style={style}
    >
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
