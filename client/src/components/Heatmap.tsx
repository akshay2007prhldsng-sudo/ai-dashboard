import { useMemo } from "react";
import { fmtMoney } from "../lib/format";

/** Calendar-grid performance heatmap (weeks as columns, Mon–Sun as rows). */
export function PerformanceHeatmap({ days, weeks = 13 }: { days: { date: string; pnl: number }[]; weeks?: number }) {
  const { grid, monthLabels, maxAbs } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d.pnl]));
    const today = new Date();
    // end of current week (Sunday)
    const end = new Date(today);
    end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1));
    const cells: { date: string; pnl: number | null }[][] = [];
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = weeks - 1; w >= 0; w--) {
      const col: { date: string; pnl: number | null }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(end);
        dt.setDate(end.getDate() - w * 7 - (6 - d));
        const iso = dt.toISOString().slice(0, 10);
        col.push({ date: iso, pnl: byDate.has(iso) ? byDate.get(iso)! : null });
        if (d === 0 && dt.getMonth() !== lastMonth) {
          lastMonth = dt.getMonth();
          labels.push({ col: weeks - 1 - w, label: dt.toLocaleString("en", { month: "short" }) });
        }
      }
      cells.push(col);
    }
    const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));
    return { grid: cells, monthLabels: labels, maxAbs };
  }, [days, weeks]);

  const cellColor = (pnl: number | null) => {
    if (pnl === null) return "#111A16";
    if (pnl === 0) return "#1C2A24";
    const t = Math.min(1, Math.abs(pnl) / maxAbs);
    const alpha = 0.25 + t * 0.75;
    return pnl > 0 ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`;
  };

  const rows = ["S", "M", "T", "W", "T", "F", "S"]; // grid rows: Mon..Sun rendered top-down below
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 text-[9px] text-ink-muted mb-1 ml-4">
        {monthLabels.map((m) => (
          <span key={`${m.col}-${m.label}`} style={{ marginLeft: m.col === 0 ? 0 : undefined, position: "relative" }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="text-[8px] text-ink-muted h-3.5 leading-[14px]">{d}</span>
          ))}
        </div>
        {grid.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={cell.pnl !== null ? `${cell.date}: ${fmtMoney(cell.pnl, true)}` : cell.date}
                className="w-3.5 h-3.5 rounded-[3px] border border-black/20"
                style={{ background: cellColor(cell.pnl) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
