# APfx HybridDash

An AI-driven personal trading terminal for a discretionary intraday trader (London + New York sessions), modelled after the HybridTrader "AI Macro" dashboard. The app delivers **context, bias scores with confidence, and risk frameworks** — it is decision-support, **not** a signal service and **not** an auto-trader. You pull the trigger.

Six fully built tabs:

1. **Dashboard** — greeting, live session clocks (London/NY/Sydney/Asia), AI Macro Desk preview, "For You" AI pre-session briefing, capital flow, live ticker, live news feed, currency-strength chart.
2. **AI Macro Desk** — AI bias cards (Bullish/Bearish/Neutral + confidence + drivers) for all 16 markets, with Quick Overview and Deep Dive.
3. **Macro view** — per-instrument deep-dive: Edge Factor (0–100), live price + 1D/5D/1M chart, AI overview, Market Mood gauge (Risk-Off↔Risk-On), Market Policy, Flow/Bearing/Pulse regime cards, market sessions and relative-strength basket.
4. **Macro calendar** — live economic events on a timeline with a "now" marker, currency/impact filters, and per-event AI analysis with confidence.
5. **Dynamic Journal** — the core: trade journal with KPIs (Net P&L, Profit Factor, Win Rate, Avg Win/Loss), equity curve, performance heatmap, P&L by day of week, trade-quality radar, AI performance overview, **plus a full risk & trade-management layer**: position-size calculator (NQ/ES tick values, XAUUSD pip value), R-based tracking & expectancy, R-distribution histogram, rule checklist per trade (1:2–1:3 RR, BE at 1.5R, 1R risk), and a risk dashboard with daily/weekly loss limits and warnings.
6. **Reports** — AI coaching reports (weekly/monthly/quarterly) generated from your own journal, with exportable summaries.

Covered markets: XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY, EURJPY, GBPJPY, GBPEUR, EURGBP, AUDUSD, USDCAD, US30, US100 (NQ), SPX (ES), BTCUSD, Brent oil — with **US100, SPX and XAUUSD as primary instruments**.

## Tech stack

- **Client:** React 18 + Vite + TypeScript + Tailwind CSS, Recharts, TanStack Query (polling for live panels).
- **Server:** Node.js + Express proxy layer — **all API keys stay server-side**; the frontend only talks to `/api/*`.
- **Database:** SQLite via Prisma (journal, settings, saved reports). Swap the datasource provider to `postgresql` in `server/prisma/schema.prisma` to migrate to Postgres/Supabase.
- **AI layer:** Anthropic API (Claude) with JSON-schema-constrained responses for bias, edge factor, briefing, calendar-event analysis and coaching.

## Data integrity

Everything labelled **Live** comes from a real provider API. Derived metrics (capital flow, currency strength, relative strength, sentiment breadth) are computed from real quotes/candles and labelled **computed**. When no provider can serve a symbol, panels show **"data unavailable"** — nothing is fabricated. The AI layer is instructed to summarise only the fetched data and to treat its output as decision support, never a trade signal.

## Setup

```bash
# 1. Install (npm workspaces)
npm install

# 2. Configure keys
cp server/.env.example server/.env
# fill in the keys — see table below

# 3. Create the SQLite database
npm run db:setup

# 4. Run (server on :4000, client on :5173, /api proxied)
npm run dev
```

Open http://localhost:5173.

## Required keys (`server/.env`)

| Key | Provider | Powers | Free tier |
|---|---|---|---|
| `TWELVEDATA_API_KEY` | [Twelve Data](https://twelvedata.com) | Primary quotes + candles (FX, metals, indices, crypto, oil) | ✅ |
| `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io) | Quote/candle fallback + **news feed** + calendar fallback | ✅ |
| `FMP_API_KEY` | [FMP](https://financialmodelingprep.com) | Quote/candle fallback + **economic calendar** | ✅ |
| `MARKETAUX_API_KEY` | [Marketaux](https://marketaux.com) | News fallback (optional) | ✅ |
| `ANTHROPIC_API_KEY` | [Anthropic](https://console.anthropic.com) | All AI panels (bias, edge factor, briefing, event analysis, coaching) | — |
| `TRADER_NAME` | — | Dashboard greeting | — |

### Fields that still need a provider key

- **Quotes/candles/capital flow/currency strength** → at least one of `TWELVEDATA_API_KEY`, `FINNHUB_API_KEY`, `FMP_API_KEY`. Index symbols (US30/US100/SPX/VIX/DXY/US10Y) are best covered by Twelve Data or FMP; Finnhub's free tier does not serve them.
- **Economic calendar** → `FMP_API_KEY` (primary) or `FINNHUB_API_KEY`.
- **News feed** → `FINNHUB_API_KEY` (primary) or `MARKETAUX_API_KEY`.
- **All "AI Analysis" panels** → `ANTHROPIC_API_KEY` (model configurable via `ANTHROPIC_MODEL`, default `claude-opus-4-8`).

The journal, risk layer, position-size calculator and session clocks work **without any keys**.

## Architecture

```
/client              React + Vite + Tailwind (UI only, no keys)
  src/pages          the six tabs
  src/components     Card, Gauge, MiniChart, Heatmap, badges…
  src/lib            api hooks, session clocks, position sizing, palette
/server              Express + Prisma (keys live here)
  src/providers      twelvedata / finnhub / fmp / news / calendar adapters
  src/routes         /api/market /api/news /api/calendar /api/ai /api/journal
  src/ai             Anthropic client (JSON-schema outputs, cached)
  prisma             SQLite schema (Trade, Settings, Report)
```

Provider adapters are chained (Twelve Data → Finnhub → FMP) and swappable; every endpoint has a 45s–10min in-memory cache to respect free-tier rate limits, and every panel shows a "Last update" timestamp.

## API endpoints

- `GET /api/market/quotes|candles/:id|capital-flow|currency-strength|relative-strength|meta`
- `GET /api/news` · `GET /api/calendar?from&to`
- `POST /api/ai/bias|edge-factor|briefing|calendar-event|coaching` · `GET /api/ai/reports|status`
- `GET|POST|PUT|DELETE /api/journal/trades` · `GET /api/journal/stats` · `GET|PUT /api/journal/settings`
