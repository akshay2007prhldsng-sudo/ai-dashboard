// The markets covered by APfx HybridDash, with per-provider symbol mappings
// and contract specs for the position-size calculator. Trimmed to the trader's
// active watchlist (Gold, EURUSD, GBPUSD, NQ, ES, Bitcoin, WTI).

export type InstrumentCategory = "fx" | "metal" | "index" | "crypto" | "energy";

export interface Instrument {
  id: string; // canonical id used across the app, e.g. "US100"
  name: string; // full display name
  category: InstrumentCategory;
  base?: string; // base currency for FX strength calc
  quote?: string;
  yahoo?: string; // Yahoo Finance symbol (keyless, covers indices/futures/FX/crypto)
  /** account-currency value of a 1.0 price-unit move for 1 lot/contract */
  valuePerPoint: number;
  /** minimum price increment */
  tick: number;
  primary?: boolean; // trader's main instruments (NQ, ES, Gold)
}

export const INSTRUMENTS: Instrument[] = [
  { id: "XAUUSD", name: "Gold / US Dollar", category: "metal", quote: "USD", yahoo: "GC=F", valuePerPoint: 100, tick: 0.01, primary: true },
  { id: "US100", name: "NASDAQ 100 (NQ)", category: "index", quote: "USD", yahoo: "NQ=F", valuePerPoint: 20, tick: 0.25, primary: true },
  { id: "SPX", name: "S&P 500 (ES)", category: "index", quote: "USD", yahoo: "ES=F", valuePerPoint: 50, tick: 0.25, primary: true },
  { id: "EURUSD", name: "Euro / US Dollar", category: "fx", base: "EUR", quote: "USD", yahoo: "EURUSD=X", valuePerPoint: 100000, tick: 0.00001 },
  { id: "GBPUSD", name: "British Pound / US Dollar", category: "fx", base: "GBP", quote: "USD", yahoo: "GBPUSD=X", valuePerPoint: 100000, tick: 0.00001 },
  { id: "BTCUSD", name: "Bitcoin / US Dollar", category: "crypto", quote: "USD", yahoo: "BTC-USD", valuePerPoint: 1, tick: 0.1 },
  { id: "USOIL", name: "WTI Crude Oil (US Oil)", category: "energy", quote: "USD", yahoo: "CL=F", valuePerPoint: 1000, tick: 0.01 },
];

export const instrumentById = new Map(INSTRUMENTS.map((i) => [i.id, i]));

// Extra market-context symbols (not tradable instruments in the app, but used
// for capital flow / relative strength baskets).
export const CONTEXT_SYMBOLS: Instrument[] = [
  { id: "VIX", name: "CBOE Volatility Index", category: "index", yahoo: "^VIX", valuePerPoint: 1, tick: 0.01 },
  { id: "DXY", name: "US Dollar Index", category: "index", yahoo: "DX-Y.NYB", valuePerPoint: 1, tick: 0.01 },
  { id: "US10Y", name: "US 10Y Treasury Yield", category: "index", yahoo: "^TNX", valuePerPoint: 1, tick: 0.01 },
  { id: "COPPER", name: "Copper", category: "metal", yahoo: "HG=F", valuePerPoint: 1, tick: 0.001 },
];

// FX pairs used to compute the currency-strength matrix (scraped via Yahoo).
export const STRENGTH_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"] as const;
export const STRENGTH_PAIRS: { id: string; base: string; quote: string }[] = [
  { id: "EURUSD", base: "EUR", quote: "USD" },
  { id: "GBPUSD", base: "GBP", quote: "USD" },
  { id: "USDJPY", base: "USD", quote: "JPY" },
  { id: "AUDUSD", base: "AUD", quote: "USD" },
  { id: "USDCAD", base: "USD", quote: "CAD" },
  { id: "USDCHF", base: "USD", quote: "CHF" },
];

// Non-watchlist FX pairs needed only for the strength matrix.
const STRENGTH_ONLY: Instrument[] = [
  { id: "USDJPY", name: "US Dollar / Japanese Yen", category: "fx", base: "USD", quote: "JPY", yahoo: "USDJPY=X", valuePerPoint: 700, tick: 0.001 },
  { id: "AUDUSD", name: "Australian Dollar / US Dollar", category: "fx", base: "AUD", quote: "USD", yahoo: "AUDUSD=X", valuePerPoint: 100000, tick: 0.00001 },
  { id: "USDCAD", name: "US Dollar / Canadian Dollar", category: "fx", base: "USD", quote: "CAD", yahoo: "USDCAD=X", valuePerPoint: 75000, tick: 0.00001 },
  { id: "USDCHF", name: "US Dollar / Swiss Franc", category: "fx", base: "USD", quote: "CHF", yahoo: "USDCHF=X", valuePerPoint: 100000, tick: 0.00001 },
];

export const ALL_SYMBOLS = [...INSTRUMENTS, ...CONTEXT_SYMBOLS, ...STRENGTH_ONLY];
export const symbolById = new Map(ALL_SYMBOLS.map((i) => [i.id, i]));
