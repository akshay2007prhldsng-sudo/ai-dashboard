import { config } from "../config.js";
import type { Instrument } from "../instruments.js";
import type { CandleSeries, NewsItem, Quote, QuoteProvider } from "./types.js";

const BASE = "https://finnhub.io/api/v1";

async function fh(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({ ...params, token: config.finnhubKey });
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  return res.json();
}

const RESOLUTION_MAP: Record<string, string> = { "5min": "5", "1h": "60", "1day": "D" };

export const finnhubProvider: QuoteProvider = {
  name: "finnhub",
  available: () => Boolean(config.finnhubKey),
  supports: (inst: Instrument) => Boolean(inst.finnhub),

  async getQuote(inst) {
    const json = await fh("/quote", { symbol: inst.finnhub! });
    const price = Number(json.c);
    if (!Number.isFinite(price) || price === 0) throw new Error(`Finnhub: no price for ${inst.id}`);
    const prev = Number(json.pc);
    const quote: Quote = {
      id: inst.id,
      price,
      previousClose: Number.isFinite(prev) ? prev : undefined,
      change: Number(json.d) || 0,
      changePct: Number(json.dp) || 0,
      timestamp: Date.now(),
      provider: this.name,
    };
    return quote;
  },

  async getCandles(inst, interval, points) {
    const resolution = RESOLUTION_MAP[interval];
    const secondsPer = interval === "5min" ? 300 : interval === "1h" ? 3600 : 86400;
    const to = Math.floor(Date.now() / 1000);
    const from = to - secondsPer * points * 2; // pad for market closures
    const path = inst.finnhub!.includes(":") && !inst.finnhub!.startsWith("BINANCE")
      ? "/forex/candle"
      : inst.finnhub!.startsWith("BINANCE")
        ? "/crypto/candle"
        : "/stock/candle";
    const json = await fh(path, { symbol: inst.finnhub!, resolution, from: String(from), to: String(to) });
    if (json.s !== "ok" || !Array.isArray(json.t) || !json.t.length) {
      throw new Error(`Finnhub: no candles for ${inst.id}`);
    }
    const candles = json.t.map((t: number, i: number) => ({
      t: t * 1000,
      o: Number(json.o[i]),
      h: Number(json.h[i]),
      l: Number(json.l[i]),
      c: Number(json.c[i]),
    }));
    const series: CandleSeries = {
      id: inst.id,
      interval,
      candles: candles.slice(-points),
      provider: this.name,
      timestamp: Date.now(),
    };
    return series;
  },
};

/** General market news via Finnhub. */
export async function finnhubNews(): Promise<NewsItem[]> {
  const json: any[] = await fh("/news", { category: "general" });
  return json.slice(0, 30).map((n) => ({
    id: String(n.id ?? n.url),
    headline: n.headline,
    source: n.source,
    url: n.url,
    publishedAt: new Date(n.datetime * 1000).toISOString(),
    category: n.category ?? "general",
    summary: n.summary,
    provider: "finnhub",
  }));
}
