import { Router } from "express";
import { triggerCycle } from "../agents/scheduler.js";
import { cycleState } from "../agents/store.js";

export const agentsRouter = Router();

// Latest cached cycle results — the client polls this (no AI calls from frontend).
agentsRouter.get("/state", (_req, res) => {
  res.json({
    status: cycleState.status,
    running: cycleState.running,
    startedAt: cycleState.startedAt,
    completedAt: cycleState.completedAt,
    intervalMs: cycleState.intervalMs,
    error: cycleState.error,
    sources: cycleState.sources,
    macro: cycleState.macro,
    pairs: cycleState.pairs,
  });
});

// "Refresh Now" — triggers a full cycle immediately.
agentsRouter.post("/refresh", (_req, res) => {
  const started = triggerCycle();
  res.json({ started, running: cycleState.running });
});
