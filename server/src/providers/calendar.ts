import { cached } from "../cache.js";
import { fetchFFCalendar } from "./scrape/forexfactory.js";
import type { EconomicEvent } from "./types.js";

/**
 * Economic calendar, scraped keyless from ForexFactory's public weekly JSON
 * feed. No API key. Empty => "data unavailable" in the UI.
 */
export function getCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  return cached(`calendar:${from}:${to}`, 30 * 60_000, async () => {
    try {
      return await fetchFFCalendar(from, to);
    } catch (err) {
      console.warn(`[calendar] forexfactory scrape failed: ${(err as Error).message}`);
      return [];
    }
  });
}
