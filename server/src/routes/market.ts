import { Router } from "express";
import { config } from "../config.js";
import { INSTRUMENTS } from "../instruments.js";
import { capitalFlow, currencyStrength, relativeStrength } from "../lib/derived.js";
import { getCandles, getQuote, getQuotes } from "../providers/marketdata.js";

export const marketRouter = Router();

marketRouter.get("/meta", (_req, res) => {
  res.json({
    traderName: config.traderName,
    instruments: INSTRUMENTS.map(({ id, name, category, primary }) => ({ id, name, category, primary })),
  });
});

// /api/market/quotes?ids=US100,XAUUSD  (defaults to all instruments)
marketRouter.get("/quotes", async (req, res) => {
  const ids = typeof req.query.ids === "string" && req.query.ids.length
    ? req.query.ids.split(",")
    : INSTRUMENTS.map((i) => i.id);
  const quotes = await getQuotes(ids);
  res.json({ quotes, timestamp: Date.now() });
});

marketRouter.get("/candles/:id", async (req, res) => {
  const interval = (req.query.interval as "5min" | "1h" | "1day") ?? "1h";
  const points = Math.min(Number(req.query.points ?? 60), 400);
  if (!["5min", "1h", "1day"].includes(interval)) {
    res.status(400).json({ error: "interval must be 5min | 1h | 1day" });
    return;
  }
  const series = await getCandles(req.params.id, interval, points);
  if (!series) {
    res.status(404).json({ error: "data unavailable", id: req.params.id });
    return;
  }
  res.json(series);
});

marketRouter.get("/capital-flow", async (_req, res) => {
  res.json(await capitalFlow());
});

marketRouter.get("/currency-strength", async (_req, res) => {
  const data = await currencyStrength();
  if (!data) {
    res.status(404).json({ error: "data unavailable" });
    return;
  }
  res.json(data);
});

marketRouter.get("/relative-strength", async (_req, res) => {
  res.json(await relativeStrength());
});

marketRouter.get("/quote/:id", async (req, res) => {
  const quote = await getQuote(req.params.id);
  if (!quote) {
    res.status(404).json({ error: "data unavailable", id: req.params.id });
    return;
  }
  res.json(quote);
});
