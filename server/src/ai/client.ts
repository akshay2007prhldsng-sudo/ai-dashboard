import Anthropic from "@anthropic-ai/sdk";
import { cached } from "../cache.js";
import { config } from "../config.js";

const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

export function aiAvailable(): boolean {
  return client !== null;
}

// Last AI failure, surfaced in the diagnostics strip so a broken/expired key or
// quota problem is visible in the UI instead of silently empty panels.
let lastError: string | null = null;
export function aiLastError(): string | null {
  return lastError;
}

const DISCLAIMER =
  "You are the AI analysis layer of a personal trading dashboard. You interpret ONLY the real scraped market data provided in the prompt — never invent prices, events, news or statistics. Your output is decision-support context for a discretionary trader, NOT a trade signal and NOT financial advice. If the provided data is insufficient, say so explicitly in your analysis text.";

/**
 * Call Claude with a JSON schema-constrained response. Returns null when the AI
 * layer is not configured or the call fails (failure reason kept in aiLastError).
 */
export async function aiJson<T>(opts: {
  cacheKey: string;
  ttlMs: number;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  noCache?: boolean;
}): Promise<T | null> {
  if (!client) {
    lastError = "ANTHROPIC_API_KEY not configured";
    return null;
  }
  const run = async () => {
    try {
      const response = await client.messages.create({
        model: config.anthropicModel,
        max_tokens: opts.maxTokens ?? 2000,
        thinking: { type: "adaptive" },
        system: DISCLAIMER,
        messages: [{ role: "user", content: opts.prompt }],
        output_config: { format: { type: "json_schema", schema: opts.schema } },
      });
      if (response.stop_reason === "refusal") {
        lastError = `request refused (${opts.cacheKey})`;
        console.warn(`[ai] request refused for ${opts.cacheKey}`);
        return null;
      }
      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") return null;
      lastError = null;
      return JSON.parse(text.text) as T;
    } catch (err) {
      lastError = (err as Error).message;
      console.warn(`[ai] call failed for ${opts.cacheKey}: ${(err as Error).message}`);
      return null;
    }
  };
  return opts.noCache ? run() : cached(opts.cacheKey, opts.ttlMs, run);
}
