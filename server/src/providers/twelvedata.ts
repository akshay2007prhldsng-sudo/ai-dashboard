import { config } from "../config.js";
import type { Instrument } from "../instruments.js";
import type { CandleSeries, Quote, QuoteProvider } from "./types.js";

const BASE = "https://api.twelvedata.com";

async function td(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ ...params, apikey: config.twelveDataKey });
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`TwelveData HTTP ${res.status}`);
  const json = await res.json();
  if (json?.status === "error" || json?.code >= 400) {
    throw new Error(`TwelveData: ${json.message ?? "error"}`);
  }
  return json;
}

const INTERVAL_MAP: Record<string, string> = { "5min": "5min", "1h": "1h", "1day": "1day" };

export const twelveDataProvider: QuoteProvider = {
  name: "twelvedata",
  available: () => Boolean(config.twelveDataKey),
  supports: (inst: Instrument) => Boolean(inst.twelveData),

  async getQuote(inst) {
    const json = await td("/quote", { symbol: inst.twelveData! });
    const price = Number(json.close);
    const prev = Number(json.previous_close);
    if (!Number.isFinite(price)) throw new Error(`TwelveData: no price for ${inst.id}`);
    const quote: Quote = {
      id: inst.id,
      price,
      previousClose: Number.isFinite(prev) ? prev : undefined,
      change: Number(json.change) || (Number.isFinite(prev) ? price - prev : 0),
      changePct: Number(json.percent_change) || (Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : 0),
      timestamp: Date.now(),
      provider: this.name,
    };
    return quote;
  },

  async getCandles(inst, interval, points) {
    const json = await td("/time_series", {
      symbol: inst.twelveData!,
      interval: INTERVAL_MAP[interval],
      outputsize: String(points),
    });
    const values: any[] = json.values ?? [];
    if (!values.length) throw new Error(`TwelveData: no candles for ${inst.id}`);
    const candles = values
      .map((v) => ({
        t: new Date(v.datetime + (v.datetime.length <= 10 ? "T00:00:00Z" : "Z")).getTime(),
        o: Number(v.open),
        h: Number(v.high),
        l: Number(v.low),
        c: Number(v.close),
      }))
      .reverse();
    const series: CandleSeries = { id: inst.id, interval, candles, provider: this.name, timestamp: Date.now() };
    return series;
  },
};
