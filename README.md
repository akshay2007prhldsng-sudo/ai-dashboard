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

Everything labelled **Live** comes from a real source. Numeric prices/charts come from a market-data provider API. News and the economic calendar come either from a dedicated provider or — in **hybrid mode** — from **Claude's live `web_search` tool** (labelled provider `web-search`), which retrieves them from real pages at request time. Derived metrics (capital flow, currency strength, relative strength, sentiment breadth) are computed from real quotes/candles and labelled **computed**. When no source can serve a symbol, panels show **"data unavailable"** — nothing is fabricated. The AI layer is instructed to summarise only fetched data and to treat its output as decision support, never a trade signal.

### Scheduled agent engine (autonomous refresh)

The AI runs **server-side on a 15-minute cycle** — the frontend never calls the AI, it only polls cached results.

1. **Global Macro Agent** (once per cycle) does the *only* web research: USD strength (DXY), risk sentiment, yields, central banks, major news, calendar highlights → a cached `macro_context` (also feeds the news feed + For-You briefing, so no duplicate web searches).
2. **Pair Agents** (one per market, in parallel) *interpret only* — they combine `macro_context` with the real price + technicals and never invent numbers → per-pair analysis (bias, confidence, edge factor, mood, policy, flow/bearing/pulse, drivers, risks, trading narrative, invalidation).
3. Results are stored in an in-memory cycle cache; the client light-polls `/api/agents/state` every 15s.

A **freshness indicator** in the header (green <15m · amber 15–30m · red >30m) and a **Refresh Now** button (`POST /api/agents/refresh`) trigger a full cycle on demand. This keeps AI cost predictable: one macro web-research pass + 7 interpretation calls per cycle, not per page view.

### Data sources — keyless by default

Prices and charts default to **Yahoo Finance**, which needs **no API key** and covers the whole watchlist — including the index/commodity futures (`NQ=F`, `ES=F`, `CL=F`, `GC=F`) that paid tiers gate. The provider chain is **Yahoo → Twelve Data → Finnhub → FMP**: Yahoo is tried first (keyless), and the keyed providers act only as fallback if Yahoo is unreachable on your network.

So the practical minimum is just `ANTHROPIC_API_KEY`:

- **Quotes & charts** → Yahoo Finance (keyless, exact numbers). Web search is deliberately *not* used for prices — the AI never invents numbers.
- **News, economic calendar, and macro narrative** → Claude's `web_search` tool via the scheduled Macro Agent (one pass per cycle).

> Yahoo's endpoint is unofficial (no SLA). If it's blocked on your network or rate-limits you, add a `TWELVEDATA_API_KEY` (free tier) as a fallback — it's picked up automatically.

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
| _(none)_ | [Yahoo Finance](https://finance.yahoo.com) | Quotes + candles for the whole watchlist | **Keyless default** |
| `ANTHROPIC_API_KEY` | [Anthropic](https://console.anthropic.com) | All AI panels **+ live web-search news/calendar** | **Yes** |
| `TWELVEDATA_API_KEY` | [Twelve Data](https://twelvedata.com) | Quote/candle fallback if Yahoo is blocked | Optional |
| `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io) | Quote/candle fallback + news override | Optional |
| `FMP_API_KEY` | [FMP](https://financialmodelingprep.com) | Quote/candle fallback + calendar override | Optional |
| `MARKETAUX_API_KEY` | [Marketaux](https://marketaux.com) | Extra news source | Optional |
| `TRADER_NAME` | — | Dashboard greeting | Optional |

### What each key unlocks

- **Quotes/candles/capital flow/currency strength** → Yahoo Finance out of the box (no key). Add `TWELVEDATA_API_KEY`/`FINNHUB_API_KEY`/`FMP_API_KEY` only as a fallback.
- **News feed & economic calendar** → `ANTHROPIC_API_KEY` (Macro Agent web search), or a dedicated key which then overrides it.
- **All "AI Analysis" panels** → `ANTHROPIC_API_KEY` (model configurable via `ANTHROPIC_MODEL`, default `claude-opus-4-8`; must support the `web_search` tool).

The journal, risk layer, position-size calculator and session clocks work **without any keys**.

## Architecture

```
/client              React + Vite + Tailwind (UI only, no keys)
  src/pages          the six tabs
  src/components     Card, Gauge, MiniChart, Heatmap, badges…
  src/lib            api hooks, session clocks, position sizing, palette
/server              Express + Prisma (keys live here)
  src/providers      yahoo / twelvedata / finnhub / fmp / news / calendar / websearch adapters
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
