// Single data source: Yahoo Finance scraping (keyless). No API keys anywhere.
// If Yahoo can't serve a symbol, callers receive null and the UI shows
// "data unavailable" — never fabricated prices. Stale values are served when a
// refresh fails so panels don't flicker empty on a transient throttle.

import { cacheGetFresh, cacheGetStale, cacheSet } from "../cache.js";
import { symbolById, type Instrument } from "../instruments.js";
import type { CandleSeries, Quote } from "./types.js";
import { yahooProvider } from "./yahoo.js";

const QUOTE_TTL = 60_000; // 60s cache per quote
const CANDLE_TTL = 120_000;

const qKey = (id: string) => `quote:${id}`;

export async function getQuote(id: string): Promise<Quote | null> {
  const inst = symbolById.get(id);
  if (!inst || !yahooProvider.supports(inst)) return null;
  const fresh = cacheGetFresh<Quote>(qKey(id));
  if (fresh) return fresh;
  try {
    const quote = await yahooProvider.getQuote(inst);
    cacheSet(qKey(id), QUOTE_TTL, quote);
    return quote;
  } catch (err) {
    console.warn(`[quote] yahoo failed for ${id}: ${(err as Error).message}`);
  }
  // Stale-while-error: keep showing the last known price instead of "unavailable".
  const stale = cacheGetStale<Quote>(qKey(id));
  if (stale) return stale;
  return null;
}

export async function getQuotes(ids: string[]): Promise<Record<string, Quote | null>> {
  // The Yahoo provider serialises requests internally (throttle), so a plain
  // Promise.all here is safe — uncached symbols queue up with a polite gap.
  const entries = await Promise.all(ids.map(async (id) => [id, await getQuote(id)] as const));
  return Object.fromEntries(entries);
}

export async function getCandles(
  id: string,
  interval: "5min" | "1h" | "1day",
  points: number
): Promise<CandleSeries | null> {
  const inst = symbolById.get(id);
  if (!inst || !yahooProvider.supports(inst)) return null;
  const key = `candles:${id}:${interval}:${points}`;
  const fresh = cacheGetFresh<CandleSeries>(key);
  if (fresh) return fresh;
  try {
    const series = await yahooProvider.getCandles(inst, interval, points);
    cacheSet(key, CANDLE_TTL, series);
    return series;
  } catch (err) {
    console.warn(`[candles] yahoo failed for ${id}: ${(err as Error).message}`);
  }
  const stale = cacheGetStale<CandleSeries>(key);
  if (stale) return stale;
  return null;
}

export type { Instrument };
