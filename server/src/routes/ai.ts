import { Router } from "express";
import { aiAvailable, aiJson } from "../ai/client.js";
import { prisma } from "../db.js";
import { instrumentById } from "../instruments.js";
import { technicalSnapshot } from "../lib/derived.js";
import { getCalendar } from "../providers/calendar.js";
import { getQuote } from "../providers/marketdata.js";
import { getNews } from "../providers/news.js";

export const aiRouter = Router();

const UNAVAILABLE = { unavailable: true, reason: "AI layer not configured — set ANTHROPIC_API_KEY" };

aiRouter.get("/status", (_req, res) => {
  res.json({ available: aiAvailable() });
});

async function marketContext(instrumentId: string) {
  const inst = instrumentById.get(instrumentId);
  if (!inst) return null;
  const [quote, tech, news, events] = await Promise.all([
    getQuote(instrumentId),
    technicalSnapshot(instrumentId),
    getNews(),
    getCalendar(isoToday(), isoToday()),
  ]);
  const relevantEvents = events
    .filter((e) => e.impact !== "Low")
    .slice(0, 12)
    .map((e) => ({ title: e.title, currency: e.currency, impact: e.impact, date: e.date, actual: e.actual, forecast: e.forecast, previous: e.previous }));
  return {
    instrument: { id: inst.id, name: inst.name, category: inst.category },
    quote: quote ? { price: quote.price, changePct: quote.changePct } : null,
    technicals: tech,
    todaysHighImpactEvents: relevantEvents,
    recentHeadlines: news.slice(0, 10).map((n) => n.headline),
  };
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- POST /api/ai/bias { instrument } ----
aiRouter.post("/bias", async (req, res) => {
  if (!aiAvailable()) { res.status(503).json(UNAVAILABLE); return; }
  const id = String(req.body?.instrument ?? "");
  const ctx = await marketContext(id);
  if (!ctx) { res.status(404).json({ error: `unknown instrument ${id}` }); return; }
  if (!ctx.quote && !ctx.technicals) {
    res.status(404).json({ error: "data unavailable — no live market data to analyse" });
    return;
  }
  const result = await aiJson({
    cacheKey: `ai:bias:${id}`,
    ttlMs: 5 * 60_000,
    prompt:
      `Assess the current directional bias for ${ctx.instrument.name} (${id}) for an intraday trader (London/NY sessions). ` +
      `Base your assessment ONLY on this live data:\n${JSON.stringify(ctx, null, 2)}\n` +
      `Return: bias (Bullish/Bearish/Neutral), confidence 0-100 (how strongly the data agrees), ` +
      `analysis (2-4 sentences on what drives the bias: macro + technical + event risk), and 2-3 concrete drivers as short bullets.`,
    schema: {
      type: "object",
      properties: {
        bias: { type: "string", enum: ["Bullish", "Bearish", "Neutral"] },
        confidence: { type: "integer" },
        analysis: { type: "string" },
        drivers: { type: "array", items: { type: "string" } },
      },
      required: ["bias", "confidence", "analysis", "drivers"],
      additionalProperties: false,
    },
  });
  if (!result) { res.status(502).json({ error: "AI analysis failed" }); return; }
  res.json({ ...result, instrument: id, timestamp: Date.now() });
});

// ---- POST /api/ai/edge-factor { instrument } — full Macro view AI payload ----
aiRouter.post("/edge-factor", async (req, res) => {
  if (!aiAvailable()) { res.status(503).json(UNAVAILABLE); return; }
  const id = String(req.body?.instrument ?? "");
  const ctx = await marketContext(id);
  if (!ctx) { res.status(404).json({ error: `unknown instrument ${id}` }); return; }
  if (!ctx.quote && !ctx.technicals) {
    res.status(404).json({ error: "data unavailable — no live market data to analyse" });
    return;
  }
  const result = await aiJson({
    cacheKey: `ai:edge:${id}`,
    ttlMs: 5 * 60_000,
    prompt:
      `You are producing the deep-dive panel for ${ctx.instrument.name} (${id}) in a trading terminal. ` +
      `Base everything ONLY on this live data:\n${JSON.stringify(ctx, null, 2)}\n` +
      `Produce:\n` +
      `- edge: score 0-100 for how much macro and technicals AGREE on a tradable direction, a short label ` +
      `(e.g. "Mixed / Low Clarity", "Aligned Bullish"), and an explanation ending with a concrete risk advice ` +
      `(e.g. preserve capital / wait for agreement / conditions favour engagement).\n` +
      `- overview: 2-3 sentence narrative of the instrument right now.\n` +
      `- mood: riskScore 0-100 (0=extreme Risk-Off, 100=extreme Risk-On) with positioning text.\n` +
      `- policy: stance Hawkish/Neutral/Dovish plus a global economic outlook paragraph.\n` +
      `- flow: level Thin/Healthy/Crowded + 2-3 bullets about participation.\n` +
      `- bearing: label like "Choppy Down"/"Trending Up" + 2-3 bullets about bias and stop placement.\n` +
      `- pulse: level Quiet/Tradable/Wild (volatility regime, use the ATR data) + 2-3 bullets about stop sizing.`,
    schema: {
      type: "object",
      properties: {
        edge: {
          type: "object",
          properties: {
            score: { type: "integer" },
            label: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["score", "label", "explanation"],
          additionalProperties: false,
        },
        overview: { type: "string" },
        mood: {
          type: "object",
          properties: { riskScore: { type: "integer" }, positioning: { type: "string" } },
          required: ["riskScore", "positioning"],
          additionalProperties: false,
        },
        policy: {
          type: "object",
          properties: {
            stance: { type: "string", enum: ["Hawkish", "Neutral", "Dovish"] },
            outlook: { type: "string" },
          },
          required: ["stance", "outlook"],
          additionalProperties: false,
        },
        flow: {
          type: "object",
          properties: {
            level: { type: "string", enum: ["Thin", "Healthy", "Crowded"] },
            bullets: { type: "array", items: { type: "string" } },
          },
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
          properties: {
            level: { type: "string", enum: ["Quiet", "Tradable", "Wild"] },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["level", "bullets"],
          additionalProperties: false,
        },
      },
      required: ["edge", "overview", "mood", "policy", "flow", "bearing", "pulse"],
      additionalProperties: false,
    },
    maxTokens: 3000,
  });
  if (!result) { res.status(502).json({ error: "AI analysis failed" }); return; }
  res.json({ ...result, instrument: id, timestamp: Date.now() });
});

// ---- POST /api/ai/briefing — "For You" pre-session briefing ----
aiRouter.post("/briefing", async (_req, res) => {
  if (!aiAvailable()) { res.status(503).json(UNAVAILABLE); return; }
  const [news, events, nq, gold] = await Promise.all([
    getNews(),
    getCalendar(isoToday(), isoToday()),
    getQuote("US100"),
    getQuote("XAUUSD"),
  ]);
  if (!news.length && !events.length && !nq && !gold) {
    res.status(404).json({ error: "data unavailable — no live data to brief on" });
    return;
  }
  const ctx = {
    date: isoToday(),
    keyQuotes: {
      US100: nq ? { price: nq.price, changePct: nq.changePct } : null,
      XAUUSD: gold ? { price: gold.price, changePct: gold.changePct } : null,
    },
    highImpactEvents: events.filter((e) => e.impact === "High").slice(0, 10)
      .map((e) => ({ title: e.title, currency: e.currency, date: e.date, forecast: e.forecast, previous: e.previous })),
    headlines: news.slice(0, 12).map((n) => n.headline),
  };
  const result = await aiJson({
    cacheKey: `ai:briefing:${isoToday()}:${Math.floor(Date.now() / (30 * 60_000))}`,
    ttlMs: 30 * 60_000,
    prompt:
      `Write the "For You" pre-session market briefing for a discretionary intraday trader whose main markets are ` +
      `NASDAQ 100 (NQ), S&P 500 (ES) and Gold. Base it ONLY on:\n${JSON.stringify(ctx, null, 2)}\n` +
      `Return a punchy headline, 2-3 short paragraphs (first is the lead; the rest is the "read more" body), ` +
      `and 1-2 one-word mood tags (e.g. Neutral, Cautious, Risk-On).`,
    schema: {
      type: "object",
      properties: {
        headline: { type: "string" },
        paragraphs: { type: "array", items: { type: "string" } },
        moods: { type: "array", items: { type: "string" } },
      },
      required: ["headline", "paragraphs", "moods"],
      additionalProperties: false,
    },
  });
  if (!result) { res.status(502).json({ error: "AI analysis failed" }); return; }
  res.json({ ...result, timestamp: Date.now() });
});

// ---- POST /api/ai/calendar-event { event: {...} } ----
aiRouter.post("/calendar-event", async (req, res) => {
  if (!aiAvailable()) { res.status(503).json(UNAVAILABLE); return; }
  const event = req.body?.event;
  if (!event?.title) { res.status(400).json({ error: "event required" }); return; }
  const result = await aiJson({
    cacheKey: `ai:event:${event.id ?? `${event.title}:${event.date}`}`,
    ttlMs: 30 * 60_000,
    prompt:
      `Explain this economic calendar event for an intraday FX/index trader in 1-3 sentences: what it measures, ` +
      `what the forecast/previous values imply, and what the market reaction risk is. ` +
      `Also return a confidence 0-100 for how predictable the market impact is. Event data (real, from the calendar API):\n` +
      JSON.stringify(event, null, 2),
    schema: {
      type: "object",
      properties: {
        analysis: { type: "string" },
        confidence: { type: "integer" },
      },
      required: ["analysis", "confidence"],
      additionalProperties: false,
    },
    maxTokens: 1000,
  });
  if (!result) { res.status(502).json({ error: "AI analysis failed" }); return; }
  res.json({ ...result, timestamp: Date.now() });
});

// ---- POST /api/ai/coaching { period: WEEK|MONTH|QUARTER } ----
aiRouter.post("/coaching", async (req, res) => {
  if (!aiAvailable()) { res.status(503).json(UNAVAILABLE); return; }
  const period = String(req.body?.period ?? "QUARTER").toUpperCase();
  const days = period === "WEEK" ? 7 : period === "MONTH" ? 30 : 90;
  const from = new Date(Date.now() - days * 86_400_000);
  const trades = await prisma.trade.findMany({
    where: { openedAt: { gte: from }, isOpen: false },
    orderBy: { openedAt: "asc" },
  });
  if (!trades.length) {
    res.status(404).json({ error: "No closed trades in this period — log trades in the journal first" });
    return;
  }
  const summary = trades.map((t) => ({
    instrument: t.instrument,
    direction: t.direction,
    session: t.session,
    openedAt: t.openedAt.toISOString(),
    pnl: t.pnl,
    rMultiple: t.rMultiple,
    emotion: t.emotion,
    followedRules: { rr: t.ruleRR, breakEven: t.ruleBreakEven, risk1R: t.ruleRisk },
    notes: t.notes.slice(0, 200),
  }));
  const result = await aiJson({
    cacheKey: `ai:coaching:${period}:${trades.length}:${trades[trades.length - 1].id}`,
    ttlMs: 60 * 60_000,
    prompt:
      `You are a trading performance coach reviewing behaviour and execution with full decision context. ` +
      `The trader's framework: fixed 1:2-1:3 RR, break-even at 1.5R, 1R (1%) risk per trade, London/NY intraday. ` +
      `Analyse these REAL journal entries (${period} period):\n${JSON.stringify(summary, null, 2)}\n` +
      `Return: a summary paragraph naming best/worst instruments and sessions with actual numbers from the data; ` +
      `3-4 focusActions (each with a short title and a description of the concrete improvement); ` +
      `strengths (may be empty if none stand out); and behavioural patterns you detect (rule violations, emotion clusters, revenge trading, etc.).`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        focusActions: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, description: { type: "string" } },
            required: ["title", "description"],
            additionalProperties: false,
          },
        },
        strengths: { type: "array", items: { type: "string" } },
        patterns: { type: "array", items: { type: "string" } },
      },
      required: ["summary", "focusActions", "strengths", "patterns"],
      additionalProperties: false,
    },
    maxTokens: 3000,
  });
  if (!result) { res.status(502).json({ error: "AI analysis failed" }); return; }
  const saved = await prisma.report.create({
    data: {
      period,
      fromDate: from,
      toDate: new Date(),
      json: JSON.stringify(result),
    },
  });
  res.json({ ...result, reportId: saved.id, period, timestamp: Date.now() });
});

// ---- GET /api/ai/reports — stored coaching reports ----
aiRouter.get("/reports", async (_req, res) => {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  res.json({
    reports: reports.map((r) => ({
      id: r.id,
      period: r.period,
      fromDate: r.fromDate,
      toDate: r.toDate,
      createdAt: r.createdAt,
      ...JSON.parse(r.json),
    })),
  });
});
