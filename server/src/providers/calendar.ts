import { aiAvailable } from "../ai/client.js";
import { cached } from "../cache.js";
import { config } from "../config.js";
import { fmpCalendar } from "./fmp.js";
import type { EconomicEvent } from "./types.js";
import { calendarViaWebSearch } from "./websearch.js";

const BASE = "https://finnhub.io/api/v1";

async function finnhubCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  const qs = new URLSearchParams({ from, to, token: config.finnhubKey });
  const res = await fetch(`${BASE}/calendar/economic?${qs}`);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const json = await res.json();
  const events: any[] = json?.economicCalendar ?? [];
  if (!events.length) throw new Error("Finnhub: calendar empty/unavailable");
  const impactMap: Record<string, EconomicEvent["impact"]> = {
    high: "High", medium: "Medium", low: "Low", "3": "High", "2": "Medium", "1": "Low",
  };
  return events.map((e, i) => ({
    id: `${e.event}-${e.time}-${i}`,
    title: e.event,
    country: e.country ?? "",
    currency: e.currency ?? "",
    date: new Date(e.time).toISOString(),
    impact: impactMap[String(e.impact).toLowerCase()] ?? "Low",
    actual: numOrNull(e.actual),
    forecast: numOrNull(e.estimate),
    previous: numOrNull(e.prev),
    provider: "finnhub",
  }));
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Economic calendar. A dedicated provider key (FMP/Finnhub) wins when present;
 * otherwise Claude's web-search tool retrieves the calendar live (hybrid mode —
 * no calendar-provider key needed, only ANTHROPIC_API_KEY). Empty => "data unavailable".
 */
export function getCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  return cached(`calendar:${from}:${to}`, 10 * 60_000, async () => {
    if (config.fmpKey) {
      try {
        return await fmpCalendar(from, to);
      } catch (err) {
        console.warn(`[calendar] fmp failed: ${(err as Error).message}`);
      }
    }
    if (config.finnhubKey) {
      try {
        return await finnhubCalendar(from, to);
      } catch (err) {
        console.warn(`[calendar] finnhub failed: ${(err as Error).message}`);
      }
    }
    if (aiAvailable()) {
      try {
        return await calendarViaWebSearch(from, to);
      } catch (err) {
        console.warn(`[calendar] web-search failed: ${(err as Error).message}`);
      }
    }
    return [];
  });
}
