// Yahoo Finance provider — KEYLESS and free. Covers the whole watchlist,
// including index/commodity futures (NQ=F, ES=F, CL=F, GC=F) that the paid-tier
// quote APIs gate. Uses the public v8 chart endpoint: one call returns both the
// latest quote (from meta) and the candle series. Unofficial API — no SLA — so
// it sits first in the chain but the keyed providers remain as fallback.

import type { Instrument } from "../instruments.js";
import type { CandleSeries, Quote, QuoteProvider } from "./types.js";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

// Yahoo rate-limits bursts by IP. Serialise all requests with a minimum gap so
// a full dashboard/agent-cycle load never fires dozens of calls at once (which
// gets the IP throttled and makes even quotes fail). Caching + stale-serve in
// marketdata.ts means this spacing is only paid on cold fetches.
const MIN_GAP_MS = 250;
let gate: Promise<unknown> = Promise.resolve();
function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    return fn();
  };
  const next = gate.then(run, run);
  gate = next.catch(() => {});
  return next as Promise<T>;
}

// Yahoo symbols contain characters that must NOT be percent-encoded the normal
// way: "=" in futures/FX (GC=F, EURUSD=X) must stay literal, while "^" in index
// tickers (^VIX) must become %5E. encodeURIComponent breaks the "=" → do it by hand.
function yahooPath(symbol: string): string {
  return symbol.replace(/\^/g, "%5E");
}

function chart(symbol: string, interval: string, range: string): Promise<any> {
  return throttle(async () => {
    let lastErr: Error | null = null;
    for (const host of HOSTS) {
      try {
        const url = `${host}/v8/finance/chart/${yahooPath(symbol)}?interval=${interval}&range=${range}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
          signal: AbortSignal.timeout(8000),
        });
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
  });
}

// One request per timeframe, using ranges proven to work for all symbol types
// (5m/1d is the same call the quote uses, so it resolves for futures too).
const PLAN: Record<string, { interval: string; range: string }> = {
  "5min": { interval: "5m", range: "1d" },
  "1h": { interval: "60m", range: "5d" },
  "1day": { interval: "1d", range: "6mo" },
};

function parseCandles(r: any): { t: number; o: number; h: number; l: number; c: number }[] {
  const ts: number[] = r.timestamp ?? [];
  const q = r.indicators?.quote?.[0] ?? {};
  return ts
    .map((t, i) => ({
      t: t * 1000,
      o: Number(q.open?.[i]),
      h: Number(q.high?.[i]),
      l: Number(q.low?.[i]),
      c: Number(q.close?.[i]),
    }))
    .filter((c) => Number.isFinite(c.c) && Number.isFinite(c.o));
}

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
    const plan = PLAN[interval] ?? PLAN["1h"];
    const r = await chart(inst.yahoo!, plan.interval, plan.range);
    const candles = parseCandles(r);
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
