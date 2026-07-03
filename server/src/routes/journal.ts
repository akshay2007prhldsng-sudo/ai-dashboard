import { Router } from "express";
import { getSettings, prisma } from "../db.js";
import { instrumentById } from "../instruments.js";

export const journalRouter = Router();

const PERIOD_DAYS: Record<string, number> = { WEEK: 7, MONTH: 30, QUARTER: 90, YEAR: 365, ALL: 3650 };

function periodStart(period: string): Date {
  return new Date(Date.now() - (PERIOD_DAYS[period] ?? 90) * 86_400_000);
}

/** Compute achieved R from entry/SL/pnl when not supplied. */
function computeR(t: { entry: number; stopLoss: number | null; pnl: number; size: number; instrument: string }): number | null {
  if (!t.stopLoss || !t.size) return null;
  const inst = instrumentById.get(t.instrument);
  const valuePerPoint = inst?.valuePerPoint ?? 1;
  const riskAmount = Math.abs(t.entry - t.stopLoss) * valuePerPoint * t.size;
  if (!riskAmount) return null;
  return Number((t.pnl / riskAmount).toFixed(2));
}

// ---- Trades CRUD ----

journalRouter.get("/trades", async (req, res) => {
  const period = String(req.query.period ?? "QUARTER");
  const account = req.query.account ? String(req.query.account) : undefined;
  const source = req.query.source ? String(req.query.source) : undefined;
  const trades = await prisma.trade.findMany({
    where: {
      openedAt: { gte: periodStart(period) },
      ...(account && account !== "ALL" ? { account } : {}),
      ...(source && source !== "ALL" ? { source } : {}),
    },
    orderBy: { openedAt: "desc" },
  });
  res.json({ trades });
});

journalRouter.post("/trades", async (req, res) => {
  const b = req.body ?? {};
  if (!b.instrument || !b.direction || !b.entry || b.pnl === undefined) {
    res.status(400).json({ error: "instrument, direction, entry and pnl are required" });
    return;
  }
  const base = {
    instrument: String(b.instrument),
    direction: b.direction === "SHORT" ? "SHORT" : "LONG",
    openedAt: b.openedAt ? new Date(b.openedAt) : new Date(),
    closedAt: b.closedAt ? new Date(b.closedAt) : null,
    session: String(b.session ?? "LONDON"),
    account: String(b.account ?? "Default"),
    source: String(b.source ?? "Manual"),
    entry: Number(b.entry),
    stopLoss: b.stopLoss != null ? Number(b.stopLoss) : null,
    takeProfit: b.takeProfit != null ? Number(b.takeProfit) : null,
    size: Number(b.size ?? 1),
    pnl: Number(b.pnl),
    notes: String(b.notes ?? ""),
    emotion: String(b.emotion ?? ""),
    ruleRR: Boolean(b.ruleRR),
    ruleBreakEven: Boolean(b.ruleBreakEven),
    ruleRisk: Boolean(b.ruleRisk),
    isOpen: Boolean(b.isOpen),
  };
  const rMultiple = b.rMultiple != null ? Number(b.rMultiple) : computeR(base);
  const trade = await prisma.trade.create({ data: { ...base, rMultiple } });
  res.status(201).json({ trade });
});

journalRouter.put("/trades/:id", async (req, res) => {
  const existing = await prisma.trade.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "trade not found" }); return; }
  const b = req.body ?? {};
  const merged = { ...existing, ...b };
  const trade = await prisma.trade.update({
    where: { id: req.params.id },
    data: {
      ...b,
      openedAt: b.openedAt ? new Date(b.openedAt) : undefined,
      closedAt: b.closedAt ? new Date(b.closedAt) : undefined,
      rMultiple: b.rMultiple != null ? Number(b.rMultiple) : computeR(merged),
    },
  });
  res.json({ trade });
});

journalRouter.delete("/trades/:id", async (req, res) => {
  await prisma.trade.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

// ---- Settings ----

journalRouter.get("/settings", async (_req, res) => {
  res.json({ settings: await getSettings() });
});

journalRouter.put("/settings", async (req, res) => {
  const b = req.body ?? {};
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...b },
    update: b,
  });
  res.json({ settings });
});

// ---- Stats: KPIs, equity curve, heatmap, distributions, risk dashboard ----

