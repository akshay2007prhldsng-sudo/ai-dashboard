// DEMO_MODE=1 fills every panel with realistic, clearly-labelled mock data so the
// whole dashboard can be viewed without any keys, credits, or network access.
// Deterministic — same look on every run. Nothing here is real market data.

import type { MacroContext, PairAnalysis } from "./agents/store.js";
import { symbolById } from "./instruments.js";
import type { CandleSeries, EconomicEvent, NewsItem, Quote } from "./providers/types.js";

const BASE: Record<string, number> = {
  XAUUSD: 2350.4, US100: 20120.5, SPX: 5620.3, EURUSD: 1.0842, GBPUSD: 1.2715,
  BTCUSD: 64180, USOIL: 78.35, DXY: 104.25, US10Y: 4.32, VIX: 13.8, COPPER: 4.55,
  USDJPY: 156.2, AUDUSD: 0.665, USDCAD: 1.366, USDCHF: 0.895,
};
const CHG: Record<string, number> = {
  XAUUSD: 0.42, US100: -0.25, SPX: 0.11, EURUSD: 0.18, GBPUSD: -0.09, BTCUSD: 1.35,
  USOIL: -0.63, DXY: -0.14, US10Y: 0.31, VIX: -3.2, COPPER: 0.6,
  USDJPY: 0.28, AUDUSD: 0.2, USDCAD: -0.1, USDCHF: 0.05,
};

function base(id: string): number {
  if (BASE[id] != null) return BASE[id];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return 50 + (h % 500);
}

export function mockQuote(id: string): Quote | null {
  if (!symbolById.has(id)) return null;
  const price = base(id);
  const changePct = CHG[id] ?? 0.1;
  const change = (price * changePct) / 100;
  return { id, price, previousClose: price - change, change, changePct, timestamp: Date.now(), provider: "demo" };
}

export function mockCandles(id: string, interval: "5min" | "1h" | "1day", points: number): CandleSeries | null {
  if (!symbolById.has(id)) return null;
  const b = base(id);
  const step = interval === "5min" ? 5 * 60_000 : interval === "1h" ? 3_600_000 : 86_400_000;
  const trend = (CHG[id] ?? 0) / 100;
  const now = Date.now();
  const candles = Array.from({ length: points }, (_, i) => {
    const drift = 1 + trend * ((i - points) / points);
    const wave = Math.sin(i * 0.35) * 0.006 + ((Math.sin(i * 91.7) * 4373.1) % 1) * 0.004;
    const c = b * drift * (1 + wave);
    const o = b * drift * (1 + wave - 0.0015);
    return { t: now - (points - i) * step, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c };
  });
  return { id, interval, candles, provider: "demo", timestamp: Date.now() };
}

const HEADLINES: { headline: string; source: string; category: string; sentiment: string }[] = [
  { headline: "Tech leads gains as AI earnings beat expectations", source: "cnbc.com", category: "markets", sentiment: "Bullish" },
  { headline: "Dollar softens after cooler-than-expected US CPI", source: "reuters.com", category: "forex", sentiment: "Bearish" },
  { headline: "Gold steadies near record as yields ease", source: "marketwatch.com", category: "commodities", sentiment: "Bullish" },
  { headline: "Nasdaq 100 futures slip as chipmakers cool off", source: "investing.com", category: "markets", sentiment: "Bearish" },
  { headline: "Bitcoin extends rally on renewed ETF inflows", source: "coindesk.com", category: "crypto", sentiment: "Bullish" },
  { headline: "Oil falls as demand worries offset supply risk", source: "reuters.com", category: "commodities", sentiment: "Bearish" },
  { headline: "ECB officials signal patience on rate path", source: "cnbc.com", category: "forex", sentiment: "Neutral" },
  { headline: "S&P 500 edges higher into pivotal jobs week", source: "marketwatch.com", category: "markets", sentiment: "Bullish" },
  { headline: "Sterling firms as UK services PMI beats forecast", source: "investing.com", category: "forex", sentiment: "Bullish" },
  { headline: "Treasury yields tick up ahead of Fed minutes", source: "reuters.com", category: "bonds", sentiment: "Neutral" },
  { headline: "VIX drops as equity volatility subsides", source: "cnbc.com", category: "markets", sentiment: "Bullish" },
  { headline: "Copper rises on China stimulus optimism", source: "marketwatch.com", category: "commodities", sentiment: "Bullish" },
];

