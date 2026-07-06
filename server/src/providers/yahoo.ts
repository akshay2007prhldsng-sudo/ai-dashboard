// Yahoo Finance provider — KEYLESS and free. Covers the whole watchlist,
// including index/commodity futures (NQ=F, ES=F, CL=F, GC=F) that the paid-tier
// quote APIs gate. Uses the public v8 chart endpoint: one call returns both the
// latest quote (from meta) and the candle series. Unofficial API — no SLA — so
// it sits first in the chain but the keyed providers remain as fallback.

import type { Instrument } from "../instruments.js";
import type { CandleSeries, Quote, QuoteProvider } from "./types.js";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

// Yahoo symbols contain characters that must NOT be percent-encoded the normal
// way: "=" in futures/FX (GC=F, EURUSD=X) must stay literal, while "^" in index
// tickers (^VIX) must become %5E. encodeURIComponent breaks the "=" → do it by hand.
function yahooPath(symbol: string): string {
  return symbol.replace(/\^/g, "%5E");
}

async function chart(symbol: string, interval: string, range: string): Promise<any> {
  let lastErr: Error | null = null;
  for (const host of HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${yahooPath(symbol)}?interval=${interval}&range=${range}`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } });
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error(json?.chart?.error?.description ?? "Yahoo: empty result");
      return result;
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr ?? new Error("Yahoo: request failed");
}

const RANGE: Record<string, { interval: string; range: string }> = {
  "5min": { interval: "5m", range: "5d" },
  "1h": { interval: "60m", range: "1mo" },
  "1day": { interval: "1d", range: "6mo" },
};

export const yahooProvider: QuoteProvider = {
  name: "yahoo",
  available: () => true, // no key required
  supports: (inst: Instrument) => Boolean(inst.yahoo),

  async getQuote(inst) {
    const r = await chart(inst.yahoo!, "5m", "1d");
    const m = r.meta ?? {};
    const price = Number(m.regularMarketPrice);
    const prev = Number(m.chartPreviousClose ?? m.previousClose);
    if (!Number.isFinite(price)) throw new Error(`Yahoo: no price for ${inst.id}`);
    return {
      id: inst.id,
      price,
      previousClose: Number.isFinite(prev) ? prev : undefined,
      change: Number.isFinite(prev) ? price - prev : 0,
      changePct: Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : 0,
      timestamp: Date.now(),
      provider: this.name,
    };
  },

  async getCandles(inst, interval, points) {
    const cfg = RANGE[interval];
    const r = await chart(inst.yahoo!, cfg.interval, cfg.range);
    const ts: number[] = r.timestamp ?? [];
    const q = r.indicators?.quote?.[0] ?? {};
    const candles = ts
      .map((t, i) => ({
        t: t * 1000,
        o: Number(q.open?.[i]),
        h: Number(q.high?.[i]),
        l: Number(q.low?.[i]),
        c: Number(q.close?.[i]),
      }))
      .filter((c) => Number.isFinite(c.c) && Number.isFinite(c.o));
    if (!candles.length) throw new Error(`Yahoo: no candles for ${inst.id}`);
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

export type { Quote };
