import Anthropic from "@anthropic-ai/sdk";
import { cached } from "../cache.js";
import { config } from "../config.js";

const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

export function aiAvailable(): boolean {
  return client !== null;
}

const DISCLAIMER =
  "You are the AI analysis layer of a personal trading dashboard. You summarise ONLY the real market data provided in the prompt — never invent prices, events or statistics. Your output is decision-support context for a discretionary trader, NOT a trade signal and NOT financial advice. If the provided data is insufficient, say so explicitly in your analysis text.";

/**
 * Call Claude with a JSON schema-constrained response and cache the result.
 * Returns null when the AI layer is not configured or the call fails.
 */
export async function aiJson<T>(opts: {
  cacheKey: string;
  ttlMs: number;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T | null> {
  if (!client) return null;
  return cached(opts.cacheKey, opts.ttlMs, async () => {
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
        console.warn(`[ai] request refused for ${opts.cacheKey}`);
        return null;
      }
      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") return null;
      return JSON.parse(text.text) as T;
    } catch (err) {
      console.warn(`[ai] call failed for ${opts.cacheKey}: ${(err as Error).message}`);
      return null;
    }
  });
}