export function mockNews(): NewsItem[] {
  const now = Date.now();
  return HEADLINES.map((h, i) => ({
    id: `demo-news-${i}`,
    headline: h.headline,
    source: h.source,
    url: `https://${h.source}`,
    publishedAt: new Date(now - (i * 13 + 5) * 60_000).toISOString(),
    category: h.category,
    summary: `Sentiment: ${h.sentiment}`,
    provider: "demo",
  }));
}

const EVENTS: { time: string; currency: string; event: string; impact: EconomicEvent["impact"]; forecast: number | null; previous: number | null; actual: number | null }[] = [
  { time: "12:30", currency: "USD", event: "Core CPI m/m", impact: "High", forecast: 0.3, previous: 0.4, actual: 0.2 },
  { time: "12:30", currency: "USD", event: "Initial Jobless Claims", impact: "Medium", forecast: 235, previous: 238, actual: null },
  { time: "14:00", currency: "USD", event: "Fed Chair Speech", impact: "High", forecast: null, previous: null, actual: null },
  { time: "09:00", currency: "EUR", event: "ECB Monetary Policy Statement", impact: "High", forecast: null, previous: null, actual: null },
  { time: "08:00", currency: "GBP", event: "GDP m/m", impact: "Medium", forecast: 0.2, previous: 0.4, actual: null },
  { time: "23:50", currency: "JPY", event: "BOJ Summary of Opinions", impact: "Medium", forecast: null, previous: null, actual: null },
  { time: "15:30", currency: "USD", event: "Crude Oil Inventories", impact: "Medium", forecast: -1.2, previous: 3.6, actual: null },
];

export function mockCalendar(from: string, _to: string): EconomicEvent[] {
  return EVENTS.map((e, i) => ({
    id: `demo-evt-${i}`,
    title: e.event,
    country: e.currency,
    currency: e.currency,
    date: new Date(`${from}T${e.time}:00Z`).toISOString(),
    impact: e.impact,
    actual: e.actual,
    forecast: e.forecast,
    previous: e.previous,
    provider: "demo",
  }));
}

export function mockMacro(): MacroContext {
  const now = Date.now();
  return {
    usdStrength: { direction: "Softening", note: "DXY slips as US CPI cools; rate-cut odds tick up." },
    riskSentiment: { state: "Risk-On", note: "Equities firm, VIX easing, credit spreads tight." },
    yields: { us10y: "4.32%", direction: "Marginally higher into Fed minutes" },
    centralBanks: [
      "Fed: data-dependent, market prices first cut later this year",
      "ECB: patient, signalling no rush despite easing inflation",
      "BoE: services inflation still the swing factor",
    ],
    majorNews: HEADLINES.slice(0, 6).map((h, i) => ({
      headline: h.headline, source: h.source, url: `https://${h.source}`,
      sentiment: h.sentiment, minutesAgo: i * 13 + 5,
    })),
    calendarHighlights: EVENTS.filter((e) => e.impact !== "Low").slice(0, 6)
      .map((e) => ({ time: e.time + " UTC", currency: e.currency, event: e.event, impact: e.impact })),
    briefing: {
      headline: "Risk-On Into CPI: Tech Bid, Dollar Soft, Gold Firm",
      paragraphs: [
        "Softer US inflation is doing the heavy lifting: the dollar is on the back foot, front-end yields have eased, and risk assets are catching a bid led by tech.",
        "The read-through is broadly constructive for equities and gold, and a modest headwind for the dollar. Core CPI and the Fed speaker later today are the pivots — a hot print flips this quickly.",
      ],
      moods: ["Constructive", "Data-sensitive"],
    },
    summary: "Cooling US inflation softens the dollar and eases yields; risk sentiment is on, tech leads, gold firm, oil heavy on demand worries. CPI + Fed speaker are today's swing events.",
    timestamp: now,
  };
}

