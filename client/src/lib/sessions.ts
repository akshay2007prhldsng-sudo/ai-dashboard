// Market session clocks — computed from the real current time per exchange timezone.

export interface SessionInfo {
  name: string;
  status: "OPEN" | "PRE-MARKET" | "AFTER HOURS" | "CLOSED";
  detail: string; // e.g. "closes in 1h 58m" / "opens in 6h 58m"
}

interface SessionDef {
  name: string;
  tz: string;
  open: number; // minutes since local midnight
  close: number;
  pre?: number; // pre-market start
  after?: number; // after-hours end
}

const DEFS: SessionDef[] = [
  { name: "LONDON", tz: "Europe/London", open: 8 * 60, close: 16.5 * 60 },
  { name: "NEW YORK", tz: "America/New_York", open: 9.5 * 60, close: 16 * 60, pre: 4 * 60, after: 20 * 60 },
  { name: "SYDNEY", tz: "Australia/Sydney", open: 10 * 60, close: 16 * 60 },
  { name: "ASIA", tz: "Asia/Tokyo", open: 9 * 60, close: 15 * 60 },
];

function localMinutes(tz: string, d: Date): { minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "numeric", minute: "numeric", weekday: "short", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { minutes: Number(get("hour")) * 60 + Number(get("minute")), weekday: wdMap[get("weekday")] ?? 0 };
}

function fmtIn(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function sessionStatuses(now = new Date()): SessionInfo[] {
  return DEFS.map((def) => {
    const { minutes, weekday } = localMinutes(def.tz, now);
    const weekend = weekday === 0 || weekday === 6;
    if (weekend) return { name: def.name, status: "CLOSED", detail: "weekend" };
    if (minutes >= def.open && minutes < def.close) {
      return { name: def.name, status: "OPEN", detail: `closes in ${fmtIn(def.close - minutes)}` };
    }
    if (def.pre !== undefined && minutes >= def.pre && minutes < def.open) {
      return { name: def.name, status: "PRE-MARKET", detail: `opens in ${fmtIn(def.open - minutes)}` };
    }
    if (def.after !== undefined && minutes >= def.close && minutes < def.after) {
      return { name: def.name, status: "AFTER HOURS", detail: `closed ${fmtIn(minutes - def.close)} ago` };
    }
    const untilOpen = minutes < def.open ? def.open - minutes : 24 * 60 - minutes + def.open;
    return { name: def.name, status: "CLOSED", detail: `opens in ${fmtIn(untilOpen)}` };
  });
}
