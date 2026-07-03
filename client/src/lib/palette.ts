// Categorical series palette — validated for the dark card surface (#0E1512)
// with the dataviz six-checks validator (lightness band, chroma, CVD ΔE, contrast).
// Fixed assignment order: color follows the entity, never its rank.
export const SERIES = ["#059669", "#3B82F6", "#D97706", "#8B5CF6", "#EC4899", "#EA580C", "#0891B2"] as const;

export const CURRENCY_COLORS: Record<string, string> = {
  USD: SERIES[0],
  EUR: SERIES[1],
  GBP: SERIES[2],
  JPY: SERIES[3],
  AUD: SERIES[4],
  CAD: SERIES[5],
  CHF: SERIES[6],
};

export const BASKET_COLORS: Record<string, string> = {
  US30: SERIES[0],
  DXY: SERIES[1],
  US10Y: SERIES[2],
  VIX: SERIES[3],
};

export const TOKENS = {
  bull: "#22C55E",
  bear: "#EF4444",
  accent: "#10B981",
  accentBright: "#34D399",
  amber: "#F59E0B",
  violet: "#8B5CF6",
  sky: "#38BDF8",
  neutral: "#64748B",
  grid: "#272E38",
  ink: "#E8ECF2",
  muted: "#8B95A3",
  card: "#13171C",
};
