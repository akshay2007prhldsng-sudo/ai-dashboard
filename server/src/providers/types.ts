import type { Instrument } from "../instruments.js";

export interface Quote {
  id: string; // canonical instrument id
  price: number;
  changePct: number; // % change vs previous close
  change: number;
  previousClose?: number;
  timestamp: number; // ms epoch of retrieval
  provider: string;
}

export interface Candle {
  t: number; // ms epoch
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

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  date: string; // ISO
  impact: "High" | "Medium" | "Low";
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  provider: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string; // ISO
  category: string;
  summary?: string;
  provider: string;
}

export interface QuoteProvider {
  name: string;
  available(): boolean;
  supports(inst: Instrument): boolean;
  getQuote(inst: Instrument): Promise<Quote>;
  /** Optional: fetch many quotes in one request (e.g. Twelve Data comma-separated symbols). */
  getQuotesBatch?(insts: Instrument[]): Promise<Record<string, Quote>>;
  getCandles(inst: Instrument, interval: "5min" | "1h" | "1day", points: number): Promise<CandleSeries>;
}
