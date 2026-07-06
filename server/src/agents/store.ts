// In-memory store for the scheduled agent cycle. The Global Macro Agent and the
// per-pair agents write here every 15 minutes; the client reads the cached
// results via /api/agents/state (no AI calls from the frontend).

export interface MacroContext {
  usdStrength: { direction: string; note: string };
  riskSentiment: { state: "Risk-On" | "Risk-Off" | "Neutral"; note: string };
  yields: { us10y: string; direction: string };
  centralBanks: string[];
  majorNews: { headline: string; source: string; url: string; sentiment?: string; minutesAgo?: number }[];
  calendarHighlights: { time: string; currency: string; event: string; impact: string }[];
  briefing: { headline: string; paragraphs: string[]; moods: string[] };
  summary: string;
  timestamp: number;
}

export interface PairAnalysis {
  instrument: string;
  bias: "Bullish" | "Bearish" | "Neutral";
  confidence: number;
  impactScore: number; // 1-5 ★ how impactful current conditions are for this market
  analysis: string;
  overview: string;
  edge: { score: number; label: string; explanation: string };
  mood: { riskScore: number; positioning: string };
  policy: { stance: "Hawkish" | "Neutral" | "Dovish"; outlook: string };
  flow: { level: "Thin" | "Healthy" | "Crowded"; bullets: string[] };
  bearing: { label: string; bullets: string[] };
  pulse: { level: "Quiet" | "Tradable" | "Wild"; bullets: string[] };
  drivers: string[];
  risks: string[];
  tradingNarrative: string;
  invalidationLevel: string;
  price: number | null;
  changePct: number | null;
  timestamp: number;
}

/** Per-source health, so "I see nothing" is diagnosable from the UI. */
export interface SourceHealth {
  ok: boolean;
  detail: string; // e.g. "7/7 quotes", "28 headlines", "HTTP 403", "invalid x-api-key"
}

export interface CycleState {
  status: "idle" | "running" | "ok" | "error";
  running: boolean;
  startedAt: number | null;
  completedAt: number | null;
  intervalMs: number;
  error: string | null;
  sources: { prices: SourceHealth; news: SourceHealth; calendar: SourceHealth; ai: SourceHealth } | null;
  macro: MacroContext | null;
  pairs: Record<string, PairAnalysis | null>;
}

export const cycleState: CycleState = {
  status: "idle",
  running: false,
  startedAt: null,
  completedAt: null,
  intervalMs: 15 * 60_000,
  error: null,
  sources: null,
  macro: null,
  pairs: {},
};
