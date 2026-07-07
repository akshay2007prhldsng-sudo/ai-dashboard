import { cached } from "../cache.js";
import { config } from "../config.js";
import { mockNews } from "../demo.js";
import { fetchRssNews } from "./scrape/rss.js";
import type { NewsItem } from "./types.js";

/**
 * Live news feed, scraped keyless from public financial RSS feeds (MarketWatch,
 * CNBC, Investing, CoinDesk, Yahoo). No API key, no paid provider. Empty list =>
 * UI shows "data unavailable".
 */
export function getNews(): Promise<NewsItem[]> {
  if (config.demo) return Promise.resolve(mockNews());
  return cached("news", 5 * 60_000, async () => {
    try {
      return await fetchRssNews();
    } catch (err) {
      console.warn(`[news] rss scrape failed: ${(err as Error).message}`);
      return [];
    }
  });
}
