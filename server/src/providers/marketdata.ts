// Provider chain: Twelve Data -> Finnhub -> FMP. Each call tries providers in
// order; if none can serve a symbol, callers receive null and the UI shows
// "data unavailable" — never fabricated prices.

import { cacheGetFresh, cacheGetStale, cacheSet } from "../cache.js";
import { symbolById, type Instrument } from "../instruments.js";
import { finnhubProvider } from "./finnhub.js";
import { fmpProvider } from "./fmp.js";
import { twelveDataProvider } from "./twelvedata.js";
import type { CandleSeries, Quote, QuoteProvider } from "./types.js";
import { yahooProvider } from "./yahoo.js";

// Yahoo first: keyless and covers the full watchlist (incl. index/commodity
// futures). Keyed providers stay as fallback if Yahoo is unreachable.
const CHAIN: QuoteProvider[] = [yahooProvider, twelveDataProvider, finnhubProvider, fmpProvider];

const QUOTE_TTL = 60_000; // 60s cache per quote
const CANDLE_TTL = 120_000;

const qKey = (id: string) => `quote:${id}`;

export async function getQuote(id: string): Promise<Quote | null> {
  const inst = symbolById.get(id);
  if (!inst) return null;
  const fresh = cacheGetFresh<Quote>(qKey(id));
  if (fresh) return fresh;
  for (const p of CHAIN) {
    if (!p.available() || !p.supports(inst)) continue;
    try {
      const quote = await p.getQuote(inst);
      cacheSet(qKey(id), QUOTE_TTL, quote);
      return quote;
    } catch (err) {
      console.warn(`[quote] ${p.name} failed for ${id}: ${(err as Error).message}`);
    }
  }
  // Stale-while-error: keep showing the last known price instead of "unavailable".
  const stale = cacheGetStale<Quote>(qKey(id));
  if (stale) return stale;
  console.warn(`[quote] no provider could serve ${id}`);
  return null;
}

/**
 * Fetch many quotes efficiently. Uncached symbols are pulled from the primary
 * provider in ONE batched request where supported (crucial for free tiers that
 * cap requests/min), then any leftovers fall back to the per-symbol chain.
 */
export async function getQuotes(ids: string[]): Promise<Record<string, Quote | null>> {
  const result: Record<string, Quote | null> = {};
  const missing: string[] = [];
  for (const id of ids) {
    const fresh = cacheGetFresh<Quote>(qKey(id));
    if (fresh) result[id] = fresh;
    else missing.push(id);
  }

  for (const p of CHAIN) {
    if (!p.getQuotesBatch || !p.available()) continue;
    const insts = missing
      .filter((id) => !result[id])
      .map((id) => symbolById.get(id))
      .filter((i): i is Instrument => Boolean(i && p.supports(i)));
    if (!insts.length) continue;
    try {
      const batch = await p.getQuotesBatch(insts);
      for (const [id, q] of Object.entries(batch)) {
        cacheSet(qKey(id), QUOTE_TTL, q);
        result[id] = q;
      }
    } catch (err) {
      console.warn(`[quotes] ${p.name} batch failed: ${(err as Error).message}`);
    }
  }

  // Anything still missing (unsupported by batch providers, or batch failed):
  // per-symbol chain, which also handles stale-serve.
  await Promise.all(
    missing
      .filter((id) => !result[id])
      .map(async (id) => {
        result[id] = await getQuote(id);
      })
  );
  return result;
}

export async function getCandles(
  id: string,
  interval: "5min" | "1h" | "1day",
  points: number
): Promise<CandleSeries | null> {
  const inst = symbolById.get(id);
  if (!inst) return null;
  const key = `candles:${id}:${interval}:${points}`;
  const fresh = cacheGetFresh<CandleSeries>(key);
  if (fresh) return fresh;
  for (const p of CHAIN) {
    if (!p.available() || !p.supports(inst)) continue;
    try {
      const series = await p.getCandles(inst, interval, points);
      cacheSet(key, CANDLE_TTL, series);
      return series;
    } catch (err) {
      console.warn(`[candles] ${p.name} failed for ${id}: ${(err as Error).message}`);
    }
  }
  const stale = cacheGetStale<CandleSeries>(key);
  if (stale) return stale;
  console.warn(`[candles] no provider could serve ${id}`);
  return null;
}

export function anyProviderConfigured(): boolean {
  return CHAIN.some((p) => p.available());
}

export type { Instrument };
