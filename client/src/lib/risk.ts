// Position-size calculator — contract/pip specs per instrument.
// valuePerPoint = account-currency value of a 1.0 price-unit move for 1 lot/contract.

export interface ContractSpec {
  id: string;
  label: string;
  unit: "lots" | "contracts";
  valuePerPoint: number;
  tick: number;
  note: string;
}

export const CONTRACT_SPECS: ContractSpec[] = [
  { id: "US100", label: "NQ (NASDAQ 100)", unit: "contracts", valuePerPoint: 20, tick: 0.25, note: "$20/point · $5/tick (NQ)" },
  { id: "SPX", label: "ES (S&P 500)", unit: "contracts", valuePerPoint: 50, tick: 0.25, note: "$50/point · $12.50/tick (ES)" },
  { id: "XAUUSD", label: "Gold (XAUUSD)", unit: "lots", valuePerPoint: 100, tick: 0.01, note: "$1 per 0.01 move per lot (100 oz)" },
  { id: "EURUSD", label: "EURUSD", unit: "lots", valuePerPoint: 100000, tick: 0.0001, note: "$10/pip per standard lot" },
  { id: "GBPUSD", label: "GBPUSD", unit: "lots", valuePerPoint: 100000, tick: 0.0001, note: "$10/pip per standard lot" },
  { id: "BTCUSD", label: "BTCUSD", unit: "contracts", valuePerPoint: 1, tick: 0.1, note: "$1/point per unit" },
  { id: "USOIL", label: "WTI (US Oil)", unit: "lots", valuePerPoint: 1000, tick: 0.01, note: "1,000 bbl per lot" },
];

export interface SizeResult {
  riskAmount: number;
  stopDistance: number;
  size: number;
  unit: string;
  rewardAt2R: number;
  rewardAt3R: number;
  breakEvenTrigger: number; // price at which to move SL to BE (1.5R)
}

export function positionSize(opts: {
  accountSize: number;
  riskPct: number;
  entry: number;
  stopLoss: number;
  specId: string;
  direction: "LONG" | "SHORT";
}): SizeResult | null {
  const spec = CONTRACT_SPECS.find((s) => s.id === opts.specId);
  if (!spec || !opts.entry || !opts.stopLoss || opts.entry === opts.stopLoss) return null;
  const riskAmount = (opts.riskPct / 100) * opts.accountSize;
  const stopDistance = Math.abs(opts.entry - opts.stopLoss);
  const rawSize = riskAmount / (stopDistance * spec.valuePerPoint);
  const size = spec.unit === "contracts" ? Math.max(0, Math.floor(rawSize * 100) / 100) : Number(rawSize.toFixed(2));
  const dir = opts.direction === "LONG" ? 1 : -1;
  return {
    riskAmount,
    stopDistance,
    size,
    unit: spec.unit,
    rewardAt2R: riskAmount * 2,
    rewardAt3R: riskAmount * 3,
    breakEvenTrigger: opts.entry + dir * stopDistance * 1.5,
  };
}
