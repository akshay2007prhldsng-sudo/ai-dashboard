import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BiasResult, Briefing, CandleSeries, CoachingReport, EconomicEvent, EdgeResult,
  InstrumentMeta, JournalStats, NewsItem, Quote, Settings, Trade,
} from "./types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.reason ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error ?? b.reason ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- market ----

export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => get<{ traderName: string; instruments: InstrumentMeta[] }>("/api/market/meta"),
    staleTime: Infinity,
  });
}

export function useQuotes(ids?: string[]) {
  const qs = ids?.length ? `?ids=${ids.join(",")}` : "";
  return useQuery({
    queryKey: ["quotes", ids?.join(",") ?? "all"],
    queryFn: () => get<{ quotes: Record<string, Quote | null>; timestamp: number }>(`/api/market/quotes${qs}`),
    refetchInterval: 60_000,
  });
}

export function useCandles(id: string, interval: "5min" | "1h" | "1day", points = 60) {
  return useQuery({
    queryKey: ["candles", id, interval, points],
    queryFn: () => get<CandleSeries>(`/api/market/candles/${id}?interval=${interval}&points=${points}`),
    refetchInterval: 120_000,
    retry: 1,
  });
}

export function useCapitalFlow() {
  return useQuery({
    queryKey: ["capital-flow"],
    queryFn: () => get<{ rows: { id: string; changePct: number | null }[]; timestamp: number }>("/api/market/capital-flow"),
    refetchInterval: 90_000,
  });
}

export function useCurrencyStrength() {
  return useQuery({
    queryKey: ["currency-strength"],
    queryFn: () =>
      get<{ currencies: string[]; points: Record<string, number>[]; timestamp: number }>("/api/market/currency-strength"),
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}

export function useRelativeStrength() {
  return useQuery({
    queryKey: ["relative-strength"],
    queryFn: () =>
      get<{ series: { id: string; points: { t: number; v: number }[] }[]; timestamp: number }>("/api/market/relative-strength"),
    refetchInterval: 5 * 60_000,
  });
}

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: () => get<{ items: NewsItem[]; timestamp: number }>("/api/news"),
    refetchInterval: 90_000,
  });
}

export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["calendar", from, to],
    queryFn: () => get<{ events: EconomicEvent[]; timestamp: number }>(`/api/calendar?from=${from}&to=${to}`),
    refetchInterval: 10 * 60_000,
  });
}

// ---- AI ----

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: () => get<{ available: boolean }>("/api/ai/status"),
    staleTime: Infinity,
  });
}

export function useBias(instrument: string, enabled = true) {
  return useQuery({
    queryKey: ["ai-bias", instrument],
    queryFn: () => send<BiasResult>("POST", "/api/ai/bias", { instrument }),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useEdge(instrument: string) {
  return useQuery({
    queryKey: ["ai-edge", instrument],
    queryFn: () => send<EdgeResult>("POST", "/api/ai/edge-factor", { instrument }),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useBriefing() {
  return useQuery({
    queryKey: ["ai-briefing"],
    queryFn: () => send<Briefing>("POST", "/api/ai/briefing"),
    staleTime: 30 * 60_000,
    retry: false,
  });
}

export function useEventAnalysis(event: EconomicEvent | null) {
  return useQuery({
    queryKey: ["ai-event", event?.id],
    queryFn: () => send<{ analysis: string; confidence: number }>("POST", "/api/ai/calendar-event", { event }),
    enabled: Boolean(event),
    staleTime: 30 * 60_000,
    retry: false,
  });
}

export function useCoaching() {
  return useMutation({
    mutationFn: (period: string) => send<CoachingReport>("POST", "/api/ai/coaching", { period }),
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["ai-reports"],
    queryFn: () => get<{ reports: CoachingReport[] }>("/api/ai/reports"),
  });
}

// ---- journal ----

export function useTrades(period: string, account: string, source: string) {
  return useQuery({
    queryKey: ["trades", period, account, source],
    queryFn: () => get<{ trades: Trade[] }>(`/api/journal/trades?period=${period}&account=${account}&source=${source}`),
  });
}

export function useJournalStats(period: string) {
  return useQuery({
    queryKey: ["journal-stats", period],
    queryFn: () => get<JournalStats>(`/api/journal/stats?period=${period}`),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => get<{ settings: Settings }>("/api/journal/settings"),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Partial<Settings>) => send("PUT", "/api/journal/settings", s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["journal-stats"] });
    },
  });
}

export function useAddTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: Partial<Trade>) => send("POST", "/api/journal/trades", t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["journal-stats"] });
    },
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => send("DELETE", `/api/journal/trades/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["journal-stats"] });
    },
  });
}
