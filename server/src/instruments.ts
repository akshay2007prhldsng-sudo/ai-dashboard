// The 16 markets covered by APfx HybridDash, with per-provider symbol mappings
// and contract specs for the position-size calculator.

export type InstrumentCategory = "fx" | "metal" | "index" | "crypto" | "energy";

export interface Instrument {
  id: string; // canonical id used across the app, e.g. "US100"
  name: string; // full display name
  category: InstrumentCategory;
  base?: string; // base currency for FX strength calc
  quote?: string;
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
  { id: "XAUUSD", name: "Gold / US Dollar", category: "metal", quote: "USD", twelveData: "XAU/USD", finnhub: "OANDA:XAU_USD", fmp: "XAUUSD", valuePerPoint: 100, tick: 0.01, primary: true },
  { id: "XAGUSD", name: "Silver / US Dollar", category: "metal", quote: "USD", twelveData: "XAG/USD", finnhub: "OANDA:XAG_USD", fmp: "XAGUSD", valuePerPoint: 5000, tick: 0.001 },
  { id: "EURUSD", name: "Euro / US Dollar", category: "fx", base: "EUR", quote: "USD", twelveData: "EUR/USD", finnhub: "OANDA:EUR_USD", fmp: "EURUSD", valuePerPoint: 100000, tick: 0.00001 },
  { id: "GBPUSD", name: "British Pound / US Dollar", category: "fx", base: "GBP", quote: "USD", twelveData: "GBP/USD", finnhub: "OANDA:GBP_USD", fmp: "GBPUSD", valuePerPoint: 100000, tick: 0.00001 },
  { id: "USDJPY", name: "US Dollar / Japanese Yen", category: "fx", base: "USD", quote: "JPY", twelveData: "USD/JPY", finnhub: "OANDA:USD_JPY", fmp: "USDJPY", valuePerPoint: 700, tick: 0.001 },
  { id: "EURJPY", name: "Euro / Japanese Yen", category: "fx", base: "EUR", quote: "JPY", twelveData: "EUR/JPY", finnhub: "OANDA:EUR_JPY", fmp: "EURJPY", valuePerPoint: 700, tick: 0.001 },
  { id: "GBPJPY", name: "British Pound / Japanese Yen", category: "fx", base: "GBP", quote: "JPY", twelveData: "GBP/JPY", finnhub: "OANDA:GBP_JPY", fmp: "GBPJPY", valuePerPoint: 700, tick: 0.001 },
  { id: "GBPEUR", name: "British Pound / Euro", category: "fx", base: "GBP", quote: "EUR", twelveData: "GBP/EUR", finnhub: "OANDA:GBP_EUR", fmp: "GBPEUR", valuePerPoint: 100000, tick: 0.00001 },
  { id: "EURGBP", name: "Euro / British Pound", category: "fx", base: "EUR", quote: "GBP", twelveData: "EUR/GBP", finnhub: "OANDA:EUR_GBP", fmp: "EURGBP", valuePerPoint: 100000, tick: 0.00001 },
  { id: "AUDUSD", name: "Australian Dollar / US Dollar", category: "fx", base: "AUD", quote: "USD", twelveData: "AUD/USD", finnhub: "OANDA:AUD_USD", fmp: "AUDUSD", valuePerPoint: 100000, tick: 0.00001 },
  { id: "USDCAD", name: "US Dollar / Canadian Dollar", category: "fx", base: "USD", quote: "CAD", twelveData: "USD/CAD", finnhub: "OANDA:USD_CAD", fmp: "USDCAD", valuePerPoint: 75000, tick: 0.00001 },
  { id: "US30", name: "Dow Jones 30 Index", category: "index", quote: "USD", twelveData: "DJI", fmp: "^DJI", valuePerPoint: 5, tick: 1 },
  { id: "US100", name: "NASDAQ 100 Index (NQ)", category: "index", quote: "USD", twelveData: "NDX", fmp: "^NDX", valuePerPoint: 20, tick: 0.25, primary: true },
  { id: "SPX", name: "S&P 500 Index (ES)", category: "index", quote: "USD", twelveData: "SPX", fmp: "^GSPC", valuePerPoint: 50, tick: 0.25, primary: true },
  { id: "BTCUSD", name: "Bitcoin / US Dollar", category: "crypto", quote: "USD", twelveData: "BTC/USD", finnhub: "BINANCE:BTCUSDT", fmp: "BTCUSD", valuePerPoint: 1, tick: 0.1 },
  { id: "UKOIL", name: "Brent Crude Oil", category: "energy", quote: "USD", twelveData: "XBR/USD", fmp: "BZUSD", valuePerPoint: 1000, tick: 0.01 },
];

export const instrumentById = new Map(INSTRUMENTS.map((i) => [i.id, i]));

// Extra market-context symbols (not tradable instruments in the app, but used
// for capital flow / relative strength baskets).
export const CONTEXT_SYMBOLS: Instrument[] = [
  { id: "VIX", name: "CBOE Volatility Index", category: "index", twelveData: "VIX", fmp: "^VIX", valuePerPoint: 1, tick: 0.01 },
  { id: "DXY", name: "US Dollar Index", category: "index", twelveData: "DXY", fmp: "DX-Y.NYB", valuePerPoint: 1, tick: 0.01 },
  { id: "US10Y", name: "US 10Y Treasury Yield", category: "index", twelveData: "TNX", fmp: "^TNX", valuePerPoint: 1, tick: 0.01 },
  { id: "COPPER", name: "Copper", category: "metal", twelveData: "XCU/USD", fmp: "HGUSD", valuePerPoint: 1, tick: 0.001 },
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
