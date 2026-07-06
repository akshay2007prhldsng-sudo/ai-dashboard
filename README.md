# APfx HybridDash

An AI-driven personal trading terminal for a discretionary intraday trader (London + New York sessions), modelled after the HybridTrader "AI Macro" dashboard. The app delivers **context, bias scores with confidence, and risk frameworks** — it is decision-support, **not** a signal service and **not** an auto-trader. You pull the trigger.

Six fully built tabs:

1. **Dashboard** — greeting, live session clocks (London/NY/Sydney/Asia), AI Macro Desk preview, "For You" AI pre-session briefing, capital flow, live ticker, live news feed, currency-strength chart.
2. **AI Macro Desk** — AI bias cards (Bullish/Bearish/Neutral + confidence + drivers) for every watchlist market, with Quick Overview and Deep Dive.
3. **Macro view** — per-instrument deep-dive: Edge Factor (0–100), live price + 1D/5D/1M chart, AI overview, Market Mood gauge (Risk-Off↔Risk-On), Market Policy, Flow/Bearing/Pulse regime cards, market sessions and relative-strength basket.
4. **Macro calendar** — live economic events on a timeline with a "now" marker, currency/impact filters, and per-event AI analysis with confidence.
5. **Dynamic Journal** — the core: trade journal with KPIs (Net P&L, Profit Factor, Win Rate, Avg Win/Loss), equity curve, performance heatmap, P&L by day of week, trade-quality radar, AI performance overview, **plus a full risk & trade-management layer**: position-size calculator (NQ/ES tick values, XAUUSD pip value), R-based tracking & expectancy, R-distribution histogram, rule checklist per trade (1:2–1:3 RR, BE at 1.5R, 1R risk), and a risk dashboard with daily/weekly loss limits and warnings.
6. **Reports** — AI coaching reports (weekly/monthly/quarterly) generated from your own journal, with exportable summaries.

Plus two sidebar pages:

- **Psychology** — emotion & discipline analytics computed from your journal: discipline score, rule-followed vs rule-broken P&L, P&L and win-rate by emotional state, a rolling discipline trend, automatic behavioural/tilt flags (losing streaks, revenge trading, FOMO chasing), and an AI mindset insight (triggers + practices).
- **Community** — vote on which instruments to add to the desk next; propose new pairs. Votes persist in the database (a beta stub until multi-user accounts land).

Watchlist markets: XAUUSD (Gold), US100 (NASDAQ/NQ), SPX (S&P 500/ES), EURUSD, GBPUSD, BTCUSD, USOIL (WTI) — with **US100, SPX and XAUUSD as primary instruments**. Edit `server/src/instruments.ts` to add or remove markets (keep the watchlist short to stay within free-tier rate limits).

## Tech stack

- **Client:** React 18 + Vite + TypeScript + Tailwind CSS, Recharts, TanStack Query (polling for live panels).
- **Server:** Node.js + Express proxy layer — **all API keys stay server-side**; the frontend only talks to `/api/*`.
- **Database:** SQLite via Prisma (journal, settings, saved reports). Swap the datasource provider to `postgresql` in `server/prisma/schema.prisma` to migrate to Postgres/Supabase.
- **AI layer:** Anthropic API (Claude) with JSON-schema-constrained responses for bias, edge factor, briefing, calendar-event analysis and coaching.

## Data integrity

Everything labelled **Live** comes from a real source, scraped keyless from public pages/feeds — **no paid data APIs**. Numeric prices/candles come from **Yahoo Finance**; news from public **RSS feeds** (MarketWatch/CNBC/Investing/CoinDesk/Yahoo); the economic calendar from **ForexFactory's** public weekly JSON. Derived metrics (capital flow, currency strength, relative strength, sentiment breadth) are computed from real quotes/candles and labelled **computed**. When no source can serve a symbol, panels show **"data unavailable"** — nothing is fabricated. The AI interprets only this scraped data (it never invents prices, numbers, or news) and its output is decision support, never a trade signal.

### Scheduled agent engine (autonomous refresh)

The AI runs **server-side on a 15-minute cycle** — the frontend never calls the AI, it only polls cached results.

1. **Scrapers** (keyless) pull the raw data: Yahoo quotes, RSS headlines, ForexFactory calendar.
2. **Global Macro Agent** (once per cycle) *interprets* that scraped data → a cached `macro_context` (USD strength, risk sentiment, yields, central banks, briefing, summary). The news + calendar it carries are the **real scraped items**; the AI only adds interpretation.
3. **Pair Agents** (one per market, in parallel) *interpret only* — they combine `macro_context`, the pair-relevant scraped headlines, and the real price + technicals; they never invent numbers → per-pair analysis (bias, confidence, edge factor, mood, policy, flow/bearing/pulse, drivers, risks, trading narrative, invalidation).
4. Results are stored in an in-memory cycle cache; the client light-polls `/api/agents/state` every 15s.

