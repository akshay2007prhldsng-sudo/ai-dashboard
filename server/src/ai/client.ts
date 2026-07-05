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
  noCache?: boolean;
}): Promise<T | null> {
  if (!client) return null;
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
  };
  return opts.noCache ? run() : cached(opts.cacheKey, opts.ttlMs, run);
}

/** Pull the first balanced JSON object/array out of a text blob (handles ``` fences and prose). */
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) return null;
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) {
      try { return JSON.parse(body.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

/**
 * Call Claude with the live web-search tool and return parsed JSON from the answer.
 * Used for the qualitative layers (news, calendar) so they need no dedicated
 * data-provider key — only ANTHROPIC_API_KEY. Never uses output_config (the
 * citations web search emits are incompatible with structured outputs), so we
 * instruct JSON-only and parse it out. Returns null if unconfigured or on failure.
 */
export async function aiWebSearch<T>(opts: {
  cacheKey: string;
  ttlMs: number;
  prompt: string;
  maxUses?: number;
  maxTokens?: number;
  noCache?: boolean;
}): Promise<T | null> {
  if (!client) return null;
  const run = async () => {
    try {
      const tools = [
        { type: "web_search_20260209", name: "web_search", max_uses: opts.maxUses ?? 5 },
      ] as unknown as Anthropic.Messages.ToolUnion[];
      const messages: Anthropic.Messages.MessageParam[] = [
        { role: "user", content: opts.prompt },
      ];
      let response = await client.messages.create({
        model: config.anthropicModel,
        max_tokens: opts.maxTokens ?? 3000,
        system: DISCLAIMER + " Use the web_search tool to gather CURRENT, real data. Cite only what you actually retrieve; never fabricate. Respond with ONLY the requested JSON — no prose, no markdown outside the JSON.",
        messages,
        tools,
      });
      // Server-side tool loop can pause; resume until the turn ends.
      for (let i = 0; i < 4 && response.stop_reason === "pause_turn"; i++) {
        messages.push({ role: "assistant", content: response.content });
        response = await client.messages.create({
          model: config.anthropicModel,
          max_tokens: opts.maxTokens ?? 3000,
          system: DISCLAIMER,
          messages,
          tools,
        });
      }
      if (response.stop_reason === "refusal") {
        console.warn(`[ai] web-search refused for ${opts.cacheKey}`);
        return null;
      }
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return (extractJson(text) as T) ?? null;
    } catch (err) {
      console.warn(`[ai] web-search failed for ${opts.cacheKey}: ${(err as Error).message}`);
      return null;
    }
  };
  return opts.noCache ? run() : cached(opts.cacheKey, opts.ttlMs, run);
}
