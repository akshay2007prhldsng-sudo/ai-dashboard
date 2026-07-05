// Pair Analysis Agent — runs per market every cycle. It does NOT do web research;
// it interprets the cached macro_context together with the latest REAL price and
// technicals from the market-data provider. The AI never generates prices.

import { aiJson } from "../ai/client.js";
import { instrumentById } from "../instruments.js";
import { technicalSnapshot } from "../lib/derived.js";
import { getQuote } from "../providers/marketdata.js";
import type { MacroContext, PairAnalysis } from "./store.js";

const PAIR_SCHEMA = {
  type: "object",
  properties: {
    bias: { type: "string", enum: ["Bullish", "Bearish", "Neutral"] },
    confidence: { type: "integer" },
    analysis: { type: "string" },
    overview: { type: "string" },
    edge: {
      type: "object",
      properties: { score: { type: "integer" }, label: { type: "string" }, explanation: { type: "string" } },
      required: ["score", "label", "explanation"],
      additionalProperties: false,
    },
    mood: {
      type: "object",
      properties: { riskScore: { type: "integer" }, positioning: { type: "string" } },
      required: ["riskScore", "positioning"],
      additionalProperties: false,
    },
    policy: {
      type: "object",
      properties: { stance: { type: "string", enum: ["Hawkish", "Neutral", "Dovish"] }, outlook: { type: "string" } },
      required: ["stance", "outlook"],
      additionalProperties: false,
    },
    flow: {
      type: "object",
      properties: { level: { type: "string", enum: ["Thin", "Healthy", "Crowded"] }, bullets: { type: "array", items: { type: "string" } } },
      required: ["level", "bullets"],
      additionalProperties: false,
    },
    bearing: {
      type: "object",
      properties: { label: { type: "string" }, bullets: { type: "array", items: { type: "string" } } },
      required: ["label", "bullets"],
      additionalProperties: false,
    },
    pulse: {
      type: "object",
      properties: { level: { type: "string", enum: ["Quiet", "Tradable", "Wild"] }, bullets: { type: "array", items: { type: "string" } } },
      required: ["level", "bullets"],
      additionalProperties: false,
    },
    drivers: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    tradingNarrative: { type: "string" },
    invalidationLevel: { type: "string" },
  },
  required: [
    "bias", "confidence", "analysis", "overview", "edge", "mood", "policy",
    "flow", "bearing", "pulse", "drivers", "risks", "tradingNarrative", "invalidationLevel",
  ],
  additionalProperties: false,
};

export async function runPairAgent(id: string, macro: MacroContext | null): Promise<PairAnalysis | null> {
  const inst = instrumentById.get(id);
  if (!inst) return null;
  const [quote, tech] = await Promise.all([getQuote(id), technicalSnapshot(id)]);
  // No real data to interpret → don't fabricate; leave the pair blank this cycle.
  if (!quote && !tech) return null;

  const input = {
    instrument: { id: inst.id, name: inst.name, category: inst.category },
    price: quote ? { price: quote.price, changePct: quote.changePct } : null,
    technicals: tech,
    macroContext: macro
      ? {
          summary: macro.summary,
          usdStrength: macro.usdStrength,
          riskSentiment: macro.riskSentiment,
          yields: macro.yields,
          centralBanks: macro.centralBanks,
        }
      : null,
  };

  const result = await aiJson<Omit<PairAnalysis, "instrument" | "price" | "changePct" | "timestamp">>({
    cacheKey: `agent:pair:${id}`,
    ttlMs: 0,
    noCache: true,
    maxTokens: 2500,
    prompt:
      `You are the pair-analysis agent for ${inst.name} (${id}), an intraday trader's terminal. ` +
      `INTERPRET the data below — do NOT invent any prices or numbers; use only what is given. ` +
      `Combine the shared macro_context with this pair's live price and technicals:\n${JSON.stringify(input, null, 2)}\n\n` +
      `Produce the full analysis payload: bias + confidence (0-100) + a 2-3 sentence analysis; an ai overview; ` +
      `an edge factor (score 0-100 for how much macro and technicals AGREE on a tradable direction, a label, and an ` +
      `explanation ending in concrete risk advice); market mood (riskScore 0-100) with positioning; policy stance + outlook; ` +
      `flow (Thin/Healthy/Crowded) + bullets; bearing (e.g. "Choppy Down") + bullets; pulse (Quiet/Tradable/Wild, from ATR) + bullets; ` +
      `key drivers; risks; a trading_narrative (what a disciplined trader should watch for / how to engage); and an ` +
      `invalidation_level described in words relative to the given price/levels (never a made-up exact number unless it follows from the data).`,
    schema: PAIR_SCHEMA,
  });
  if (!result) return null;

  return {
    ...result,
    instrument: id,
    price: quote ? quote.price : null,
    changePct: quote ? quote.changePct : null,
    timestamp: Date.now(),
  };
}
