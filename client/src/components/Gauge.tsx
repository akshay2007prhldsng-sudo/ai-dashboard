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
