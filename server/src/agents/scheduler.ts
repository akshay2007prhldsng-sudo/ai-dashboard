// Scheduled refresh cycle (server-side only). Every 15 minutes:
//   1. Run the Global Macro Agent (one web-research pass) -> macro_context
//   2. Run all Pair Agents in parallel, reusing that macro_context
//   3. Store results in the in-memory cycle cache for the client to poll
// A "Refresh Now" trigger runs the same cycle on demand. Overlapping runs are
// skipped so we never fire duplicate agents.

import { aiAvailable } from "../ai/client.js";
import { INSTRUMENTS } from "../instruments.js";
import { runMacroAgent } from "./macro.js";
import { runPairAgent } from "./pair.js";
import { cycleState } from "./store.js";

const PAIR_IDS = INSTRUMENTS.map((i) => i.id);

export async function runCycle(): Promise<void> {
  if (cycleState.running) {
    console.log("[scheduler] cycle already running — skipping");
    return;
  }
  if (!aiAvailable()) {
    cycleState.status = "error";
    cycleState.error = "AI layer not configured — set ANTHROPIC_API_KEY";
    return;
  }
  cycleState.running = true;
  cycleState.status = "running";
  cycleState.startedAt = Date.now();
  cycleState.error = null;
  console.log("[scheduler] cycle started");

  try {
    // 1. Macro agent (web research, once). Keep last-good on failure.
    const macro = await runMacroAgent();
    if (macro) cycleState.macro = macro;
    else console.warn("[scheduler] macro agent returned no data — reusing previous");

    // 2. Pair agents in parallel, reusing the macro context.
    const results = await Promise.all(PAIR_IDS.map((id) => runPairAgent(id, cycleState.macro)));
    PAIR_IDS.forEach((id, i) => {
      if (results[i]) cycleState.pairs[id] = results[i];
    });

    cycleState.completedAt = Date.now();
    cycleState.status = "ok";
    const filled = Object.values(cycleState.pairs).filter(Boolean).length;
    console.log(`[scheduler] cycle complete in ${((cycleState.completedAt - cycleState.startedAt) / 1000).toFixed(1)}s — ${filled}/${PAIR_IDS.length} pairs`);
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