journalRouter.get("/stats", async (req, res) => {
  const period = String(req.query.period ?? "QUARTER");
  const settings = await getSettings();
  const all = await prisma.trade.findMany({
    where: { openedAt: { gte: periodStart(period) } },
    orderBy: { openedAt: "asc" },
  });
  const closed = all.filter((t) => !t.isOpen);
  const open = all.filter((t) => t.isOpen);

  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const breakeven = closed.filter((t) => t.pnl === 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const netPnl = grossWin - grossLoss;

  // Equity curve
  let equity = 0;
  const equityCurve = closed.map((t) => {
    equity += t.pnl;
    return { t: (t.closedAt ?? t.openedAt).toISOString(), equity: Number(equity.toFixed(2)) };
  });

  // Daily P&L for heatmap + day-of-week
  const byDay = new Map<string, number>();
  for (const t of closed) {
    const day = (t.closedAt ?? t.openedAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + t.pnl);
  }
  const heatmap = [...byDay.entries()].map(([date, pnl]) => ({ date, pnl: Number(pnl.toFixed(2)) }));

  const dow = [0, 0, 0, 0, 0, 0, 0];
  for (const [date, pnl] of byDay.entries()) dow[new Date(date + "T12:00:00Z").getUTCDay()] += pnl;
  const pnlByDayOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
    label,
    pnl: Number(dow[(i + 1) % 7].toFixed(2)),
  }));

  // R-based metrics
  const rTrades = closed.filter((t) => t.rMultiple != null);
  const expectancy = rTrades.length ? rTrades.reduce((s, t) => s + (t.rMultiple as number), 0) / rTrades.length : null;
  const rBuckets = new Map<string, number>();
  for (const t of rTrades) {
    const r = t.rMultiple as number;
    const bucket = r <= -2 ? "≤-2R" : r < -1 ? "-2..-1R" : r < 0 ? "-1..0R" : r < 1 ? "0..1R" : r < 2 ? "1..2R" : r < 3 ? "2..3R" : "≥3R";
    rBuckets.set(bucket, (rBuckets.get(bucket) ?? 0) + 1);
  }
  const rDistribution = ["≤-2R", "-2..-1R", "-1..0R", "0..1R", "1..2R", "2..3R", "≥3R"].map((bucket) => ({
    bucket,
    count: rBuckets.get(bucket) ?? 0,
  }));

  // Rule adherence + trade quality radar
  const pct = (n: number) => (closed.length ? (n / closed.length) * 100 : 0);
  const ruleAdherence = {
    rr: pct(closed.filter((t) => t.ruleRR).length),
    breakEven: pct(closed.filter((t) => t.ruleBreakEven).length),
    risk1R: pct(closed.filter((t) => t.ruleRisk).length),
    violations: closed.filter((t) => !(t.ruleRR && t.ruleBreakEven && t.ruleRisk)).length,
  };
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const to10 = (x: number) => Number(Math.max(0, Math.min(10, x)).toFixed(1));
  const quality = {
    axes: [
      { axis: "Entry Timing", score: to10(winRate / 10) },
      { axis: "Exit Timing", score: to10(expectancy != null ? 5 + expectancy * 2.5 : 5) },
      { axis: "Risk Mgmt", score: to10(ruleAdherence.risk1R / 10) },
      { axis: "Discipline", score: to10(((ruleAdherence.rr + ruleAdherence.breakEven + ruleAdherence.risk1R) / 3) / 10) },
      { axis: "Patience", score: to10(ruleAdherence.rr / 10) },
      { axis: "Execution", score: to10(avgLoss ? Math.min(10, (avgWin / avgLoss) * 3.3) : 5) },
    ],
  };
  const qualityScore = to10(quality.axes.reduce((s, a) => s + a.score, 0) / quality.axes.length);

  // Risk dashboard (daily/weekly drawdown vs limits)
  const todayIso = new Date().toISOString().slice(0, 10);
  const dailyPnl = byDay.get(todayIso) ?? 0;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
  const weeklyPnl = closed
    .filter((t) => (t.closedAt ?? t.openedAt) >= new Date(weekStart.toISOString().slice(0, 10)))
    .reduce((s, t) => s + t.pnl, 0);
  const dailyLimitAmount = (settings.dailyLossLimit / 100) * settings.accountSize;
  const weeklyLimitAmount = (settings.weeklyLossLimit / 100) * settings.accountSize;
  const risk = {
    dailyPnl: Number(dailyPnl.toFixed(2)),
    weeklyPnl: Number(weeklyPnl.toFixed(2)),
    dailyLimitAmount,
    weeklyLimitAmount,
    dailyBreached: dailyPnl <= -dailyLimitAmount,
    weeklyBreached: weeklyPnl <= -weeklyLimitAmount,
    openPositions: open.length,
    maxOpenPositions: settings.maxOpenPositions,
    riskPerTradeAmount: (settings.riskPct / 100) * settings.accountSize,
  };

  res.json({
    period,
    kpis: {
      netPnl: Number(netPnl.toFixed(2)),
      profitFactor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : wins.length ? null : 0,
      winRate: Number(winRate.toFixed(1)),
      wins: wins.length,
      losses: losses.length,
      breakeven: breakeven.length,
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      avgWinLossRatio: avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : null,
      expectancyR: expectancy != null ? Number(expectancy.toFixed(2)) : null,
      totalTrades: closed.length,
    },
    equityCurve,
    heatmap,
    pnlByDayOfWeek,
    rDistribution,
    ruleAdherence,
    quality: { ...quality, score: qualityScore },
    risk,
    timestamp: Date.now(),
  });
});

