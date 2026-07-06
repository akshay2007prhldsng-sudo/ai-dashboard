// Global Macro Agent — interprets the SCRAPED data (RSS news + ForexFactory
// calendar) together with real Yahoo reference quotes. No web-search tool, no
// paid API: the raw data is scraped keyless first, then the LLM structures the
// macro_context. News + calendar in the output are the REAL scraped items; the
// AI only adds interpretation (usd strength, sentiment, briefing, summary).

import { aiJson } from "../ai/client.js";
import { getCalendar } from "../providers/calendar.js";
import { getQuote } from "../providers/marketdata.js";
import { getNews } from "../providers/news.js";
import type { MacroContext } from "./store.js";

type MacroInterpretation = Pick<
  MacroContext,
  "usdStrength" | "riskSentiment" | "yields" | "centralBanks" | "briefing" | "summary"
>;

const SCHEMA = {
  type: "object",
  properties: {
    usdStrength: {
      type: "object",
      properties: { direction: { type: "string" }, note: { type: "string" } },
      required: ["direction", "note"],
      additionalProperties: false,
    },
    riskSentiment: {
      type: "object",
      properties: { state: { type: "string", enum: ["Risk-On", "Risk-Off", "Neutral"] }, note: { type: "string" } },
      required: ["state", "note"],
      additionalProperties: false,
    },
    yields: {
      type: "object",
      properties: { us10y: { type: "string" }, direction: { type: "string" } },
      required: ["us10y", "direction"],
      additionalProperties: false,
    },
    centralBanks: { type: "array", items: { type: "string" } },
    briefing: {
      type: "object",
      properties: {
        headline: { type: "string" },
        paragraphs: { type: "array", items: { type: "string" } },
        moods: { type: "array", items: { type: "string" } },
      },
      required: ["headline", "paragraphs", "moods"],
      additionalProperties: false,
    },
    summary: { type: "string" },
  },
  required: ["usdStrength", "riskSentiment", "yields", "centralBanks", "briefing", "summary"],
  additionalProperties: false,
};

export async function runMacroAgent(): Promise<MacroContext | null> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [dxy, tnx, vix, news, calendar] = await Promise.all([
    getQuote("DXY"),
    getQuote("US10Y"),
    getQuote("VIX"),
    getNews(),
    getCalendar(today, tomorrow),
  ]);

  const now = Date.now();
  const majorNews = news.slice(0, 15).map((n) => ({
    headline: n.headline,
    source: n.source,
    url: n.url,
    minutesAgo: Math.max(0, Math.round((now - Date.parse(n.publishedAt)) / 60_000)),
  }));
  const calendarHighlights = calendar
    .filter((e) => e.impact !== "Low")
    .slice(0, 20)
    .map((e) => ({ time: e.date, currency: e.currency, event: e.title, impact: e.impact }));

  const grounding = {
    DXY: dxy ? { price: dxy.price, changePct: dxy.changePct } : "unavailable",
    US10Y: tnx ? { price: tnx.price, changePct: tnx.changePct } : "unavailable",
    VIX: vix ? { price: vix.price, changePct: vix.changePct } : "unavailable",
    asOf: new Date().toISOString(),
  };

  const result = await aiJson<MacroInterpretation>({
    cacheKey: "agent:macro",
    ttlMs: 0,
    noCache: true,
    maxTokens: 4000,
    prompt:
      `You are the Global Macro Desk for an intraday trader (London/NY). Interpret ONLY the scraped data below — ` +
      `do not invent numbers or events. Reference quotes:\n${JSON.stringify(grounding, null, 2)}\n\n` +
      `Scraped headlines (real, from RSS):\n${JSON.stringify(news.slice(0, 15).map((n) => ({ headline: n.headline, source: n.source })), null, 2)}\n\n` +
      `Scraped economic calendar (ForexFactory, today/tomorrow):\n${JSON.stringify(calendarHighlights, null, 2)}\n\n` +
      `Produce: usdStrength {direction, note}; riskSentiment {state Risk-On/Risk-Off/Neutral, note}; ` +
      `yields {us10y level, direction}; centralBanks (key points as short strings); ` +
      `briefing {headline, 2-3 short paragraphs, 1-3 mood tags}; and summary (one tight paragraph fed to every pair agent).`,
    schema: SCHEMA,
  });
  if (!result) return null;

  return { ...result, majorNews, calendarHighlights, timestamp: Date.now() };
}
