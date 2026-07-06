import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AiTag, BiasBadge, Card, ChangePct, ConfidenceBar, LastUpdated, LiveBadge,
  SectionTitle, Spinner, Unavailable,
} from "../components/ui";
import {
  useAgentState, useAiStatus, useBias, useBriefing, useCapitalFlow, useCurrencyStrength,
  useMeta, useNews, useQuotes,
} from "../lib/api";
import { clockIn, fmtPct, fmtPrice, timeAgo } from "../lib/format";
import { CURRENCY_COLORS, TOKENS } from "../lib/palette";
import { sessionStatuses } from "../lib/sessions";

const PREVIEW_BIAS = ["US100", "EURUSD", "XAUUSD", "BTCUSD"];
const TICKER_IDS = ["XAUUSD", "US100", "SPX", "EURUSD", "GBPUSD", "BTCUSD", "USOIL"];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const { data: meta } = useMeta();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-accent-bright tracking-tight">
          {greeting()}, {meta?.traderName ?? "trader"}.
        </h1>
        <p className="text-sm text-ink-muted mt-1 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Global economic chaos, turned into clarity.
        </p>
      </div>

      <SessionClocks />
      <SourcesStrip />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3"><MacroDeskPreview /></div>
        <div className="xl:col-span-2"><ForYou /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3"><Ticker /></div>
        <div className="xl:col-span-2"><CapitalFlow /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <NewsFeed />
        <CurrencyStrength />
      </div>
    </div>
  );
}

/**
 * Per-source health from the last agent cycle. Makes "I see nothing" diagnosable:
 * each scraped source (prices/news/calendar) and the AI show ok/error inline.
 */
function SourcesStrip() {
  const { data } = useAgentState();
  const s = data?.sources;
  if (!s) return null;
  const rows: { label: string; h: { ok: boolean; detail: string } }[] = [
    { label: "Prices", h: s.prices },
    { label: "News", h: s.news },
    { label: "Calendar", h: s.calendar },
    { label: "AI", h: s.ai },
  ];
  const anyDown = rows.some((r) => !r.h.ok);
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-3 py-2 text-[11px] ${
      anyDown ? "border-amber/40 bg-amber/5" : "border-card-border bg-card"
    }`}>
      <span className="text-ink-muted font-medium">Data sources</span>
      {rows.map((r) => (
        <span key={r.label} className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${r.h.ok ? "bg-bull" : "bg-bear"}`} />
          <span className={r.h.ok ? "text-ink-muted" : "text-bear"}>
            {r.label}: {r.h.detail}
          </span>
        </span>
      ))}
      {data?.error && <span className="text-bear">cycle: {data.error}</span>}
    </div>
  );
}

