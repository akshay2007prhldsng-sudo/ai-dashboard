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
  twelveData?: string; // Twelve Data symbol
  finnhub?: string; // Finnhub symbol
  fmp?: string; // FMP symbol
  /** account-currency value of a 1.0 price-unit move for 1 lot/contract */
  valuePerPoint: number;
  /** minimum price increment */
  tick: number;
  primary?: boolean; // trader's main instruments (NQ, ES, Gold)
}

export const INSTRUMENTS: Instrument[] = [
  { id: "XAUUSD", name: "Gold / US Dollar", category: "metal", quote: "USD", yahoo: "GC=F", twelveData: "XAU/USD", finnhub: "OANDA:XAU_USD", fmp: "XAUUSD", valuePerPoint: 100, tick: 0.01, primary: true },
  { id: "US100", name: "NASDAQ 100 (NQ)", category: "index", quote: "USD", yahoo: "NQ=F", twelveData: "NDX", fmp: "^NDX", valuePerPoint: 20, tick: 0.25, primary: true },
  { id: "SPX", name: "S&P 500 (ES)", category: "index", quote: "USD", yahoo: "ES=F", twelveData: "SPX", fmp: "^GSPC", valuePerPoint: 50, tick: 0.25, primary: true },
  { id: "EURUSD", name: "Euro / US Dollar", category: "fx", base: "EUR", quote: "USD", yahoo: "EURUSD=X", twelveData: "EUR/USD", finnhub: "OANDA:EUR_USD", fmp: "EURUSD", valuePerPoint: 100000, tick: 0.00001 },
  { id: "GBPUSD", name: "British Pound / US Dollar", category: "fx", base: "GBP", quote: "USD", yahoo: "GBPUSD=X", twelveData: "GBP/USD", finnhub: "OANDA:GBP_USD", fmp: "GBPUSD", valuePerPoint: 100000, tick: 0.00001 },
  { id: "BTCUSD", name: "Bitcoin / US Dollar", category: "crypto", quote: "USD", yahoo: "BTC-USD", twelveData: "BTC/USD", finnhub: "BINANCE:BTCUSDT", fmp: "BTCUSD", valuePerPoint: 1, tick: 0.1 },
  { id: "USOIL", name: "WTI Crude Oil (US Oil)", category: "energy", quote: "USD", yahoo: "CL=F", twelveData: "WTI/USD", fmp: "CLUSD", valuePerPoint: 1000, tick: 0.01 },
];

export const instrumentById = new Map(INSTRUMENTS.map((i) => [i.id, i]));

// Extra market-context symbols (not tradable instruments in the app, but used
// for capital flow / relative strength baskets).
export const CONTEXT_SYMBOLS: Instrument[] = [
  { id: "VIX", name: "CBOE Volatility Index", category: "index", yahoo: "^VIX", twelveData: "VIX", fmp: "^VIX", valuePerPoint: 1, tick: 0.01 },
  { id: "DXY", name: "US Dollar Index", category: "index", yahoo: "DX-Y.NYB", twelveData: "DXY", fmp: "DX-Y.NYB", valuePerPoint: 1, tick: 0.01 },
  { id: "US10Y", name: "US 10Y Treasury Yield", category: "index", yahoo: "^TNX", twelveData: "TNX", fmp: "^TNX", valuePerPoint: 1, tick: 0.01 },
  { id: "COPPER", name: "Copper", category: "metal", yahoo: "HG=F", twelveData: "XCU/USD", fmp: "HGUSD", valuePerPoint: 1, tick: 0.001 },
];

export const ALL_SYMBOLS = [...INSTRUMENTS, ...CONTEXT_SYMBOLS];
export const symbolById = new Map(ALL_SYMBOLS.map((i) => [i.id, i]));

// FX pairs used to compute the currency-strength matrix.
export const STRENGTH_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"] as const;
export const STRENGTH_PAIRS: { id: string; base: string; quote: string; twelveData: string; fmp: string }[] = [
  { id: "EURUSD", base: "EUR", quote: "USD", twelveData: "EUR/USD", fmp: "EURUSD" },
  { id: "GBPUSD", base: "GBP", quote: "USD", twelveData: "GBP/USD", fmp: "GBPUSD" },
  { id: "USDJPY", base: "USD", quote: "JPY", twelveData: "USD/JPY", fmp: "USDJPY" },
  { id: "AUDUSD", base: "AUD", quote: "USD", twelveData: "AUD/USD", fmp: "AUDUSD" },
  { id: "USDCAD", base: "USD", quote: "CAD", twelveData: "USD/CAD", fmp: "USDCAD" },
  { id: "USDCHF", base: "USD", quote: "CHF", twelveData: "USD/CHF", fmp: "USDCHF" },
];