// ---- Psychology analytics: emotion performance, discipline trend, tilt flags ----

journalRouter.get("/psychology", async (req, res) => {
  const period = String(req.query.period ?? "QUARTER");
  const trades = await prisma.trade.findMany({
    where: { openedAt: { gte: periodStart(period) }, isOpen: false },
    orderBy: { openedAt: "asc" },
  });

  // Per-emotion aggregation.
  const emoMap = new Map<string, { count: number; pnl: number; wins: number; rSum: number; rN: number }>();
  for (const t of trades) {
    const e = t.emotion?.trim() || "Untagged";
    const cur = emoMap.get(e) ?? { count: 0, pnl: 0, wins: 0, rSum: 0, rN: 0 };
    cur.count += 1;
    cur.pnl += t.pnl;
    if (t.pnl > 0) cur.wins += 1;
    if (t.rMultiple != null) { cur.rSum += t.rMultiple; cur.rN += 1; }
    emoMap.set(e, cur);
  }
  const emotions = [...emoMap.entries()]
    .map(([emotion, v]) => ({
      emotion,
      count: v.count,
      pnl: Number(v.pnl.toFixed(2)),
      winRate: v.count ? Number(((v.wins / v.count) * 100).toFixed(1)) : 0,
      avgR: v.rN ? Number((v.rSum / v.rN).toFixed(2)) : null,
    }))
    .sort((a, b) => b.count - a.count);

  // Discipline trend: rolling rule-adherence % over the trade sequence (window 5).
  const disciplineTrend: { t: string; discipline: number; pnl: number }[] = [];
  const win = 5;
  for (let i = 0; i < trades.length; i++) {
    const slice = trades.slice(Math.max(0, i - win + 1), i + 1);
    const adhered = slice.filter((t) => t.ruleRR && t.ruleBreakEven && t.ruleRisk).length;
    disciplineTrend.push({
      t: (trades[i].closedAt ?? trades[i].openedAt).toISOString(),
      discipline: Number(((adhered / slice.length) * 100).toFixed(0)),
      pnl: trades[i].pnl,
    });
  }

  // Tilt / behavioural flags.
  const flags: string[] = [];
  let maxLossStreak = 0, cur = 0;
  for (const t of trades) {
    if (t.pnl < 0) { cur += 1; maxLossStreak = Math.max(maxLossStreak, cur); } else cur = 0;
  }
  if (maxLossStreak >= 3) flags.push(`Longest losing streak: ${maxLossStreak} trades — watch for tilt after consecutive losses.`);
  const byEmotion = new Map(emotions.map((e) => [e.emotion, e]));
  const revenge = byEmotion.get("Revenge");
  if (revenge && revenge.pnl < 0) flags.push(`"Revenge"-tagged trades are net ${revenge.pnl.toFixed(0)} over ${revenge.count} trades — a costly pattern.`);
  const fomo = byEmotion.get("FOMO");
  if (fomo && fomo.winRate < 40) flags.push(`FOMO entries win only ${fomo.winRate}% of the time — likely chasing.`);
  const disciplined = byEmotion.get("Disciplined");
  if (disciplined && disciplined.pnl > 0) flags.push(`"Disciplined" trades are your most profitable emotional state (+${disciplined.pnl.toFixed(0)}).`);
  // Rule-violation trades vs clean trades P&L comparison.
  const clean = trades.filter((t) => t.ruleRR && t.ruleBreakEven && t.ruleRisk);
  const violated = trades.filter((t) => !(t.ruleRR && t.ruleBreakEven && t.ruleRisk));
  const cleanPnl = clean.reduce((s, t) => s + t.pnl, 0);
  const violatedPnl = violated.reduce((s, t) => s + t.pnl, 0);
  if (violated.length && violatedPnl < cleanPnl && clean.length) {
    flags.push(`Rule-following trades net ${cleanPnl.toFixed(0)} vs ${violatedPnl.toFixed(0)} when rules were broken.`);
  }

  const disciplineScore = trades.length
    ? Number(((clean.length / trades.length) * 100).toFixed(0))
    : null;

  res.json({
    period,
    totalTrades: trades.length,
    disciplineScore,
    emotions,
    disciplineTrend,
    flags,
    cleanVsViolated: {
      clean: { count: clean.length, pnl: Number(cleanPnl.toFixed(2)) },
      violated: { count: violated.length, pnl: Number(violatedPnl.toFixed(2)) },
    },
    timestamp: Date.now(),
  });
});
