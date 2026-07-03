import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { AiTag, Card, Donut, SectionTitle, Spinner, StatTile, Unavailable } from "../components/ui";
import { useAiStatus, usePsychology, usePsychologyInsight } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { TOKENS } from "../lib/palette";
import type { PsychologyInsight } from "../lib/types";

const PERIODS = [
  { id: "WEEK", label: "Last week" },
  { id: "MONTH", label: "Last month" },
  { id: "QUARTER", label: "Last quarter" },
  { id: "YEAR", label: "Last year" },
  { id: "ALL", label: "All time" },
];

// Emotion → colour: constructive greens/blues, destructive reds/ambers.
const EMOTION_COLOR: Record<string, string> = {
  Disciplined: TOKENS.bull,
  Calm: TOKENS.accent,
  Confident: TOKENS.sky,
  Patient: "#0891B2",
  FOMO: TOKENS.amber,
  Greed: "#EA580C",
  Fear: TOKENS.violet,
  Impatient: TOKENS.amber,
  Revenge: TOKENS.bear,
  Untagged: TOKENS.neutral,
};

export function Psychology() {
  const [period, setPeriod] = useState("QUARTER");
  const { data, isLoading } = usePsychology(period);
  const { data: ai } = useAiStatus();
  const insight = usePsychologyInsight();
  const [report, setReport] = useState<PsychologyInsight | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-accent-bright tracking-tight">Psychology</h1>
          <p className="text-sm text-ink-muted mt-1">How your emotional state and discipline shape your results</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`text-xs rounded-full px-3 py-1.5 font-medium border transition-colors ${
                period === p.id ? "bg-accent text-app border-accent" : "text-ink-muted border-card-border hover:text-ink"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.totalTrades === 0 ? (
        <Card>
          <SectionTitle title="No tagged trades yet" />
          <Unavailable what="psychology data — log trades with emotion tags in the Journal;" />
        </Card>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatTile
              label="Discipline score"
              value={data.disciplineScore != null ? `${data.disciplineScore}%` : "—"}
              sub="Trades that followed all 3 rules"
              valueClass={data.disciplineScore != null && data.disciplineScore >= 70 ? "text-bull" : "text-amber"}
              right={data.disciplineScore != null ? <Donut pct={data.disciplineScore} label={`${data.disciplineScore}`} color={data.disciplineScore >= 70 ? TOKENS.bull : TOKENS.amber} /> : undefined}
            />
            <StatTile
              label="Rule-followed P&L"
              value={fmtMoney(data.cleanVsViolated.clean.pnl, true)}
              valueClass={data.cleanVsViolated.clean.pnl >= 0 ? "text-bull" : "text-bear"}
              sub={`${data.cleanVsViolated.clean.count} clean trades`}
            />
            <StatTile
              label="Rule-broken P&L"
              value={fmtMoney(data.cleanVsViolated.violated.pnl, true)}
              valueClass={data.cleanVsViolated.violated.pnl >= 0 ? "text-bull" : "text-bear"}
              sub={`${data.cleanVsViolated.violated.count} flagged trades`}
            />
            <StatTile
              label="Emotional states"
              value={data.emotions.length}
              sub="Distinct tags logged"
            />
          </div>

          {/* Tilt / behavioural flags */}
          {data.flags.length > 0 && (
            <Card className={data.flags.some((f) => f.includes("streak") || f.includes("Revenge") || f.includes("chasing")) ? "border-amber/40" : ""}>
              <SectionTitle title="Behavioural signals" sub="Patterns detected in your logged trades" />
              <ul className="space-y-1.5">
                {data.flags.map((f) => (
                  <li key={f} className="text-xs text-ink-muted flex gap-2">
                    <span className={f.includes("Disciplined") || f.includes("most profitable") ? "text-bull" : "text-amber"}>
                      {f.includes("Disciplined") || f.includes("most profitable") ? "✓" : "⚠"}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EmotionPnl data={data.emotions} />
            <EmotionWinRate data={data.emotions} />
          </div>

          <DisciplineTrend data={data.disciplineTrend} />

          {/* AI mindset insight */}
          <Card>
            <SectionTitle
              title="AI mindset insight"
              right={
                <button
                  onClick={() => insight.mutate(period, { onSuccess: (r) => setReport(r) })}
                  disabled={!ai?.available || insight.isPending}
                  className="text-xs font-medium text-app bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {insight.isPending ? "Analysing…" : report ? "Refresh" : "Generate"}
                </button>
              }
            />
            {!ai?.available ? (
              <Unavailable what="AI layer (set ANTHROPIC_API_KEY) —" />
            ) : insight.isPending ? (
              <Spinner />
            ) : report ? (
              <div>
                <AiTag />
                <p className="text-xs text-ink-muted leading-relaxed mt-1">{report.assessment}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl bg-card-alt border border-card-border p-3">
                    <p className="text-[11px] font-semibold text-amber mb-2">Emotional triggers</p>
                    {report.triggers.map((t) => <p key={t} className="text-[10px] text-ink-muted leading-relaxed mb-1">• {t}</p>)}
                  </div>
                  <div className="rounded-xl bg-card-alt border border-card-border p-3">
                    <p className="text-[11px] font-semibold text-bull mb-2">Practices to adopt</p>
                    {report.practices.map((p) => <p key={p} className="text-[10px] text-ink-muted leading-relaxed mb-1">• {p}</p>)}
                  </div>
                </div>
              </div>
            ) : insight.isError ? (
              <Unavailable what={(insight.error as Error).message} />
            ) : (
              <p className="text-xs text-ink-muted py-6 text-center">
                Generate an AI read on your mindset — which emotional states help vs hurt, your triggers, and habits to build.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function EmotionPnl({ data }: { data: { emotion: string; pnl: number }[] }) {
  return (
    <Card>
      <SectionTitle title="P&L by emotional state" />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
          <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} />
          <YAxis type="category" dataKey="emotion" width={72} tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
            formatter={(v: number) => [fmtMoney(v, true), "P&L"]}
          />
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.emotion} fill={d.pnl >= 0 ? TOKENS.bull : TOKENS.bear} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function EmotionWinRate({ data }: { data: { emotion: string; count: number; winRate: number }[] }) {
  return (
    <Card>
      <SectionTitle title="Win rate & frequency by emotion" sub="Bar = win rate · label = trade count" />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="emotion" tick={{ fill: TOKENS.muted, fontSize: 9 }} stroke={TOKENS.grid} interval={0} angle={-20} textAnchor="end" height={44} />
          <YAxis domain={[0, 100]} tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
            formatter={(v: number, _n, p) => [`${v}% · ${p.payload.count} trades`, p.payload.emotion]}
          />
          <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.emotion} fill={EMOTION_COLOR[d.emotion] ?? TOKENS.neutral} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function DisciplineTrend({ data }: { data: { t: string; discipline: number; pnl: number }[] }) {
  return (
    <Card>
      <SectionTitle title="Discipline trend" sub="Rolling 5-trade rule-adherence over the sequence" />
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid}
            tickFormatter={(t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} />
          <YAxis domain={[0, 100]} tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
            labelFormatter={(t) => new Date(String(t)).toLocaleString("en-GB")}
            formatter={(v: number) => [`${v}%`, "Discipline"]}
          />
          <Line type="monotone" dataKey="discipline" stroke={TOKENS.accentBright} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
