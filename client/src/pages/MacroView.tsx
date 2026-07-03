import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Gauge, LevelSlider } from "../components/Gauge";
import { MiniChart } from "../components/MiniChart";
import {
  AiTag, Card, ChangePct, LastUpdated, LiveBadge, SectionTitle, Spinner, Unavailable,
} from "../components/ui";
import { useCandles, useEdge, useMeta, useQuotes, useRelativeStrength } from "../lib/api";
import { fmtPrice } from "../lib/format";
import { BASKET_COLORS, TOKENS } from "../lib/palette";
import { sessionStatuses } from "../lib/sessions";

type TF = "1D" | "5D" | "1M";
const TF_CONFIG: Record<TF, { interval: "5min" | "1h" | "1day"; points: number }> = {
  "1D": { interval: "5min", points: 96 },
  "5D": { interval: "1h", points: 120 },
  "1M": { interval: "1day", points: 30 },
};

export function MacroView() {
  const { id = "US100" } = useParams();
  const { data: meta } = useMeta();
  const inst = meta?.instruments.find((i) => i.id === id);
  const { data: quotes } = useQuotes([id]);
  const edge = useEdge(id);
  const [tf, setTf] = useState<TF>("1D");
  const candles = useCandles(id, TF_CONFIG[tf].interval, TF_CONFIG[tf].points);
  const q = quotes?.quotes[id];

  return (
    <div className="space-y-4">
      <Link to="/macro-desk" className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1">
        ← Back to AI Macro Desk
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-card-alt border border-card-border flex items-center justify-center text-xs font-bold text-accent-bright">
            {id.slice(0, 3)}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{id}</h1>
            <p className="text-sm text-ink-muted">{inst?.name ?? ""}</p>
          </div>
        </div>

        {/* Edge Factor */}
        <Card className="max-w-xl flex gap-4 items-start border-amber-500/30">
          {edge.data ? (
            <>
              <div className="shrink-0 text-center">
                <div className="w-14 h-14 rounded-full border-2 border-amber-500/60 flex items-center justify-center text-xl font-bold text-amber-400">
                  {edge.data.edge.score}
                </div>
                <p className="text-[9px] text-amber-400 font-semibold mt-1 max-w-[70px]">{edge.data.edge.label}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink mb-1">Edge Factor</p>
                <p className="text-[11px] text-ink-muted leading-relaxed">{edge.data.edge.explanation}</p>
              </div>
            </>
          ) : edge.isLoading ? (
            <Spinner />
          ) : (
            <p className="text-xs text-ink-muted">
              {edge.error instanceof Error ? edge.error.message : "Edge Factor unavailable"}
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Price block */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-semibold">{q ? fmtPrice(q.price) : "—"}</p>
              <p className="text-xs mt-0.5"><ChangePct value={q?.changePct} /></p>
            </div>
            <div className="flex gap-1">
              {(Object.keys(TF_CONFIG) as TF[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className={`text-[10px] font-medium rounded px-2 py-1 border transition-colors ${
                    tf === t ? "bg-accent text-app border-accent" : "text-ink-muted border-card-border hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2">
            {candles.data ? (
              <MiniChart candles={candles.data.candles} height={150} />
            ) : candles.isLoading ? (
              <Spinner />
            ) : (
              <Unavailable what="price data" />
            )}
          </div>
          <LastUpdated ts={candles.data?.timestamp} />
        </Card>

        {/* AI overview */}
        <Card className="xl:col-span-2">
          <AiTag />
          <p className="text-sm font-semibold mt-1 mb-2">AI overview</p>
          {edge.data ? (
            <p className="text-xs text-ink-muted leading-relaxed">{edge.data.overview}</p>
          ) : edge.isLoading ? (
            <Spinner />
          ) : (
            <Unavailable what="AI overview" />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <MoodPanel edge={edge.data} />
            <PolicyPanel edge={edge.data} />
          </div>
        </Card>
      </div>

      {/* Regime cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RegimeCard
          title="Flow"
          headline={edge.data?.flow.level}
          headlineColor={edge.data?.flow.level === "Crowded" ? "text-bear" : edge.data?.flow.level === "Thin" ? "text-amber-400" : "text-bull"}
          bullets={edge.data?.flow.bullets}
          loading={edge.isLoading}
          slider={edge.data ? <LevelSlider levels={["Thin", "Healthy", "Crowded"]} active={edge.data.flow.level} activeColor={edge.data.flow.level === "Crowded" ? TOKENS.bear : TOKENS.accent} /> : null}
        />
        <RegimeCard
          title="Bearing"
          headline={edge.data?.bearing.label}
          headlineColor={edge.data?.bearing.label.toLowerCase().includes("down") ? "text-bear" : edge.data?.bearing.label.toLowerCase().includes("up") ? "text-bull" : "text-ink"}
          bullets={edge.data?.bearing.bullets}
          loading={edge.isLoading}
        />
        <RegimeCard
          title="Pulse"
          headline={edge.data?.pulse.level}
          headlineColor={edge.data?.pulse.level === "Wild" ? "text-bear" : edge.data?.pulse.level === "Quiet" ? "text-ink-muted" : "text-bull"}
          bullets={edge.data?.pulse.bullets}
          loading={edge.isLoading}
          slider={edge.data ? <LevelSlider levels={["Quiet", "Tradable", "Wild"]} active={edge.data.pulse.level} activeColor={edge.data.pulse.level === "Wild" ? TOKENS.bear : TOKENS.accent} /> : null}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <MarketSessionsCard />
        <RelativeStrengthCard />
      </div>
    </div>
  );
}

function MoodPanel({ edge }: { edge: ReturnType<typeof useEdge>["data"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-card-alt border border-card-border p-3">
      <SectionTitle title="Market Mood" />
      {edge ? (
        <>
          <Gauge
            value={edge.mood.riskScore}
            leftLabel="RISK-OFF"
            rightLabel="RISK-ON"
            centerLabel={edge.mood.riskScore >= 60 ? "Risk-On" : edge.mood.riskScore <= 40 ? "Risk-Off" : "Neutral"}
          />
          <p className="text-[11px] font-semibold mt-2">Investor Positioning</p>
          <p className={`text-[11px] text-ink-muted leading-relaxed ${open ? "" : "line-clamp-3"}`}>{edge.mood.positioning}</p>
          <button onClick={() => setOpen(!open)} className="text-[10px] text-accent-bright mt-1 hover:underline">
            {open ? "Collapse" : "Expand"}
          </button>
        </>
      ) : (
        <Unavailable what="mood" />
      )}
    </div>
  );
}

function PolicyPanel({ edge }: { edge: ReturnType<typeof useEdge>["data"] }) {
  const [open, setOpen] = useState(false);
  const stanceColor =
    edge?.policy.stance === "Hawkish" ? "text-bear" : edge?.policy.stance === "Dovish" ? "text-bull" : "text-neutral-badge";
  return (
    <div className="rounded-xl bg-card-alt border border-card-border p-3">
      <SectionTitle title="Market Policy" />
      {edge ? (
        <>
          <p className={`text-lg font-bold tracking-[0.3em] text-center my-3 ${stanceColor}`}>
            {edge.policy.stance.toUpperCase()}
          </p>
          <p className="text-[11px] font-semibold">Global Economic Outlook</p>
          <p className={`text-[11px] text-ink-muted leading-relaxed ${open ? "" : "line-clamp-3"}`}>{edge.policy.outlook}</p>
          <button onClick={() => setOpen(!open)} className="text-[10px] text-accent-bright mt-1 hover:underline">
            {open ? "Collapse" : "Expand"}
          </button>
        </>
      ) : (
        <Unavailable what="policy" />
      )}
    </div>
  );
}

function RegimeCard({
  title, headline, headlineColor = "text-ink", bullets, loading, slider,
}: {
  title: string;
  headline?: string;
  headlineColor?: string;
  bullets?: string[];
  loading: boolean;
  slider?: React.ReactNode;
}) {
  return (
    <Card>
      <p className="text-xs text-ink-muted mb-2">{title}</p>
      {headline ? (
        <>
          <p className={`text-center text-base font-bold tracking-[0.2em] my-3 ${headlineColor}`}>
            {headline.toUpperCase()}
          </p>
          {slider}
          <ul className="mt-3 space-y-1.5">
            {bullets?.map((b, i) => (
              <li key={i} className="text-[11px] text-ink-muted flex gap-2">
                <span className="text-accent-bright mt-0.5">•</span>
                {b}
              </li>
            ))}
          </ul>
        </>
      ) : loading ? (
        <Spinner />
      ) : (
        <Unavailable />
      )}
    </Card>
  );
}

function MarketSessionsCard() {
  const sessions = useMemo(() => sessionStatuses(), []);
  return (
    <Card>
      <SectionTitle title="Market Sessions" right={<span className="text-[10px] text-ink-muted border border-card-border rounded-full px-2 py-0.5">Europe/London timezone</span>} />
      <div className="grid grid-cols-2 gap-3">
        {sessions.map((s) => (
          <div key={s.name} className="rounded-xl bg-card-alt border border-card-border p-3">
            <p className="text-[11px] font-semibold tracking-wider">{s.name}</p>
            <p className={`text-xs font-medium mt-1 ${s.status === "OPEN" ? "text-bull" : "text-ink-muted"}`}>{s.status}</p>
            <p className="text-[10px] text-ink-muted">{s.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RelativeStrengthCard() {
  const { data, isLoading } = useRelativeStrength();
  const merged = useMemo(() => {
    if (!data?.series.length) return [];
    const base = data.series[0].points;
    return base.map((p, i) => {
      const row: Record<string, number> = { t: p.t };
      for (const s of data.series) row[s.id] = s.points[i]?.v ?? 0;
      return row;
    });
  }, [data]);

  return (
    <Card>
      <SectionTitle
        title="Relative Strength"
        sub="Basket indexed to session open (computed)"
        right={<span className="text-[10px] text-ink-muted border border-card-border rounded-full px-2 py-0.5">Basket: US30 · DXY · US10Y · VIX</span>}
      />
      {isLoading ? (
        <Spinner />
      ) : merged.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
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
              labelFormatter={(t) => new Date(Number(t)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" />
            {data!.series.map((s) => (
              <Line key={s.id} type="monotone" dataKey={s.id} stroke={BASKET_COLORS[s.id] ?? TOKENS.neutral} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Unavailable />
      )}
    </Card>
  );
}
