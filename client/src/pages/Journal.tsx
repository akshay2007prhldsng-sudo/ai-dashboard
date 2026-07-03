import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";
import { PerformanceHeatmap } from "../components/Heatmap";
import {
  AiTag, Card, Donut, SectionTitle, Spinner, StatTile, Unavailable,
} from "../components/ui";
import {
  useAddTrade, useAiStatus, useCoaching, useDeleteTrade, useJournalStats,
  useSaveSettings, useSettings, useTrades,
} from "../lib/api";
import { fmtMoney } from "../lib/format";
import { TOKENS } from "../lib/palette";
import { CONTRACT_SPECS, positionSize } from "../lib/risk";
import type { CoachingReport, Trade } from "../lib/types";

const PERIODS = [
  { id: "WEEK", label: "Last week" },
  { id: "MONTH", label: "Last month" },
  { id: "QUARTER", label: "Last quarter" },
  { id: "YEAR", label: "Last year" },
  { id: "ALL", label: "All time" },
];

export function Journal() {
  const [period, setPeriod] = useState("QUARTER");
  const [account, setAccount] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const stats = useJournalStats(period);
  const trades = useTrades(period, account, source);

  const accounts = useMemo(
    () => ["ALL", ...new Set((trades.data?.trades ?? []).map((t) => t.account))],
    [trades.data]
  );
  const sources = useMemo(
    () => ["ALL", ...new Set((trades.data?.trades ?? []).map((t) => t.source))],
    [trades.data]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-accent-bright tracking-tight">Trading Journal</h1>
          <p className="text-sm text-ink-muted mt-1">
            Record and analyze your trades, emotions, and market conditions in one place
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Select value={period} onChange={setPeriod} options={PERIODS.map((p) => [p.id, p.label])} />
          <Select value={source} onChange={setSource} options={sources.map((s) => [s, s === "ALL" ? "All sources" : s])} />
          <Select value={account} onChange={setAccount} options={accounts.map((a) => [a, a === "ALL" ? "All accounts" : a])} />
        </div>
      </div>

      <RiskBanner stats={stats.data} />
      <Kpis stats={stats.data} loading={stats.isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2"><EquityCurve stats={stats.data} /></div>
        <div className="xl:col-span-3"><AiPerformance /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <SectionTitle title="Performance heatmap" />
          {stats.data ? <PerformanceHeatmap days={stats.data.heatmap} /> : <Spinner />}
        </Card>
        <DayOfWeek stats={stats.data} />
        <QualityRadar stats={stats.data} />
      </div>

      <SectionHeading title="Risk & Trade Management" sub="1R risk · 1:2–1:3 RR · break-even at 1.5R" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <PositionSizeCalc />
        <RiskDashboard stats={stats.data} />
        <RDistribution stats={stats.data} />
      </div>

      <RecentTrades trades={trades.data?.trades ?? []} loading={trades.isLoading} onAdd={() => setShowAdd(true)} />
      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-card border border-card-border rounded-lg px-3 py-1.5 text-ink text-xs focus:outline-none focus:border-accent/50"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

function RiskBanner({ stats }: { stats?: ReturnType<typeof useJournalStats>["data"] }) {
  if (!stats) return null;
  const { risk } = stats;
  const warnings: string[] = [];
  if (risk.dailyBreached) warnings.push(`Daily loss limit breached (${fmtMoney(risk.dailyPnl, true)} vs -${fmtMoney(risk.dailyLimitAmount)})`);
  if (risk.weeklyBreached) warnings.push(`Weekly loss limit breached (${fmtMoney(risk.weeklyPnl, true)} vs -${fmtMoney(risk.weeklyLimitAmount)})`);
  if (risk.openPositions > risk.maxOpenPositions) warnings.push(`${risk.openPositions} open positions exceeds max ${risk.maxOpenPositions}`);
  if (!warnings.length) return null;
  return (
    <Card className="!py-3 border-bear/40 bg-bear/5">
      <p className="text-xs font-semibold text-bear flex items-center gap-2">
        ⚠ Risk warning — stand down
      </p>
      <ul className="mt-1 text-[11px] text-ink-muted list-disc list-inside">
        {warnings.map((w) => <li key={w}>{w}</li>)}
      </ul>
    </Card>
  );
}

function Kpis({ stats, loading }: { stats?: ReturnType<typeof useJournalStats>["data"]; loading: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (loading || !stats) return <Spinner />;
  const k = stats.kpis;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatTile
        label="Net P&L"
        value={hidden ? "•••••" : fmtMoney(k.netPnl, true)}
        valueClass={k.netPnl >= 0 ? "text-bull" : "text-bear"}
        right={
          <button onClick={() => setHidden(!hidden)} className="text-[10px] text-ink-muted border border-card-border rounded px-1.5 hover:text-ink">
            {hidden ? "Show" : "Hide"}
          </button>
        }
        sub={`${k.totalTrades} closed trades`}
      />
      <StatTile
        label="Profit Factor"
        value={k.profitFactor ?? "—"}
        sub={k.profitFactor != null ? (k.profitFactor >= 1.5 ? "Your trades show a strong edge" : k.profitFactor >= 1 ? "Positive but thin edge" : "Negative edge — review setups") : "no losses recorded"}
        right={k.profitFactor != null ? <Donut pct={Math.min(100, k.profitFactor * 25)} label={`${k.profitFactor}`} /> : undefined}
      />
      <StatTile
        label="Win Rate"
        value={`${k.winRate.toFixed(1)}%`}
        sub={<span>Wins: <b className="text-bull">{k.wins}</b> · Losses: <b className="text-bear">{k.losses}</b> · Breakeven: {k.breakeven}</span>}
        right={<Donut pct={k.winRate} label={`${k.wins}`} />}
      />
      <StatTile
        label="Avg Win / Loss"
        value={k.avgWinLossRatio != null ? `${k.avgWinLossRatio}x` : "—"}
        sub={
          <div className="flex items-center gap-2 mt-1">
            <span className="text-bull">{fmtMoney(k.avgWin)}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-card-alt">
              <div className="bg-bull" style={{ width: `${(k.avgWin / Math.max(1, k.avgWin + k.avgLoss)) * 100}%` }} />
              <div className="bg-bear flex-1" />
            </div>
            <span className="text-bear">-{fmtMoney(k.avgLoss)}</span>
          </div>
        }
      />
    </div>
  );
}

function EquityCurve({ stats }: { stats?: ReturnType<typeof useJournalStats>["data"] }) {
  const data = stats?.equityCurve ?? [];
  const pctReturn = data.length && stats ? (data[data.length - 1].equity / Math.max(1, Math.abs(stats.risk.riskPerTradeAmount) * 100)) : 0;
  return (
    <Card className="h-full">
      <SectionTitle
        title="Equity Curve"
        right={data.length ? (
          <span className={`text-xs font-semibold ${data[data.length - 1].equity >= 0 ? "text-bull" : "text-bear"}`}>
            {fmtMoney(data[data.length - 1].equity, true)}
          </span>
        ) : undefined}
      />
      {data.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TOKENS.accent} stopOpacity={0.3} />
                <stop offset="100%" stopColor={TOKENS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: TOKENS.muted, fontSize: 10 }}
              tickFormatter={(t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              stroke={TOKENS.grid}
            />
            <YAxis tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} />
            <Tooltip
              contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
              labelFormatter={(t) => new Date(String(t)).toLocaleString("en-GB")}
              formatter={(v: number) => [fmtMoney(v, true), "Equity"]}
            />
            <Area type="monotone" dataKey="equity" stroke={TOKENS.accentBright} strokeWidth={2} fill="url(#equity)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Unavailable what="equity data — add trades" />
      )}
    </Card>
  );
}

function AiPerformance() {
  const { data: ai } = useAiStatus();
  const coaching = useCoaching();
  const [report, setReport] = useState<CoachingReport | null>(null);

  const run = () =>
    coaching.mutate("QUARTER", { onSuccess: (r) => setReport(r) });

  return (
    <Card className="h-full">
      <SectionTitle
        title="AI performance overview"
        right={
          <button
            onClick={run}
            disabled={!ai?.available || coaching.isPending}
            className="text-xs font-medium text-app bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg px-3 py-1.5 transition-colors"
          >
            {coaching.isPending ? "Analysing…" : report ? "Refresh" : "Generate"}
          </button>
        }
      />
      {!ai?.available ? (
        <Unavailable what="AI layer (set ANTHROPIC_API_KEY) —" />
      ) : coaching.isPending ? (
        <Spinner />
      ) : report ? (
        <div>
          <AiTag />
          <p className="text-xs text-ink-muted leading-relaxed mt-1">{report.summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-card-alt border border-card-border p-3">
              <p className="text-[11px] font-semibold text-accent-bright mb-2">⌖ Focus actions</p>
              {report.focusActions.map((f) => (
                <div key={f.title} className="mb-2">
                  <p className="text-[11px] font-semibold text-ink">{f.title}</p>
                  <p className="text-[10px] text-ink-muted leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-card-alt border border-card-border p-3">
              <p className="text-[11px] font-semibold text-accent-bright mb-2">✓ Strengths</p>
              {report.strengths.length ? (
                report.strengths.map((s) => (
                  <p key={s} className="text-[10px] text-ink-muted leading-relaxed mb-1">• {s}</p>
                ))
              ) : (
                <p className="text-[10px] text-ink-muted">No standout strengths identified yet.</p>
              )}
              {report.patterns.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-amber-400 mt-3 mb-1">Patterns</p>
                  {report.patterns.map((p) => (
                    <p key={p} className="text-[10px] text-ink-muted leading-relaxed mb-1">• {p}</p>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      ) : coaching.isError ? (
        <Unavailable what={(coaching.error as Error).message} />
      ) : (
        <p className="text-xs text-ink-muted py-6 text-center">
          Generate an AI review of your logged trades — best/worst instruments, sessions, focus actions and strengths.
        </p>
      )}
    </Card>
  );
}

function DayOfWeek({ stats }: { stats?: ReturnType<typeof useJournalStats>["data"] }) {
  const data = stats?.pnlByDayOfWeek ?? [];
  return (
    <Card>
      <SectionTitle title="P&L by Day of Week" />
      {data.some((d) => d.pnl !== 0) ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
            <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} />
            <YAxis tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [fmtMoney(v, true), "P&L"]}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.pnl >= 0 ? TOKENS.bull : TOKENS.bear} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Unavailable what="day-of-week data" />
      )}
    </Card>
  );
}

function QualityRadar({ stats }: { stats?: ReturnType<typeof useJournalStats>["data"] }) {
  const axes = stats?.quality.axes ?? [];
  return (
    <Card>
      <SectionTitle
        title="Trade Quality"
        right={stats ? <span className="text-xs font-semibold text-accent-bright">{stats.quality.score} / 10</span> : undefined}
      />
      {axes.length && stats!.kpis.totalTrades > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={axes} outerRadius="70%">
            <PolarGrid stroke={TOKENS.grid} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: TOKENS.muted, fontSize: 9 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke={TOKENS.accentBright} fill={TOKENS.accent} fillOpacity={0.25} strokeWidth={2} />
            <Tooltip
              contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`${v} / 10`, "Score"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <Unavailable what="quality data — add trades" />
      )}
    </Card>
  );
}

function PositionSizeCalc() {
  const { data: settingsData } = useSettings();
  const save = useSaveSettings();
  const s = settingsData?.settings;
  const [specId, setSpecId] = useState("US100");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const spec = CONTRACT_SPECS.find((c) => c.id === specId)!;

  const result = s
    ? positionSize({
        accountSize: s.accountSize,
        riskPct: s.riskPct,
        entry: Number(entry),
        stopLoss: Number(stop),
        specId,
        direction,
      })
    : null;

  return (
    <Card>
      <SectionTitle title="Position Size Calculator" sub={spec.note} />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="col-span-2 flex items-center gap-2">
          <span className="text-ink-muted w-24">Instrument</span>
          <select value={specId} onChange={(e) => setSpecId(e.target.value)}
            className="flex-1 bg-card-alt border border-card-border rounded-lg px-2 py-1.5">
            {CONTRACT_SPECS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-ink-muted w-24">Account $</span>
          <input type="number" value={s?.accountSize ?? ""} onChange={(e) => save.mutate({ accountSize: Number(e.target.value) })}
            className="w-full bg-card-alt border border-card-border rounded-lg px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-ink-muted w-16">Risk %</span>
          <input type="number" step="0.1" value={s?.riskPct ?? ""} onChange={(e) => save.mutate({ riskPct: Number(e.target.value) })}
            className="w-full bg-card-alt border border-card-border rounded-lg px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-ink-muted w-24">Entry</span>
          <input type="number" value={entry} onChange={(e) => setEntry(e.target.value)}
            className="w-full bg-card-alt border border-card-border rounded-lg px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-ink-muted w-16">Stop</span>
          <input type="number" value={stop} onChange={(e) => setStop(e.target.value)}
            className="w-full bg-card-alt border border-card-border rounded-lg px-2 py-1.5" />
        </label>
        <div className="col-span-2 flex gap-1">
          {(["LONG", "SHORT"] as const).map((d) => (
            <button key={d} onClick={() => setDirection(d)}
              className={`flex-1 rounded-lg py-1.5 font-semibold border transition-colors ${
                direction === d
                  ? d === "LONG" ? "bg-bull/20 text-bull border-bull/40" : "bg-bear/20 text-bear border-bear/40"
                  : "text-ink-muted border-card-border"
              }`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      {result ? (
        <div className="mt-3 rounded-xl bg-card-alt border border-card-border p-3 text-xs space-y-1.5">
          <p className="flex justify-between"><span className="text-ink-muted">Risk (1R)</span><b>{fmtMoney(result.riskAmount)}</b></p>
          <p className="flex justify-between"><span className="text-ink-muted">Size</span>
            <b className="text-accent-bright">{result.size} {result.unit}</b></p>
          <p className="flex justify-between"><span className="text-ink-muted">Target at 2R / 3R</span>
            <b className="text-bull">{fmtMoney(result.rewardAt2R)} / {fmtMoney(result.rewardAt3R)}</b></p>
          <p className="flex justify-between"><span className="text-ink-muted">Move SL → BE at (1.5R)</span>
            <b>{result.breakEvenTrigger.toFixed(spec.tick < 0.01 ? 5 : 2)}</b></p>
        </div>
      ) : (
        <p className="text-[10px] text-ink-muted mt-3">Enter entry and stop to size the position at your fixed 1R risk.</p>
      )}
    </Card>
  );
}

function RiskDashboard({ stats }: { stats?: ReturnType<typeof useJournalStats>["data"] }) {
  const { data: settingsData } = useSettings();
  const save = useSaveSettings();
  const s = settingsData?.settings;
  if (!stats || !s) return <Card><Spinner /></Card>;
  const r = stats.risk;
  const bar = (used: number, limit: number) => Math.min(100, (Math.max(0, -used) / limit) * 100);
  return (
    <Card>
      <SectionTitle title="Risk Dashboard" sub="Daily & weekly drawdown vs your limits" />
      <div className="space-y-3 text-xs">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-ink-muted">Today’s P&L</span>
            <span className={r.dailyPnl >= 0 ? "text-bull" : "text-bear"}>{fmtMoney(r.dailyPnl, true)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-card-alt overflow-hidden">
            <div className={`h-full ${r.dailyBreached ? "bg-bear" : "bg-amber-500"}`} style={{ width: `${bar(r.dailyPnl, r.dailyLimitAmount)}%` }} />
          </div>
          <p className="text-[10px] text-ink-muted mt-0.5">Daily loss limit {fmtMoney(r.dailyLimitAmount)} ({s.dailyLossLimit}%)</p>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-ink-muted">This week’s P&L</span>
            <span className={r.weeklyPnl >= 0 ? "text-bull" : "text-bear"}>{fmtMoney(r.weeklyPnl, true)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-card-alt overflow-hidden">
            <div className={`h-full ${r.weeklyBreached ? "bg-bear" : "bg-amber-500"}`} style={{ width: `${bar(r.weeklyPnl, r.weeklyLimitAmount)}%` }} />
          </div>
          <p className="text-[10px] text-ink-muted mt-0.5">Weekly loss limit {fmtMoney(r.weeklyLimitAmount)} ({s.weeklyLossLimit}%)</p>
        </div>
        <p className="flex justify-between">
          <span className="text-ink-muted">Open positions</span>
          <b className={r.openPositions > r.maxOpenPositions ? "text-bear" : "text-ink"}>{r.openPositions} / {r.maxOpenPositions}</b>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">Rule adherence (RR / BE / 1R)</span>
          <b>{stats.ruleAdherence.rr.toFixed(0)}% / {stats.ruleAdherence.breakEven.toFixed(0)}% / {stats.ruleAdherence.risk1R.toFixed(0)}%</b>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">Rule violations flagged</span>
          <b className={stats.ruleAdherence.violations > 0 ? "text-amber-400" : "text-bull"}>{stats.ruleAdherence.violations}</b>
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="text-[10px] text-ink-muted">Daily limit %
            <input type="number" step="0.5" value={s.dailyLossLimit}
              onChange={(e) => save.mutate({ dailyLossLimit: Number(e.target.value) })}
              className="w-full bg-card-alt border border-card-border rounded-lg px-2 py-1 mt-0.5 text-ink" />
          </label>
          <label className="text-[10px] text-ink-muted">Weekly limit %
            <input type="number" step="0.5" value={s.weeklyLossLimit}
              onChange={(e) => save.mutate({ weeklyLossLimit: Number(e.target.value) })}
              className="w-full bg-card-alt border border-card-border rounded-lg px-2 py-1 mt-0.5 text-ink" />
          </label>
        </div>
      </div>
    </Card>
  );
}

function RDistribution({ stats }: { stats?: ReturnType<typeof useJournalStats>["data"] }) {
  const data = stats?.rDistribution ?? [];
  const hasData = data.some((d) => d.count > 0);
  return (
    <Card>
      <SectionTitle
        title="Expectancy & R-distribution"
        right={
          stats?.kpis.expectancyR != null ? (
            <span className={`text-xs font-semibold ${stats.kpis.expectancyR >= 0 ? "text-bull" : "text-bear"}`}>
              {stats.kpis.expectancyR >= 0 ? "+" : ""}{stats.kpis.expectancyR}R / trade
            </span>
          ) : undefined
        }
      />
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fill: TOKENS.muted, fontSize: 9 }} stroke={TOKENS.grid} />
            <YAxis allowDecimals={false} tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`${v} trades`, "Count"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.bucket} fill={d.bucket.startsWith("≤") || d.bucket.startsWith("-") ? TOKENS.bear : TOKENS.bull} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Unavailable what="R data — log trades with a stop loss" />
      )}
    </Card>
  );
}

function RecentTrades({ trades, loading, onAdd }: { trades: Trade[]; loading: boolean; onAdd: () => void }) {
  const del = useDeleteTrade();
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? trades : trades.slice(0, 8);
  return (
    <Card>
      <SectionTitle
        title="Recent trades"
        right={
          <div className="flex gap-2">
            <button onClick={onAdd} className="text-xs font-semibold text-app bg-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 transition-colors">
              + Add entry
            </button>
            {trades.length > 8 && (
              <button onClick={() => setShowAll(!showAll)} className="text-xs text-accent-bright hover:underline">
                {showAll ? "Show less" : "View all →"}
              </button>
            )}
          </div>
        }
      />
      {loading ? (
        <Spinner />
      ) : list.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] text-ink-muted uppercase tracking-wider">
                <th className="py-2 pr-3">Symbol</th>
                <th className="pr-3">Date</th>
                <th className="pr-3">Side</th>
                <th className="pr-3">Session</th>
                <th className="pr-3">Account</th>
                <th className="pr-3 text-right">R</th>
                <th className="pr-3 text-right">P&L</th>
                <th className="pr-3">Rules</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const allRules = t.ruleRR && t.ruleBreakEven && t.ruleRisk;
                return (
                  <tr key={t.id} className="border-t border-card-border/60">
                    <td className="py-2 pr-3 font-semibold">
                      <span className={`mr-1.5 ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>{t.pnl >= 0 ? "+" : "−"}</span>
                      {t.instrument}
                    </td>
                    <td className="pr-3 text-ink-muted">{new Date(t.openedAt).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="pr-3">
                      <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${t.direction === "LONG" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="pr-3 text-ink-muted">{t.session}</td>
                    <td className="pr-3 text-ink-muted">{t.account}</td>
                    <td className="pr-3 text-right">{t.rMultiple != null ? `${t.rMultiple > 0 ? "+" : ""}${t.rMultiple}R` : "—"}</td>
                    <td className={`pr-3 text-right font-semibold ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>{fmtMoney(t.pnl, true)}</td>
                    <td className="pr-3">
                      <span
                        title={`RR ${t.ruleRR ? "✓" : "✗"} · BE@1.5R ${t.ruleBreakEven ? "✓" : "✗"} · 1R risk ${t.ruleRisk ? "✓" : "✗"}`}
                        className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${allRules ? "bg-bull/10 text-bull" : "bg-amber-400/10 text-amber-400"}`}
                      >
                        {allRules ? "✓ Followed" : "⚠ Flagged"}
                      </span>
                    </td>
                    <td className="text-right">
                      <button onClick={() => del.mutate(t.id)} className="text-ink-muted hover:text-bear text-[10px]" title="Delete">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Unavailable what="trades — click + Add entry to log your first trade;" />
      )}
    </Card>
  );
}

const SESSIONS = ["LONDON", "NEW_YORK", "OVERLAP", "ASIA", "OTHER"];
const EMOTIONS = ["", "Calm", "Confident", "FOMO", "Fear", "Greed", "Revenge", "Impatient", "Disciplined"];

function AddTradeModal({ onClose }: { onClose: () => void }) {
  const add = useAddTrade();
  const [form, setForm] = useState({
    instrument: "US100",
    direction: "LONG" as "LONG" | "SHORT",
    openedAt: new Date().toISOString().slice(0, 16),
    session: "LONDON",
    account: "Default",
    source: "Manual",
    entry: "",
    stopLoss: "",
    takeProfit: "",
    size: "1",
    pnl: "",
    rMultiple: "",
    notes: "",
    emotion: "",
    ruleRR: true,
    ruleBreakEven: true,
    ruleRisk: true,
    isOpen: false,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    add.mutate(
      {
        ...form,
        entry: Number(form.entry),
        stopLoss: form.stopLoss ? Number(form.stopLoss) : null,
        takeProfit: form.takeProfit ? Number(form.takeProfit) : null,
        size: Number(form.size),
        pnl: Number(form.pnl || 0),
        rMultiple: form.rMultiple ? Number(form.rMultiple) : null,
        openedAt: new Date(form.openedAt).toISOString(),
      } as never,
      { onSuccess: onClose }
    );
  };

  const input = "w-full bg-card-alt border border-card-border rounded-lg px-2 py-1.5 text-ink text-xs focus:outline-none focus:border-accent/50";
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold">Add trade entry</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <label>Instrument
            <select className={input} value={form.instrument} onChange={(e) => set("instrument", e.target.value)}>
              {CONTRACT_SPECS.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </label>
          <label>Direction
            <select className={input} value={form.direction} onChange={(e) => set("direction", e.target.value)}>
              <option>LONG</option><option>SHORT</option>
            </select>
          </label>
          <label>Date / time
            <input type="datetime-local" className={input} value={form.openedAt} onChange={(e) => set("openedAt", e.target.value)} />
          </label>
          <label>Session
            <select className={input} value={form.session} onChange={(e) => set("session", e.target.value)}>
              {SESSIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Account
            <input className={input} value={form.account} onChange={(e) => set("account", e.target.value)} />
          </label>
          <label>Source
            <input className={input} value={form.source} onChange={(e) => set("source", e.target.value)} />
          </label>
          <label>Entry *
            <input type="number" className={input} value={form.entry} onChange={(e) => set("entry", e.target.value)} />
          </label>
          <label>Stop Loss
            <input type="number" className={input} value={form.stopLoss} onChange={(e) => set("stopLoss", e.target.value)} />
          </label>
          <label>Take Profit
            <input type="number" className={input} value={form.takeProfit} onChange={(e) => set("takeProfit", e.target.value)} />
          </label>
          <label>Size (lots/contracts)
            <input type="number" step="0.01" className={input} value={form.size} onChange={(e) => set("size", e.target.value)} />
          </label>
          <label>P&L ($) *
            <input type="number" step="0.01" className={input} value={form.pnl} onChange={(e) => set("pnl", e.target.value)} />
          </label>
          <label>R multiple (optional)
            <input type="number" step="0.1" className={input} value={form.rMultiple} onChange={(e) => set("rMultiple", e.target.value)}
              placeholder="auto from SL" />
          </label>
          <label className="col-span-2">Notes
            <input className={input} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Setup, context, execution notes…" />
          </label>
          <label>Emotion
            <select className={input} value={form.emotion} onChange={(e) => set("emotion", e.target.value)}>
              {EMOTIONS.map((em) => <option key={em} value={em}>{em || "—"}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl bg-card-alt border border-card-border p-3">
          <p className="text-[11px] font-semibold mb-2">Rule checklist — flag violations honestly</p>
          <div className="flex flex-wrap gap-4 text-xs">
            {([
              ["ruleRR", "Fixed 1:2–1:3 RR respected"],
              ["ruleBreakEven", "Break-even moved at 1.5R"],
              ["ruleRisk", "Risked exactly 1R (1%)"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)}
                  className="accent-emerald-500" />
                <span className={form[k] ? "text-ink" : "text-amber-400"}>{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input type="checkbox" checked={form.isOpen} onChange={(e) => set("isOpen", e.target.checked)} className="accent-emerald-500" />
              <span className="text-ink-muted">Still open</span>
            </label>
          </div>
        </div>

        {add.isError && <p className="text-xs text-bear mt-2">{(add.error as Error).message}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-xs text-ink-muted border border-card-border rounded-lg px-4 py-2 hover:text-ink">Cancel</button>
          <button onClick={submit} disabled={add.isPending || !form.entry || form.pnl === ""}
            className="text-xs font-semibold text-app bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg px-4 py-2">
            {add.isPending ? "Saving…" : "Save trade"}
          </button>
        </div>
      </div>
    </div>
  );
}
