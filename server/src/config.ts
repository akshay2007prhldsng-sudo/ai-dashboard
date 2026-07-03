import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  twelveDataKey: process.env.TWELVEDATA_API_KEY ?? "",
  finnhubKey: process.env.FINNHUB_API_KEY ?? "",
  fmpKey: process.env.FMP_API_KEY ?? "",
  marketauxKey: process.env.MARKETAUX_API_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
  traderName: process.env.TRADER_NAME ?? "Trader",
};
