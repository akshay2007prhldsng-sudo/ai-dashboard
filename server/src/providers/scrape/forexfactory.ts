// Keyless economic calendar via ForexFactory's public weekly JSON feed (the same
// data the FF calendar page renders). No API key. Returns events in [from, to].

import type { EconomicEvent } from "../types.js";

const FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

function impactOf(v: unknown): EconomicEvent["impact"] {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("high")) return "High";
  if (s.includes("medium")) return "Medium";
  return "Low";
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[%,]/g, "").replace(/([\d.])([kmb])$/i, "$1"));
  return Number.isFinite(n) ? n : null;
}

export async function fetchFFCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  const res = await fetch(FF_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; APfxHybridDash/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`ForexFactory HTTP ${res.status}`);
  const arr = (await res.json()) as any[];
  if (!Array.isArray(arr)) throw new Error("ForexFactory: unexpected payload");
  const lo = Date.parse(`${from}T00:00:00Z`);
  const hi = Date.parse(`${to}T23:59:59Z`);
  return arr
    .map((e, i) => {
      const date = new Date(e.date);
      const currency = String(e.country ?? e.currency ?? "").toUpperCase();
      return {
        id: `ff-${i}-${e.title}`,
        title: String(e.title ?? ""),
        country: currency,
        currency,
        date: date.toISOString(),
        impact: impactOf(e.impact),
        actual: num(e.actual),
        forecast: num(e.forecast),
        previous: num(e.previous),
        provider: "forexfactory",
      } satisfies EconomicEvent;
    })
    .filter((ev) => {
      const t = Date.parse(ev.date);
      return ev.title && Number.isFinite(t) && t >= lo && t <= hi;
    });
}
