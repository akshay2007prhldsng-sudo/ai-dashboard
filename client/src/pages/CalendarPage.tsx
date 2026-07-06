import { useEffect, useMemo, useRef, useState } from "react";
import { AiTag, Card, LiveBadge, SectionTitle, Spinner, Unavailable } from "../components/ui";
import { useAiStatus, useCalendar, useEventAnalysis } from "../lib/api";
import type { EconomicEvent } from "../lib/types";

const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY"];
const IMPACTS = ["High", "Medium", "Low"] as const;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const impactStyles: Record<string, string> = {
  High: "text-bear bg-bear/10 border-bear/30",
  Medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  Low: "text-ink-muted bg-card-alt border-card-border",
};

function EventCard({ event, aiOn }: { event: EconomicEvent; aiOn: boolean }) {
  const [wanted, setWanted] = useState(false);
  const analysis = useEventAnalysis(wanted && aiOn ? event : null);
  const time = new Date(event.date);
  return (
    <Card className="!p-3">
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span className="text-ink-muted">
          {time.toLocaleDateString("en-GB", { month: "short", day: "2-digit" })},{" "}
          {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}
        </span>
        {event.currency && (
          <span className="font-semibold text-ink bg-card-alt border border-card-border rounded px-1.5">{event.currency}</span>
        )}
        <span className={`font-semibold rounded px-1.5 border ${impactStyles[event.impact]}`}>{event.impact}</span>
      </div>
      <p className="text-xs font-semibold text-ink mt-1.5">{event.title}</p>

      {(event.actual !== null || event.forecast !== null || event.previous !== null) && (
        <div className="flex gap-3 text-[10px] text-ink-muted mt-1.5">
          {event.actual !== null && <span>Actual: <span className="text-ink font-medium">{event.actual}</span></span>}
          {event.forecast !== null && <span>Forecast: <span className="text-ink font-medium">{event.forecast}</span></span>}
          {event.previous !== null && <span>Previous: <span className="text-ink font-medium">{event.previous}</span></span>}
        </div>
      )}

      {aiOn && !wanted && (
        <button onClick={() => setWanted(true)} className="text-[10px] text-accent-bright mt-2 hover:underline">
          ✦ AI analysis
        </button>
      )}
      {wanted && (
        <div className="mt-2 rounded-lg bg-card-alt border border-card-border p-2">
          <AiTag />
          {analysis.data ? (
            <>
              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">{analysis.data.analysis}</p>
              <p className="text-[10px] text-ink mt-1.5">
                Confidence: <span className="font-semibold">{analysis.data.confidence}%</span>
              </p>
            </>
          ) : analysis.isLoading ? (
            <p className="text-[10px] text-ink-muted mt-1 animate-pulse">Analysing…</p>
          ) : (
            <p className="text-[10px] text-ink-muted mt-1">
              {analysis.error instanceof Error ? analysis.error.message : "unavailable"}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function CalendarPage() {
  const [day, setDay] = useState<"today" | "tomorrow" | "custom">("today");
  const [customDate, setCustomDate] = useState(iso(new Date()));
  const [currencyFilter, setCurrencyFilter] = useState<string[]>([]);
  const [impactFilter, setImpactFilter] = useState<string[]>([]);
  const { data: ai } = useAiStatus();

  const date = useMemo(() => {
    if (day === "today") return iso(new Date());
    if (day === "tomorrow") return iso(new Date(Date.now() + 86_400_000));
    return customDate;
  }, [day, customDate]);

  const { data, isLoading } = useCalendar(date, date);

  const events = useMemo(() => {
    let list = data?.events ?? [];
    if (currencyFilter.length) list = list.filter((e) => currencyFilter.includes(e.currency));
    if (impactFilter.length) list = list.filter((e) => impactFilter.includes(e.impact));
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [data, currencyFilter, impactFilter]);

  // Live "now" marker
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const idt = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(idt);
  }, []);
  const nowRef = useRef<HTMLDivElement>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Group events by hour for the timeline
  const byHour = useMemo(() => {
    const groups = new Map<number, EconomicEvent[]>();
    for (const e of events) {
      const h = Number(
        new Date(e.date).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/London" })
      );
      if (!groups.has(h)) groups.set(h, []);
      groups.get(h)!.push(e);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [events]);

  const nowHour =
    Number(now.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/London" })) +
    now.getMinutes() / 60;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-accent-bright tracking-tight">Calendar</h1>
        <p className="text-sm text-ink-muted mt-1">Market-moving events and AI analysis</p>
      </div>

      <Card className="!py-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex gap-1">
          {(["today", "tomorrow", "custom"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`rounded-full px-3 py-1 font-medium capitalize border transition-colors ${
                day === d ? "bg-accent text-app border-accent" : "text-ink-muted border-card-border hover:text-ink"
              }`}
            >
              {d === "custom" ? "Custom Date" : d}
            </button>
          ))}
          {day === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-card-alt border border-card-border rounded-lg px-2 text-ink text-xs"
            />
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          <span className="text-ink-muted mr-1">Currency</span>
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle(currencyFilter, setCurrencyFilter, c)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors ${
                currencyFilter.includes(c) ? "bg-accent/20 text-accent-bright border-accent/40" : "text-ink-muted border-card-border"
              }`}
            >
              {c}
            </button>
          ))}
          <span className="text-ink-muted ml-3 mr-1">Impact</span>
          {IMPACTS.map((i) => (
            <button
              key={i}
              onClick={() => toggle(impactFilter, setImpactFilter, i)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors ${
                impactFilter.includes(i) ? impactStyles[i] : "text-ink-muted border-card-border"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : byHour.length ? (
        <div className="space-y-4">
          {byHour.map(([hour, evs]) => (
            <div key={hour} className="flex gap-3">
              <div className="w-14 shrink-0 pt-1 text-right">
                <p className="text-xs font-mono text-ink-muted">{String(hour).padStart(2, "0")}:00</p>
                {day === "today" && Math.floor(nowHour) === hour && (
                  <div ref={nowRef} className="mt-1 flex items-center justify-end gap-1">
                    <span className="text-[9px] font-mono text-accent-bright">
                      {now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour12: false })}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 border-l border-card-border pl-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {evs.map((e) => (
                  <EventCard key={e.id} event={e} aiOn={ai?.available === true} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <SectionTitle title="No events" right={<LiveBadge label="Calendar" />} />
          <Unavailable what={data ? "no events match the filters — calendar data" : "calendar data"} />
          <p className="text-[10px] text-ink-muted mt-2">
            The calendar is scraped from ForexFactory's public feed — if it stays empty, that source may be unreachable from your network.
          </p>
        </Card>
      )}
    </div>
  );
}
