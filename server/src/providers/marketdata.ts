// Provider chain: Twelve Data -> Finnhub -> FMP. Each call tries providers in
// order; if none can serve a symbol, callers receive null and the UI shows
// "data unavailable" — never fabricated prices.

import { cached } from "../cache.js";
import { symbolById, type Instrument } from "../instruments.js";
import { finnhubProvider } from "./finnhub.js";
import { fmpProvider } from "./fmp.js";
import { twelveDataProvider } from "./twelvedata.js";
import type { CandleSeries, Quote, QuoteProvider } from "./types.js";

const CHAIN: QuoteProvider[] = [twelveDataProvider, finnhubProvider, fmpProvider];

const QUOTE_TTL = 45_000; // 45s cache per quote
const CANDLE_TTL = 120_000;

export async function getQuote(id: string): Promise<Quote | null> {
  const inst = symbolById.get(id);
  if (!inst) return null;
  return cached(`quote:${id}`, QUOTE_TTL, async () => {
    for (const p of CHAIN) {
      if (!p.available() || !p.supports(inst)) continue;
      try {
        return await p.getQuote(inst);
      } catch (err) {
        console.warn(`[quote] ${p.name} failed for ${id}: ${(err as Error).message}`);
      }
    }
    console.warn(`[quote] no provider could serve ${id}`);
    return null;
  });
}

export async function getQuotes(ids: string[]): Promise<Record<string, Quote | null>> {
  const entries = await Promise.all(ids.map(async (id) => [id, await getQuote(id)] as const));
  return Object.fromEntries(entries);
}

export async function getCandles(
  id: string,
  interval: "5min" | "1h" | "1day",
  points: number
): Promise<CandleSeries | null> {
  const inst = symbolById.get(id);
  if (!inst) return null;
  return cached(`candles:${id}:${interval}:${points}`, CANDLE_TTL, async () => {
    for (const p of CHAIN) {
      if (!p.available() || !p.supports(inst)) continue;
      try {
        return await p.getCandles(inst, interval, points);
      } catch (err) {
        console.warn(`[candles] ${p.name} failed for ${id}: ${(err as Error).message}`);
      }
    }
    console.warn(`[candles] no provider could serve ${id}`);
    return null;
  });
}

export function anyProviderConfigured(): boolean {
  return CHAIN.some((p) => p.available());
}

export type { Instrument };
