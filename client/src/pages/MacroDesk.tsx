import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AiTag, BiasBadge, Card, ChangePct, ConfidenceBar, LastUpdated, SectionTitle,
  Spinner,
} from "../components/ui";
import { useAiStatus, useBias, useMeta, useQuotes } from "../lib/api";

const CATEGORY_TINT: Record<string, string> = {
  index: "before:bg-sky",
  fx: "before:bg-accent",
  metal: "before:bg-amber",
  crypto: "before:bg-violet",
  energy: "before:bg-bear",
};

function BiasCard({ id, aiOn, category }: { id: string; aiOn: boolean; category?: string }) {
  const { data: quotes } = useQuotes();
  const bias = useBias(id);
  void aiOn;
  const [showQuick, setShowQuick] = useState(false);
  const navigate = useNavigate();
  const q = quotes?.quotes[id];
  const tint = CATEGORY_TINT[category ?? ""] ?? "before:bg-accent";

  return (
    <Card
      className={`flex flex-col group cursor-pointer relative overflow-hidden transition-colors hover:border-accent/40
        before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${tint} before:opacity-70`}
    >
      {/* Whole card navigates to the deep dive; inner controls stopPropagation. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/macro-view/${id}`)}
        onKeyDown={(e) => e.key === "Enter" && navigate(`/macro-view/${id}`)}
        className="absolute inset-0 z-0"
        aria-label={`Open ${id} deep dive`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-semibold group-hover:text-accent-bright transition-colors">{id}</span>
          <div className="flex items-center gap-2 text-xs">
            <ChangePct value={q?.changePct} />
            {bias.data && <BiasBadge bias={bias.data.bias} />}
          </div>
        </div>

        {bias.data ? (
          <>
            <ConfidenceBar value={bias.data.confidence} />
            <div className="mt-1"><LastUpdated ts={bias.data.timestamp} /></div>
            <div className="mt-2 rounded-lg bg-card-alt border border-card-border p-2.5 flex-1">
              <AiTag />
              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">{bias.data.analysis}</p>
            </div>
            <div className="flex gap-2 mt-3 pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setShowQuick(!showQuick); }}
                className="flex-1 text-xs font-medium text-ink border border-card-border rounded-lg py-2 hover:border-accent/40 bg-card transition-colors"
              >
                Quick Overview {showQuick ? "▴" : "▾"}
              </button>
              <Link
                to={`/macro-view/${id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-xs font-semibold text-app bg-accent hover:bg-accent-hover rounded-lg py-2 text-center transition-colors"
              >
                Deep Dive ↗
              </Link>
            </div>
            {showQuick && (
              <ul className="mt-3 space-y-1.5">
                {bias.data.drivers.map((d, i) => (
                  <li key={i} className="text-[11px] text-ink-muted flex gap-2">
                    <span className="text-accent-bright mt-0.5">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : bias.isLoading ? (
          <Spinner />
        ) : (
          <div className="pointer-events-auto">
            <p className="text-xs text-ink-muted py-4">
              {bias.error instanceof Error ? bias.error.message : "AI analysis unavailable"}
            </p>
            <Link to={`/macro-view/${id}`} onClick={(e) => e.stopPropagation()}
              className="inline-block text-xs font-semibold text-app bg-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 transition-colors">
              Deep Dive ↗
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

export function MacroDesk() {
  const { data: meta } = useMeta();
  const { data: quotes } = useQuotes();
  const { data: ai } = useAiStatus();

  const instruments = useMemo(() => {
    const list = meta?.instruments ?? [];
    // Primary instruments (NQ, ES, Gold) first
    return [...list].sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
  }, [meta]);

  const sentiment = useMemo(() => {
    const changes = Object.values(quotes?.quotes ?? {})
      .filter(Boolean)
      .map((q) => q!.changePct);
    if (!changes.length) return null;
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    const up = changes.filter((c) => c > 0).length;
    const breadth = (up / changes.length) * 100;
    const label =
      avg > 0.5 ? "Strongly bullish" : avg > 0.1 ? "Moderately bullish" : avg < -0.5 ? "Strongly bearish" : avg < -0.1 ? "Moderately bearish" : "Mixed";
    return { label, confidence: Math.round(breadth) };
  }, [quotes]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-accent-bright tracking-tight">AI Market Bias Dashboard</h1>
        <p className="text-sm text-ink-muted mt-1">Where deep institutional analysis meets AI-driven clarity</p>
      </div>

      <Card className="!py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">Overall market sentiment:</span>
          {sentiment ? (
            <span className="text-neutral-badge bg-neutral-badge/10 border border-neutral-badge/30 rounded-full px-2.5 py-0.5 font-medium">
              {sentiment.label}
            </span>
          ) : (
            <span className="text-ink-muted">data unavailable</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">Breadth index:</span>
          <span className="text-accent-bright bg-accent/10 border border-accent/20 rounded-full px-2.5 py-0.5 font-medium">
            {sentiment ? `${sentiment.confidence}%` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">Page update:</span>
          <LastUpdated ts={quotes?.timestamp} />
        </div>
      </Card>

      {ai?.available === false && (
        <Card className="!py-3 text-xs text-amber-400">
          AI layer not configured — set <code className="text-ink">ANTHROPIC_API_KEY</code> in{" "}
          <code className="text-ink">server/.env</code> to enable bias analysis. Prices remain live.
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instruments.map((inst) => (
          <BiasCard key={inst.id} id={inst.id} category={inst.category} aiOn={ai?.available === true} />
        ))}
      </div>
    </div>
  );
}
