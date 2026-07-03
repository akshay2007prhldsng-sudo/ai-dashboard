import { Router } from "express";
import { prisma } from "../db.js";

export const communityRouter = Router();

// Seed a starter set the first time the board is opened, so it isn't empty.
const SEED = [
  { symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", category: "fx", description: "Kiwi cross — RBNZ policy divergence plays.", votes: 12 },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", category: "fx", description: "Safe-haven franc; SNB intervention risk.", votes: 9 },
  { symbol: "ETHUSD", name: "Ethereum / US Dollar", category: "crypto", description: "Second-largest crypto; ETF flow sensitivity.", votes: 21 },
  { symbol: "NATGAS", name: "Natural Gas", category: "energy", description: "Weather-driven volatility, strong intraday ranges.", votes: 7 },
  { symbol: "DE40", name: "DAX 40 Index", category: "index", description: "German blue-chips; overlaps London session.", votes: 15 },
];

async function ensureSeed() {
  const count = await prisma.communityProposal.count();
  if (count === 0) {
    await prisma.communityProposal.createMany({ data: SEED });
  }
}

communityRouter.get("/", async (_req, res) => {
  await ensureSeed();
  const proposals = await prisma.communityProposal.findMany({
    orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
  });
  res.json({ proposals });
});

communityRouter.post("/", async (req, res) => {
  const b = req.body ?? {};
  const symbol = String(b.symbol ?? "").trim().toUpperCase();
  if (!symbol) { res.status(400).json({ error: "symbol required" }); return; }
  const existing = await prisma.communityProposal.findUnique({ where: { symbol } });
  if (existing) {
    // Proposing an existing pair counts as a vote for it.
    const proposal = await prisma.communityProposal.update({
      where: { symbol },
      data: { votes: { increment: 1 } },
    });
    res.json({ proposal, alreadyExisted: true });
    return;
  }
  const proposal = await prisma.communityProposal.create({
    data: {
      symbol,
      name: String(b.name ?? symbol),
      category: String(b.category ?? "fx"),
      description: String(b.description ?? ""),
      votes: 1,
    },
  });
  res.status(201).json({ proposal });
});

communityRouter.post("/:id/vote", async (req, res) => {
  const dir = req.body?.direction === "down" ? -1 : 1;
  const proposal = await prisma.communityProposal
    .update({ where: { id: req.params.id }, data: { votes: { increment: dir } } })
    .catch(() => null);
  if (!proposal) { res.status(404).json({ error: "proposal not found" }); return; }
  res.json({ proposal });
});
