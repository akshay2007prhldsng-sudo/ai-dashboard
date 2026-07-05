// Global Macro Agent — the ONLY agent that does web research, once per cycle.
// It builds the macro_context that every pair agent then reuses (no per-pair
// web search). Grounded with real DXY / US10Y / VIX quotes where available.

import { aiWebSearch } from "../ai/client.js";
import { getQuote } from "../providers/marketdata.js";
import type { MacroContext } from "./store.js";

export async function runMacroAgent(): Promise<MacroContext | null> {
  // Ground the research with the real numbers we can fetch cheaply.
  const [dxy, tnx, vix] = await Promise.all([
    getQuote("DXY"),
    getQuote("US10Y"),
    getQuote("VIX"),
  ]);
  const grounding = {
    DXY: dxy ? { price: dxy.price, changePct: dxy.changePct } : "unavailable",
    US10Y: tnx ? { price: tnx.price, changePct: tnx.changePct } : "unavailable",
    VIX: vix ? { price: vix.price, changePct: vix.changePct } : "unavailable",
    asOf: new Date().toISOString(),
  };

  const result = await aiWebSearch<MacroContext>({
    cacheKey: "agent:macro",
    ttlMs: 0,
    noCache: true, // always fresh per scheduled cycle
    maxUses: 6,
    maxTokens: 5000,
    prompt:
      `You are the Global Macro Desk for an intraday trader (London/NY sessions). ` +
      `Do ONE focused round of web research on the CURRENT global macro picture and return structured JSON. ` +
      `Real reference numbers already fetched (do not contradict these; use them):\n${JSON.stringify(grounding, null, 2)}\n\n` +
      `Research and summarise:\n` +
      `- USD strength (DXY) — direction + short note\n` +
      `- risk sentiment — Risk-On / Risk-Off / Neutral + note\n` +
      `- US bond yields (US10Y) — level/direction note\n` +
      `- central bank updates (Fed/ECB/BoE etc.) — key points as short strings\n` +
      `- major market-moving news right now — headline, source name, article URL, sentiment, minutesAgo\n` +
      `- economic calendar highlights for today/tomorrow — time (ISO or HH:MM UTC), currency, event, impact\n` +
      `- a pre-session briefing: a punchy headline, 2-3 short paragraphs, and 1-3 mood tags\n` +
      `- summary: one tight paragraph capturing the macro backdrop (this is fed to every pair agent)\n\n` +
      `Return JSON exactly matching this TypeScript shape (no extra prose):\n` +
      `{ usdStrength:{direction,note}, riskSentiment:{state,note}, yields:{us10y,direction}, ` +
      `centralBanks:string[], majorNews:[{headline,source,url,sentiment,minutesAgo}], ` +
      `calendarHighlights:[{time,currency,event,impact}], briefing:{headline,paragraphs:string[],moods:string[]}, summary }`,
  });
  if (!result) return null;
  return { ...result, timestamp: Date.now() };
}
