import cors from "cors";
import express from "express";
import { startScheduler } from "./agents/scheduler.js";
import { config } from "./config.js";
import { anyProviderConfigured } from "./providers/marketdata.js";
import { agentsRouter } from "./routes/agents.js";
import { aiRouter } from "./routes/ai.js";
import { calendarRouter } from "./routes/calendar.js";
import { communityRouter } from "./routes/community.js";
import { journalRouter } from "./routes/journal.js";
import { marketRouter } from "./routes/market.js";
import { newsRouter } from "./routes/news.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    providers: {
      marketData: anyProviderConfigured(),
      yahoo: true, // keyless default source
      twelvedata: Boolean(config.twelveDataKey),
      finnhub: Boolean(config.finnhubKey),
      fmp: Boolean(config.fmpKey),
      marketaux: Boolean(config.marketauxKey),
      anthropic: Boolean(config.anthropicKey),
    },
  });
});

app.use("/api/market", marketRouter);
app.use("/api/news", newsRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/ai", aiRouter);
app.use("/api/journal", journalRouter);
app.use("/api/community", communityRouter);
app.use("/api/agents", agentsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`APfx HybridDash server on http://localhost:${config.port}`);
  if (!anyProviderConfigured()) {
    console.warn("No market-data provider key configured — live panels will show 'data unavailable'.");
  }
  if (!config.anthropicKey) {
    console.warn("No ANTHROPIC_API_KEY — AI panels will show 'AI unavailable'.");
  }
  // Server-side scheduled agent cycle (macro + pair agents every 15 min).
  startScheduler();
});
