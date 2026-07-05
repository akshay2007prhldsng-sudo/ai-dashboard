// Derived metrics computed from real quotes/candles. These are labelled
// "computed" in the API responses so the UI can distinguish them from raw
// provider data.

import { STRENGTH_CURRENCIES, STRENGTH_PAIRS } from "../instruments.js";
import { getCandles, getQuotes } from "../providers/marketdata.js";

const CAPITAL_FLOW_IDS = [
  "US100", "SPX", "XAUUSD", "BTCUSD", "USOIL", "EURUSD", "GBPUSD",
  "DXY", "US10Y", "VIX",
];

export interface FlowRow {
  id: string;
  changePct: number | null;
}

/** Capital flow = today's % change per asset, computed from live quotes. */
export async function capitalFlow(): Promise<{ computed: true; rows: FlowRow[]; timestamp: number }> {
  const quotes = await getQuotes(CAPITAL_FLOW_IDS);
  const rows = CAPITAL_FLOW_IDS.map((id) => ({
    id,
    changePct: quotes[id] ? Number(quotes[id]!.changePct.toFixed(2)) : null,
  })).sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
  return { computed: true, rows, timestamp: Date.now() };
}

export interface StrengthPoint {
  t: number;
  [currency: string]: number;
}

/**
 * Currency strength: for each currency, average the normalised intraday %
 * move of every pair it appears in (inverted when it's the quote currency).
 * Computed from real 1h candles of the 6 USD-cross pairs.
 */
export async function currencyStrength(): Promise<{
  computed: true;
  currencies: string[];
  points: StrengthPoint[];
  timestamp: number;
} | null> {
  const seriesList = await Promise.all(
    STRENGTH_PAIRS.map(async (p) => ({ pair: p, series: await getCandles(p.id, "1h", 24) }))
  );
  const usable = seriesList.filter((s) => s.series && s.series.candles.length >= 4);
  if (!usable.length) return null;

  // Align on the shortest series length.
  const len = Math.min(...usable.map((s) => s.series!.candles.length));
  const points: StrengthPoint[] = [];
  for (let i = 0; i < len; i++) {
    const t = usable[0].series!.candles[usable[0].series!.candles.length - len + i].t;
    const contrib: Record<string, { sum: number; n: number }> = {};
    for (const cur of STRENGTH_CURRENCIES) contrib[cur] = { sum: 0, n: 0 };
    for (const { pair, series } of usable) {
      const candles = series!.candles.slice(-len);
      const base0 = candles[0].c;
      const pct = ((candles[i].c - base0) / base0) * 100;
      contrib[pair.base].sum += pct;
      contrib[pair.base].n += 1;
      contrib[pair.quote].sum -= pct;
      contrib[pair.quote].n += 1;
    }
    const point: StrengthPoint = { t };
    for (const cur of STRENGTH_CURRENCIES) {
      point[cur] = contrib[cur].n ? Number((contrib[cur].sum / contrib[cur].n).toFixed(3)) : 0;
    }
    points.push(point);
  }
  return { computed: true, currencies: [...STRENGTH_CURRENCIES], points, timestamp: Date.now() };
}

/** Relative strength basket (US100, DXY, US10Y, VIX) — normalised intraday closes. */
export async function relativeStrength(): Promise<{
  computed: true;
  series: { id: string; points: { t: number; v: number }[] }[];
  timestamp: number;
}> {
  const ids = ["US100", "DXY", "US10Y", "VIX"];
  const all = await Promise.all(ids.map(async (id) => ({ id, s: await getCandles(id, "1h", 24) })));
  const series = all
    .filter((x) => x.s && x.s.candles.length >= 2)
    .map(({ id, s }) => {
      const base = s!.candles[0].c;
      return {
        id,
        points: s!.candles.map((c) => ({ t: c.t, v: Number((((c.c - base) / base) * 100).toFixed(3)) })),
      };
    });
  return { computed: true, series, timestamp: Date.now() };
}

/** Simple technical snapshot for an instrument, used to ground AI prompts. */
export async function technicalSnapshot(id: string) {
  const daily = await getCandles(id, "1day", 30);
  const hourly = await getCandles(id, "1h", 48);
  if (!daily && !hourly) return null;

  const closes = (hourly ?? daily)!.candles.map((c) => c.c);
  const last = closes[closes.length - 1];
  const sma20 = avg(closes.slice(-20));
  const ranges = (hourly ?? daily)!.candles.slice(-14).map((c) => c.h - c.l);
  const atr = avg(ranges);
  const dayCandles = daily?.candles ?? [];
  const change5d = dayCandles.length >= 6
    ? ((dayCandles[dayCandles.length - 1].c - dayCandles[dayCandles.length - 6].c) / dayCandles[dayCandles.length - 6].c) * 100
    : null;

  return {
    lastPrice: last,
    sma20: Number(sma20.toFixed(5)),
    aboveSma20: last > sma20,
    atr14: Number(atr.toFixed(5)),
    atrPctOfPrice: Number(((atr / last) * 100).toFixed(3)),
    change5dPct: change5d !== null ? Number(change5d.toFixed(2)) : null,
    hi30: Math.max(...closes),
    lo30: Math.min(...closes),
  };
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
