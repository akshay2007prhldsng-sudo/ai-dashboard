import { cached } from "../cache.js";
import { config } from "../config.js";
import { finnhubNews } from "./finnhub.js";
import type { NewsItem } from "./types.js";

async function marketauxNews(): Promise<NewsItem[]> {
  const qs = new URLSearchParams({
    api_token: config.marketauxKey,
    language: "en",
    filter_entities: "false",
    limit: "20",
  });
  const res = await fetch(`https://api.marketaux.com/v1/news/all?${qs}`);
  if (!res.ok) throw new Error(`Marketaux HTTP ${res.status}`);
  const json = await res.json();
  const data: any[] = json?.data ?? [];
  return data.map((n) => ({
    id: n.uuid,
    headline: n.title,
    source: n.source,
    url: n.url,
    publishedAt: n.published_at,
    category: (n.entities?.[0]?.type as string) ?? "general",
    summary: n.description,
    provider: "marketaux",
  }));
}

/** Live news feed: Finnhub primary, Marketaux fallback. Empty list => UI shows "data unavailable". */
export function getNews(): Promise<NewsItem[]> {
  return cached("news", 60_000, async () => {
    if (config.finnhubKey) {
      try {
        return await finnhubNews();
      } catch (err) {
        console.warn(`[news] finnhub failed: ${(err as Error).message}`);
      }
    }
    if (config.marketauxKey) {
      try {
        return await marketauxNews();
      } catch (err) {
        console.warn(`[news] marketaux failed: ${(err as Error).message}`);
      }
    }
    return [];
  });
}
