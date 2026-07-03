export interface Quote {
  id: string;
  price: number;
  changePct: number;
  change: number;
  timestamp: number;
  provider: string;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface CandleSeries {
  id: string;
  interval: string;
  candles: Candle[];
  provider: string;
  timestamp: number;
}

export interface InstrumentMeta {
  id: string;
  name: string;
  category: "fx" | "metal" | "index" | "crypto" | "energy";
  primary?: boolean;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  date: string;
  impact: "High" | "Medium" | "Low";
  actual: number | null;
  forecast: number | null;
  previous: number | null;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  summary?: string;
}

export type Bias = "Bullish" | "Bearish" | "Neutral";

export interface BiasResult {
  instrument: string;
  bias: Bias;
  confidence: number;
  analysis: string;
  drivers: string[];
  timestamp: number;
}

export interface EdgeResult {
  instrument: string;
  edge: { score: number; label: string; explanation: string };
  overview: string;
  mood: { riskScore: number; positioning: string };
  policy: { stance: "Hawkish" | "Neutral" | "Dovish"; outlook: string };
  flow: { level: "Thin" | "Healthy" | "Crowded"; bullets: string[] };
  bearing: { label: string; bullets: string[] };
  pulse: { level: "Quiet" | "Tradable" | "Wild"; bullets: string[] };
  timestamp: number;
}

export interface Briefing {
  headline: string;
  paragraphs: string[];
  moods: string[];
  timestamp: number;
}

export interface Trade {
  id: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  openedAt: string;
  closedAt: string | null;
  session: string;
  account: string;
  source: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  size: number;
  pnl: number;
  rMultiple: number | null;
  notes: string;
  emotion: string;
  ruleRR: boolean;
  ruleBreakEven: boolean;
  ruleRisk: boolean;
  isOpen: boolean;
}

export interface JournalStats {
  period: string;
  kpis: {
    netPnl: number;
    profitFactor: number | null;
    winRate: number;
    wins: number;
    losses: number;
    breakeven: number;
    avgWin: number;
    avgLoss: number;
    avgWinLossRatio: number | null;
    expectancyR: number | null;
    totalTrades: number;
  };
  equityCurve: { t: string; equity: number }[];
  heatmap: { date: string; pnl: number }[];
  pnlByDayOfWeek: { label: string; pnl: number }[];
  rDistribution: { bucket: string; count: number }[];
  ruleAdherence: { rr: number; breakEven: number; risk1R: number; violations: number };
  quality: { axes: { axis: string; score: number }[]; score: number };
  risk: {
    dailyPnl: number;
    weeklyPnl: number;
    dailyLimitAmount: number;
    weeklyLimitAmount: number;
    dailyBreached: boolean;
    weeklyBreached: boolean;
    openPositions: number;
    maxOpenPositions: number;
    riskPerTradeAmount: number;
  };
  timestamp: number;
}

export interface Settings {
  accountSize: number;
  riskPct: number;
  dailyLossLimit: number;
  weeklyLossLimit: number;
  maxOpenPositions: number;
}

export interface CoachingReport {
  id?: string;
  period: string;
  summary: string;
  focusActions: { title: string; description: string }[];
  strengths: string[];
  patterns: string[];
  createdAt?: string;
}

export interface Psychology {
  period: string;
  totalTrades: number;
  disciplineScore: number | null;
  emotions: { emotion: string; count: number; pnl: number; winRate: number; avgR: number | null }[];
  disciplineTrend: { t: string; discipline: number; pnl: number }[];
  flags: string[];
  cleanVsViolated: {
    clean: { count: number; pnl: number };
    violated: { count: number; pnl: number };
  };
  timestamp: number;
}

export interface PsychologyInsight {
  period: string;
  assessment: string;
  triggers: string[];
  practices: string[];
  timestamp: number;
}

export interface CommunityProposal {
  id: string;
  symbol: string;
  name: string;
  category: string;
  description: string;
  votes: number;
  createdAt: string;
}
