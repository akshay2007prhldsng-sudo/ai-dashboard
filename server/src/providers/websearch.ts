// Web-search-backed data sources: Claude retrieves live news and the economic
// calendar via its web_search tool, so these layers need no dedicated provider
// key (only ANTHROPIC_API_KEY). Numbers Claude reports come from real pages it
// fetches; we still label the provider "web-search" so the UI is honest about
// the source. Quotes/charts stay on the real market-data provider.

import { aiWebSearch } from "../ai/client.js";
import type { EconomicEvent, NewsItem } from "./types.js";

interface RawNews {
  headline: string;
  source: string;
  url: string;
  publishedAt?: string;
  minutesAgo?: number;
  category?: string;
  sentiment?: string;
}

export async function newsViaWebSearch(): Promise<NewsItem[]> {
  const items = await aiWebSearch<{ items: RawNews[] }>({
    cacheKey: "news:websearch",
    ttlMs: 5 * 60_000,
    prompt:
      "Search the web for the 10 most recent financial-market news headlines right now " +
      "(FX, indices, gold, crypto, oil, central banks). For each, give the exact headline, " +
      "the publishing source name, the article URL, how many minutes ago it was published " +
      "(minutesAgo, integer), a category (general/forex/crypto/commodities/economy), and a " +
      'sentiment (Bullish/Bearish/Neutral). Return JSON: {"items":[{headline,source,url,minutesAgo,category,sentiment}]}.',
  });
  if (!items?.items?.length) return [];
  const now = Date.now();
  return items.items.slice(0, 12).map((n, i) => ({
    id: `ws-news-${i}-${n.url ?? n.headline}`,
    headline: n.headline,
    source: n.source ?? "web",
    url: n.url ?? "",
    publishedAt: new Date(now - (Number(n.minutesAgo) || 0) * 60_000).toISOString(),
    category: n.category ?? "general",
    summary: n.sentiment ? `Sentiment: ${n.sentiment}` : undefined,
    provider: "web-search",
  }));
}

interface RawEvent {
  title: string;
  currency: string;
  country?: string;
  time: string; // ISO or HH:MM
  impact?: string;
  actual?: number | string | null;
  forecast?: number | string | null;
  previous?: number | string | null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[%,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normImpact(v: unknown): EconomicEvent["impact"] {
  const s = String(v).toLowerCase();
  if (s.startsWith("h") || s === "3") return "High";
  if (s.startsWith("m") || s === "2") return "Medium";
  return "Low";
}

export async function calendarViaWebSearch(from: string, to: string): Promise<EconomicEvent[]> {
  const items = await aiWebSearch<{ events: RawEvent[] }>({
    cacheKey: `calendar:websearch:${from}:${to}`,
    ttlMs: 30 * 60_000,
    maxTokens: 4000,
    prompt:
      `Search a reputable economic calendar (e.g. Forex Factory, Investing.com, Trading Economics) ` +
      `for scheduled macroeconomic events between ${from} and ${to} (UTC). List up to 25 events. ` +
      `For each give: title, currency (EUR/USD/GBP/JPY/AUD/CAD/CHF/CNY), country, time as a full ISO ` +
      `8601 UTC timestamp, impact (High/Medium/Low), and actual/forecast/previous values where published ` +
      `(numbers only, null if not yet released). Only include events you actually find on a real calendar page. ` +
      `Return JSON: {"events":[{title,currency,country,time,impact,actual,forecast,previous}]}.`,
  });
  if (!items?.events?.length) return [];
  return items.events
    .filter((e) => e.title && e.time)
    .map((e, i) => {
      const date = e.time.includes("T") ? e.time : `${from}T${e.time}:00Z`;
      return {
        id: `ws-evt-${i}-${e.title}`,
        title: e.title,
        country: e.country ?? "",
        currency: (e.currency ?? "").toUpperCase(),
        date: new Date(date).toISOString(),
        impact: normImpact(e.impact),
        actual: num(e.actual),
        forecast: num(e.forecast),
        previous: num(e.previous),
        provider: "web-search",
      };
    });
}