A **freshness indicator** in the header (green <15m · amber 15–30m · red >30m) and a **Refresh Now** button (`POST /api/agents/refresh`) trigger a full cycle on demand. This keeps AI cost predictable: one macro web-research pass + 7 interpretation calls per cycle, not per page view.

### Data sources — 100% keyless scraping (only an Anthropic key)

No paid data APIs. Everything is scraped from public sources server-side, then interpreted by the AI:

| Data | Source | Key? |
|---|---|---|
| Quotes & candles | **Yahoo Finance** (`GC=F`, `NQ=F`, `ES=F`, `CL=F`, `EURUSD=X`, `GBPUSD=X`, `BTC-USD`, …) | Keyless |
| News feed | Public **RSS** — MarketWatch, CNBC, Investing, CoinDesk, Yahoo | Keyless |
| Economic calendar | **ForexFactory** public weekly JSON | Keyless |
| AI analysis | **Anthropic** (Claude) | `ANTHROPIC_API_KEY` |

Yahoo requests are throttled (250 ms gap) and cached; RSS/calendar are cached for 5–30 min. The keyed price providers (Twelve Data/Finnhub/FMP) remain only as an optional fallback if Yahoo is blocked on your network — set one of their keys and it's picked up automatically. Scraped endpoints are unofficial (no SLA); if a source blocks you, the panel shows "data unavailable" rather than fabricating.

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

| Key | Provider | Powers | Required? |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | [Anthropic](https://console.anthropic.com) | All AI analysis (macro + pair agents) | **Yes — the only one** |
| _(none)_ | Yahoo Finance / RSS / ForexFactory | Prices, candles, news, calendar (scraped keyless) | Keyless |
| `TWELVEDATA_API_KEY` | [Twelve Data](https://twelvedata.com) | Optional price fallback if Yahoo is blocked | Optional |
| `FINNHUB_API_KEY` / `FMP_API_KEY` | Finnhub / FMP | Optional price fallback | Optional |
| `TRADER_NAME` | — | Dashboard greeting | Optional |

### What each key unlocks

- **Prices/candles/capital flow/currency strength** → Yahoo Finance, keyless. Add `TWELVEDATA_API_KEY`/`FINNHUB_API_KEY`/`FMP_API_KEY` only as a fallback.
- **News feed & economic calendar** → scraped keyless (RSS + ForexFactory) — no key.
- **All AI analysis panels** → `ANTHROPIC_API_KEY` (model via `ANTHROPIC_MODEL`, default `claude-opus-4-8`).

The journal, risk layer, position-size calculator and session clocks work **without any keys**.

## Architecture

```
/client              React + Vite + Tailwind (UI only, no keys)
  src/pages          the six tabs
  src/components     Card, Gauge, MiniChart, Heatmap, badges…
  src/lib            api hooks, session clocks, position sizing, palette
/server              Express + Prisma (keys live here)
  src/providers      yahoo / twelvedata / finnhub / fmp price adapters
  src/providers/scrape  rss (news) + forexfactory (calendar) keyless scrapers
  src/agents         scheduler + macro/pair agents (interpret scraped data)
  src/routes         /api/market /api/news /api/calendar /api/ai /api/journal
  src/ai             Anthropic client (JSON-schema outputs, cached)
  prisma             SQLite schema (Trade, Settings, Report)
```

Provider adapters are chained (Yahoo → Twelve Data → Finnhub → FMP) and swappable; every endpoint has a 45s–10min in-memory cache, quote requests are batched where the provider supports it, stale values are served if a refresh is throttled, and every panel shows a "Last update" timestamp.

## API endpoints

- `GET /api/market/quotes|candles/:id|capital-flow|currency-strength|relative-strength|meta`
- `GET /api/news` · `GET /api/calendar?from&to`
- `GET /api/agents/state` (cached macro + pair cycle) · `POST /api/agents/refresh` (Refresh Now)
- `POST /api/ai/calendar-event|coaching|psychology` · `GET /api/ai/reports|status` (on-demand; bias/edge/briefing now come from the agent cycle)
- `GET|POST|PUT|DELETE /api/journal/trades` · `GET /api/journal/stats|psychology` · `GET|PUT /api/journal/settings`
- `GET|POST /api/community` · `POST /api/community/:id/vote`
