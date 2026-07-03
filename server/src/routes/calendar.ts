import { Router } from "express";
import { getCalendar } from "../providers/calendar.js";

export const calendarRouter = Router();

// /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to today)
calendarRouter.get("/", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = typeof req.query.from === "string" ? req.query.from : today;
  const to = typeof req.query.to === "string" ? req.query.to : from;
  const events = await getCalendar(from, to);
  res.json({ events, timestamp: Date.now() });
});