function SessionClocks() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const sessions = useMemo(() => sessionStatuses(now), [now]);
  const color = (s: string) =>
    s === "OPEN" ? "text-bull" : s === "PRE-MARKET" ? "text-neutral-badge" : s === "AFTER HOURS" ? "text-amber-500" : "text-ink-muted";
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 !py-3">
      <div className="flex flex-wrap gap-6">
        {sessions.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${s.status === "OPEN" ? "bg-bull" : s.status === "CLOSED" ? "bg-ink-muted" : "bg-neutral-badge"}`} />
            <div>
              <p className="text-[11px] font-semibold text-ink tracking-wider">{s.name}</p>
              <p className="text-[10px]">
                <span className={`${color(s.status)} font-medium`}>{s.status}</span>{" "}
                <span className="text-ink-muted">{s.detail}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-[11px] font-mono">
        <div className="text-right">
          <p className="text-accent-bright">{clockIn("Europe/London", now)}</p>
          <p className="text-ink-muted text-[9px]">LONDON</p>
        </div>
        <div className="text-right">
          <p className="text-accent-bright">{clockIn("UTC", now)}</p>
          <p className="text-ink-muted text-[9px]">UTC</p>
        </div>
      </div>
    </Card>
  );
}

function BiasPreviewCard({ id }: { id: string }) {
  const { data: quotes } = useQuotes(PREVIEW_BIAS);
  const bias = useBias(id);
  const q = quotes?.quotes[id];
  return (
    <Card className="!p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{id}</span>
        <div className="flex items-center gap-2 text-xs">
          <ChangePct value={q?.changePct} />
          {bias.data && <BiasBadge bias={bias.data.bias} />}
        </div>
      </div>
      {bias.data ? (
        <>
          <ConfidenceBar value={bias.data.confidence} />
          <div className="mt-2 rounded-lg bg-card-alt border border-card-border p-2">
            <AiTag />
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed line-clamp-4">{bias.data.analysis}</p>
          </div>
        </>
      ) : bias.isLoading ? (
        <Spinner />
      ) : (
        <p className="text-[11px] text-ink-muted py-3">
          {bias.error instanceof Error ? bias.error.message : "AI analysis unavailable"}
        </p>
      )}
    </Card>
  );
}

function MacroDeskPreview() {
  const { data: quotes } = useQuotes(PREVIEW_BIAS);
  return (
    <Card>
      <SectionTitle
        title="AI Macro Desk"
        sub="Market bias analysis"
        right={
          <Link to="/macro-desk" className="text-xs text-accent-bright hover:underline">
            View All →
          </Link>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PREVIEW_BIAS.map((id) => (
          <BiasPreviewCard key={id} id={id} />
        ))}
      </div>
      <div className="mt-2 flex justify-end"><LastUpdated ts={quotes?.timestamp} /></div>
    </Card>
  );
}

function ForYou() {
  const briefing = useBriefing();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="h-full">
      <SectionTitle
        title="For You"
        sub="Your pre-session market briefing"
        right={
          <span className="text-[10px] text-ink-muted border border-card-border rounded-full px-2 py-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
          </span>
        }
      />
      {briefing.data ? (
        <>
          <div className="flex gap-1.5 mb-2">
            <span className="text-[10px] text-ink-muted">Mood</span>
            {briefing.data.moods.map((m) => (
              <span key={m} className="text-[10px] font-medium text-accent-bright bg-accent/10 border border-accent/20 rounded-full px-2">
                {m}
              </span>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-ink mb-2">{briefing.data.headline}</h3>
          <p className="text-xs text-ink-muted leading-relaxed">{briefing.data.paragraphs[0]}</p>
          {expanded &&
            briefing.data.paragraphs.slice(1).map((p, i) => (
              <p key={i} className="text-xs text-ink-muted leading-relaxed mt-2">{p}</p>
            ))}
          {briefing.data.paragraphs.length > 1 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-accent-bright mt-2 hover:underline">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </>
      ) : briefing.isLoading ? (
        <Spinner />
      ) : (
        <Unavailable what={briefing.error instanceof Error ? briefing.error.message : "AI briefing"} />
      )}
    </Card>
  );
}

function CapitalFlow() {
  const { data } = useCapitalFlow();
  const rows = data?.rows ?? [];
  const maxAbs = Math.max(0.1, ...rows.map((r) => Math.abs(r.changePct ?? 0)));
  return (
    <Card className="h-full">
      <SectionTitle
        title="Capital Flow"
        sub="Session % change per asset (computed from live quotes)"
        right={<div className="flex flex-col items-end gap-1"><LiveBadge /><LastUpdated ts={data?.timestamp} /></div>}
      />
      {rows.length ? (
        <div className="space-y-1">
          {rows.map((r) => {
            const v = r.changePct;
            const w = v === null ? 0 : (Math.abs(v) / maxAbs) * 50;
            return (
              <div key={r.id} className="flex items-center gap-2 text-[11px]" title={`${r.id}: ${fmtPct(v)}`}>
                <span className="w-14 text-ink-muted font-medium">{r.id}</span>
                <div className="flex-1 relative h-3.5">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-card-border" />
                  {v !== null && (
                    <div
                      className={`absolute inset-y-0.5 rounded-sm ${v >= 0 ? "bg-bull/80" : "bg-bear/80"}`}
                      style={v >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                    />
                  )}
                </div>
                <span className={`w-14 text-right font-medium ${v === null ? "text-ink-muted" : v >= 0 ? "text-bull" : "text-bear"}`}>
                  {v === null ? "n/a" : fmtPct(v)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <Unavailable />
      )}
    </Card>
  );
}

function Ticker() {
  const { data } = useQuotes(TICKER_IDS);
  return (
    <Card className="!py-3 h-full">
      <div className="flex gap-6 overflow-x-auto">
        {TICKER_IDS.map((id) => {
          const q = data?.quotes[id];
          return (
            <div key={id} className="shrink-0">
              <p className="text-[10px] text-ink-muted font-medium">{id}</p>
              <p className="text-sm font-semibold">{q ? fmtPrice(q.price) : "—"}</p>
              <p className="text-[10px]"><ChangePct value={q?.changePct} /></p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NewsFeed() {
  const { data, isLoading } = useNews();
  const items = data?.items ?? [];
  return (
    <Card>
      <SectionTitle title="News Feed" right={<LiveBadge />} />
      {isLoading ? (
        <Spinner />
      ) : items.length ? (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.slice(0, 15).map((n) => (
            <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="block group">
              <div className="flex items-center gap-2 text-[10px] text-ink-muted">
                <span className="w-4 h-4 rounded-full bg-card-alt border border-card-border flex items-center justify-center text-[8px] font-bold text-accent-bright">
                  {n.source.charAt(0).toUpperCase()}
                </span>
                <span>{n.source}</span>
                <span>·</span>
                <span>{timeAgo(n.publishedAt)}</span>
                <svg className="ml-auto opacity-0 group-hover:opacity-100" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6m0 0v6m0-6L10 14" /></svg>
              </div>
              <p className="text-xs text-ink mt-1 group-hover:text-accent-bright transition-colors leading-snug">
                {n.headline}
              </p>
              <span className="inline-block text-[9px] text-ink-muted border border-card-border rounded px-1.5 mt-1 capitalize">
                {n.category}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <Unavailable what="news" />
      )}
    </Card>
  );
}

function CurrencyStrength() {
  const { data, isLoading, error } = useCurrencyStrength();
  return (
    <Card>
      <SectionTitle
        title="Currency Strength"
        sub="Relative currency performance today (computed from the live FX matrix)"
        right={<div className="flex flex-col items-end gap-1"><LiveBadge /><LastUpdated ts={data?.timestamp} /></div>}
      />
      {isLoading ? (
        <Spinner />
      ) : data && data.points.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.points} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={TOKENS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: TOKENS.muted, fontSize: 10 }}
              tickFormatter={(t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              stroke={TOKENS.grid}
            />
            <YAxis tick={{ fill: TOKENS.muted, fontSize: 10 }} stroke={TOKENS.grid} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: TOKENS.muted }}
              labelFormatter={(t) => new Date(Number(t)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: TOKENS.muted }} iconType="plainline" />
            {data.currencies.map((cur) => (
              <Line
                key={cur}
                type="monotone"
                dataKey={cur}
                stroke={CURRENCY_COLORS[cur] ?? TOKENS.neutral}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Unavailable what={error instanceof Error ? "currency strength data" : "data"} />
      )}
    </Card>
  );
}
