// Scheduled refresh cycle (server-side only). Every 15 minutes:
//   1. Scrape the raw data keyless (Yahoo quotes, RSS news, ForexFactory calendar)
//      and record per-source health for the diagnostics strip.
//   2. Run the Global Macro Agent (interprets the scraped data) -> macro_context
//   3. Run all Pair Agents in parallel, reusing that macro_context
//   4. Store results in the in-memory cycle cache for the client to poll
// A "Refresh Now" trigger runs the same cycle on demand. Overlapping runs are
// skipped so we never fire duplicate agents.

import { aiAvailable, aiLastError } from "../ai/client.js";
import { INSTRUMENTS } from "../instruments.js";
import { getCalendar } from "../providers/calendar.js";
import { getQuotes } from "../providers/marketdata.js";
import { getNews } from "../providers/news.js";
import { runMacroAgent } from "./macro.js";
import { runPairAgent } from "./pair.js";
import { cycleState, type SourceHealth } from "./store.js";

const PAIR_IDS = INSTRUMENTS.map((i) => i.id);

async function scrapeAndReport(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [quotes, news, calendar] = await Promise.all([
    getQuotes(PAIR_IDS),
    getNews(),
    getCalendar(today, tomorrow),
  ]);
  const quoteCount = Object.values(quotes).filter(Boolean).length;
  const prices: SourceHealth = {
    ok: quoteCount > 0,
    detail: quoteCount > 0 ? `${quoteCount}/${PAIR_IDS.length} quotes (Yahoo)` : "Yahoo unreachable — no quotes",
  };
  const newsHealth: SourceHealth = {
    ok: news.length > 0,
    detail: news.length > 0 ? `${news.length} headlines (RSS)` : "RSS feeds unreachable",
  };
  const calendarHealth: SourceHealth = {
    ok: calendar.length > 0,
    detail: calendar.length > 0 ? `${calendar.length} events (ForexFactory)` : "ForexFactory unreachable",
  };
  const ai: SourceHealth = aiAvailable()
    ? { ok: aiLastError() === null, detail: aiLastError() ?? "ready" }
    : { ok: false, detail: "ANTHROPIC_API_KEY not configured" };
  cycleState.sources = { prices, news: newsHealth, calendar: calendarHealth, ai };
}

export async function runCycle(): Promise<void> {
  if (cycleState.running) {
    console.log("[scheduler] cycle already running — skipping");
    return;
  }
  cycleState.running = true;
  cycleState.status = "running";
  cycleState.startedAt = Date.now();
  cycleState.error = null;
  console.log("[scheduler] cycle started");

  try {
    // 1. Scrape raw data (fills the shared caches) + record per-source health.
    await scrapeAndReport();

    if (!aiAvailable()) {
      cycleState.status = "error";
      cycleState.error = "AI layer not configured — set ANTHROPIC_API_KEY";
      return;
    }

    // 2. Macro agent interprets the scraped data. Keep last-good on failure.
    const macro = await runMacroAgent();
    if (macro) cycleState.macro = macro;
    else console.warn(`[scheduler] macro agent returned no data (${aiLastError() ?? "unknown"}) — reusing previous`);

    // 3. Pair agents in parallel, reusing the macro context.
    const results = await Promise.all(PAIR_IDS.map((id) => runPairAgent(id, cycleState.macro)));
    PAIR_IDS.forEach((id, i) => {
      if (results[i]) cycleState.pairs[id] = results[i];
    });

    // Refresh AI health after the agent runs (captures auth/quota failures).
    if (cycleState.sources) {
      const err = aiLastError();
      cycleState.sources.ai = { ok: err === null, detail: err ?? "ok" };
    }

    cycleState.completedAt = Date.now();
    const filled = Object.values(cycleState.pairs).filter(Boolean).length;
    if (filled === 0 && !cycleState.macro) {
      cycleState.status = "error";
      cycleState.error = aiLastError() ?? "agents produced no data";
    } else {
      cycleState.status = "ok";
    }
    console.log(
      `[scheduler] cycle complete in ${(((cycleState.completedAt ?? Date.now()) - cycleState.startedAt) / 1000).toFixed(1)}s — ${filled}/${PAIR_IDS.length} pairs`
    );
  } catch (err) {
    cycleState.status = "error";
    cycleState.error = (err as Error).message;
    console.warn(`[scheduler] cycle failed: ${(err as Error).message}`);
  } finally {
    cycleState.running = false;
  }
}

/** Fire a cycle immediately without awaiting (used by POST /api/agents/refresh). */
export function triggerCycle(): boolean {
  if (cycleState.running) return false;
  void runCycle();
  return true;
}

export function startScheduler(): void {
  // Kick off the first cycle shortly after boot, then every 15 minutes.
  setTimeout(() => void runCycle(), 2_000);
  setInterval(() => void runCycle(), cycleState.intervalMs);
  console.log(`[scheduler] started — refreshing every ${cycleState.intervalMs / 60_000} min`);
}
