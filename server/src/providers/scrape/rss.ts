// Keyless news via public RSS feeds. No API key, no paid provider — just fetch
// the XML feeds financial sites publish for readers, parse them, and dedupe.
// Runs server-side inside the 15-min agent cycle (cached), so we stay polite.

import type { NewsItem } from "../types.js";

const FEEDS: { url: string; category: string }[] = [
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", category: "markets" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", category: "markets" },
  { url: "https://www.investing.com/rss/news_25.rss", category: "markets" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "crypto" },
  { url: "https://finance.yahoo.com/news/rssindex", category: "markets" },
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function pick(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : null;
}

function pickLink(block: string): string | null {
  const inline = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (inline && inline[1].trim()) return decode(inline[1]);
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return href ? href[1] : null;
}

async function fetchFeed(url: string, category: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; APfxHybridDash/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const host = new URL(url).hostname.replace(/^www\./, "");
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  return blocks
    .map((b, i) => {
      const headline = pick(b, "title") ?? "";
      const link = pickLink(b) ?? "";
      const pub = pick(b, "pubDate") ?? pick(b, "published") ?? pick(b, "updated");
      const t = pub ? Date.parse(pub) : NaN;
      return {
        id: `${host}-${i}-${link || headline}`,
        headline,
        source: host,
        url: link,
        publishedAt: Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString(),
        category,
        provider: "rss",
      } satisfies NewsItem;
    })
    .filter((n) => n.headline);
}

/** Fetch all feeds, tolerate individual failures, dedupe by title, newest first. */
export async function fetchRssNews(): Promise<NewsItem[]> {
  const settled = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f.url, f.category)));
  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  all.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const n of all) {
    const key = n.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out.slice(0, 30);
}
