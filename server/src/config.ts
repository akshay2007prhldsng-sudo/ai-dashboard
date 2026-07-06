import dotenv from "dotenv";
dotenv.config();

// No data-API keys: prices, news and the calendar are scraped keyless.
// The only key is the Anthropic key that powers the analysis agents.
export const config = {
  port: Number(process.env.PORT ?? 4000),
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
  traderName: process.env.TRADER_NAME ?? "Trader",
};
