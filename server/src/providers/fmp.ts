import { config } from "../config.js";
import type { Instrument } from "../instruments.js";
import type { CandleSeries, EconomicEvent, Quote, QuoteProvider } from "./types.js";

const BASE = "https://financialmodelingprep.com/api/v3";

async function fmp(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({ ...params, apikey: config.fmpKey });
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
  const json = await res.json();
  if (json?.["Error Message"]) throw new Error(`FMP: ${json["Error Message"]}`);
  return json;
}

export const fmpProvider: QuoteProvider = {
  name: "fmp",
  available: () => Boolean(config.fmpKey),
  supports: (inst: Instrument) => Boolean(inst.fmp),

  async getQuote(inst) {
    const json: any[] = await fmp(`/quote/${encodeURIComponent(inst.fmp!)}`);
    const q = json?.[0];
    const price = Number(q?.price);
    if (!Number.isFinite(price)) throw new Error(`FMP: no price for ${inst.id}`);
    const quote: Quote = {
      id: inst.id,
      price,
      previousClose: Number(q.previousClose) || undefined,
      change: Number(q.change) || 0,
      changePct: Number(q.changesPercentage) || 0,
      timestamp: Date.now(),
      provider: this.name,
    };
    return quote;
  },

  async getCandles(inst, interval, points) {
    const sym = encodeURIComponent(inst.fmp!);
    let candles;
    if (interval === "1day") {
      const json = await fmp(`/historical-price-full/${sym}`, { timeseries: String(points) });
      const hist: any[] = json?.historical ?? [];
      if (!hist.length) throw new Error(`FMP: no candles for ${inst.id}`);
      candles = hist
        .map((v) => ({ t: new Date(v.date).getTime(), o: v.open, h: v.high, l: v.low, c: v.close }))
        .reverse();
    } else {
      const fmpInterval = interval === "5min" ? "5min" : "1hour";
      const json: any[] = await fmp(`/historical-chart/${fmpInterval}/${sym}`);
      if (!Array.isArray(json) || !json.length) throw new Error(`FMP: no candles for ${inst.id}`);
      candles = json
        .slice(0, points)
        .map((v) => ({ t: new Date(v.date).getTime(), o: v.open, h: v.high, l: v.low, c: v.close }))
        .reverse();
    }
    const series: CandleSeries = { id: inst.id, interval, candles, provider: this.name, timestamp: Date.now() };
    return series;
  },
};

/** Economic calendar via FMP. from/to as YYYY-MM-DD. */
export async function fmpCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  const json: any[] = await fmp("/economic_calendar", { from, to });
  if (!Array.isArray(json)) throw new Error("FMP: calendar unavailable");
  const impactMap: Record<string, EconomicEvent["impact"]> = { High: "High", Medium: "Medium", Low: "Low" };
  return json.map((e, i) => ({
    id: `${e.event}-${e.date}-${i}`,
    title: e.event,
    country: e.country ?? "",
    currency: e.currency ?? countryToCurrency(e.country),
    date: new Date(e.date).toISOString(),
    impact: impactMap[e.impact] ?? "Low",
    actual: numOrNull(e.actual),
    forecast: numOrNull(e.estimate ?? e.forecast),
    previous: numOrNull(e.previous),
    provider: "fmp",
  }));
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function countryToCurrency(country?: string): string {
  const map: Record<string, string> = {
    US: "USD", GB: "GBP", UK: "GBP", EU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR",
    JP: "JPY", AU: "AUD", CA: "CAD", CH: "CHF", CN: "CNY", NZ: "NZD",
  };
  return map[country ?? ""] ?? "";
}