const FLAVOR: Record<string, { bias: PairAnalysis["bias"]; conf: number; impact: number; label: string; drivers: string[] }> = {
  XAUUSD: { bias: "Bullish", conf: 82, impact: 4, label: "Aligned Bullish", drivers: ["Softer USD supports bullion", "Yields easing lowers opportunity cost", "Safe-haven bid steady"] },
  US100: { bias: "Bullish", conf: 68, impact: 4, label: "Constructive but extended", drivers: ["AI earnings momentum", "Falling yields lift duration-sensitive tech", "Watch overbought RSI"] },
  SPX: { bias: "Bullish", conf: 64, impact: 3, label: "Grind higher", drivers: ["Broad participation improving", "Soft-landing narrative intact", "CPI is the swing factor"] },
  EURUSD: { bias: "Bullish", conf: 71, impact: 3, label: "USD-led upside", drivers: ["US CPI miss pressures the dollar", "ECB patient, not dovish", "1.08 pivot in focus"] },
  GBPUSD: { bias: "Neutral", conf: 58, impact: 2, label: "Range-bound", drivers: ["Resilient UK services PMI", "BoE nuance keeps it two-way", "Dollar tone dominates"] },
  BTCUSD: { bias: "Bullish", conf: 74, impact: 4, label: "Momentum + flows", drivers: ["Renewed ETF inflows", "Risk-on macro tailwind", "Watch prior-high supply"] },
  USOIL: { bias: "Bearish", conf: 62, impact: 3, label: "Demand-led drift", drivers: ["Demand worries outweigh supply risk", "Builds in inventories", "OPEC headlines a wildcard"] },
};

export function mockPair(id: string): PairAnalysis {
  const f = FLAVOR[id] ?? { bias: "Neutral" as const, conf: 55, impact: 2, label: "Mixed", drivers: ["Awaiting a cleaner catalyst"] };
  const q = mockQuote(id);
  const bullish = f.bias === "Bullish";
  return {
    instrument: id,
    bias: f.bias,
    confidence: f.conf,
    impactScore: f.impact,
    analysis: `${id} reads ${f.bias.toLowerCase()} as macro and technicals lean the same way — ${f.label.toLowerCase()} into the session.`,
    overview: `${id}: ${f.label}. The macro backdrop (softer USD, easing yields, risk-on) and the current technical structure are broadly ${bullish ? "supportive" : f.bias === "Bearish" ? "a headwind" : "balanced"}.`,
    edge: {
      score: f.bias === "Neutral" ? 44 : 60 + f.impact * 4,
      label: f.label,
      explanation: `Macro and technicals ${f.bias === "Neutral" ? "disagree enough to blur the edge" : "line up"}. ${f.bias === "Neutral" ? "Preserve capital and wait for a cleaner impulse." : "Engage on confirmation; keep risk to 1R."}`,
    },
    mood: { riskScore: bullish ? 70 : f.bias === "Bearish" ? 40 : 55, positioning: "Risk sentiment is constructive; participation is healthy without being euphoric." },
    policy: { stance: "Neutral", outlook: "Central banks are patient and data-dependent; the inflation path drives the next leg." },
    flow: { level: "Healthy", bullets: ["Participation in the normal band", "No crowding extreme yet", "Room for a directional push"] },
    bearing: { label: bullish ? "Grind Up" : f.bias === "Bearish" ? "Choppy Down" : "Sideways", bullets: ["Structure follows the macro lean", "Stops respected so far", "Wait for a clean break for continuation"] },
    pulse: { level: "Tradable", bullets: ["ATR within historical norms", "Standard risk-reward achievable", "Normal stop sizing applies"] },
    drivers: f.drivers,
    risks: ["Hot CPI flips the dollar and risk tone", "Thin liquidity around the data release", "Headline / central-bank surprise"],
    tradingNarrative: `Let ${id} come to a level in line with the ${f.bias.toLowerCase()} lean; engage on confirmation, size to 1R, target 1:2–1:3, and move to break-even at 1.5R.`,
    invalidationLevel: `A sustained close back through the opposing side of today's range (around ${q ? (q.price * (bullish ? 0.994 : 1.006)).toFixed(q.price > 100 ? 1 : 4) : "the session extreme"}) invalidates the bias.`,
    price: q ? q.price : null,
    changePct: q ? q.changePct : null,
    timestamp: Date.now(),
  };
}
