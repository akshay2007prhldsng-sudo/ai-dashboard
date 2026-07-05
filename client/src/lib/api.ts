import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgentState, BiasResult, Briefing, CandleSeries, CoachingReport, CommunityProposal, EconomicEvent,
  EdgeResult, InstrumentMeta, JournalStats, NewsItem, Psychology, PsychologyInsight, Quote, Settings, Trade,
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

// News now comes from the scheduled Global Macro Agent (one web search per
// cycle) instead of polling a provider — no duplicate web searches.
export function useNews() {
  const q = useAgentState();
  const macro = q.data?.macro;
  const items: NewsItem[] = (macro?.majorNews ?? []).map((n, i) => ({
    id: `macro-news-${i}-${n.url || n.headline}`,
    headline: n.headline,
    source: n.source ?? "web",
    url: n.url ?? "",
    publishedAt: new Date((macro?.timestamp ?? Date.now()) - (Number(n.minutesAgo) || 0) * 60_000).toISOString(),
    category: "general",
    summary: n.sentiment ? `Sentiment: ${n.sentiment}` : undefined,
  }));
  return {
    data: macro ? { items, timestamp: macro.timestamp } : undefined,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["calendar", from, to],
    queryFn: () => get<{ events: EconomicEvent[]; timestamp: number }>(`/api/calendar?from=${from}&to=${to}`),
    refetchInterval: 10 * 60_000,
  });
}

// ---- Scheduled agent system ----

/** Poll the server-side cycle cache (macro + all pair analyses). Light + cheap. */
export function useAgentState() {
  return useQuery({
    queryKey: ["agent-state"],
    queryFn: () => get<AgentState>("/api/agents/state"),
    refetchInterval: 15_000,
  });
}

export function useRefreshNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => send<{ started: boolean; running: boolean }>("POST", "/api/agents/refresh"),
    onSuccess: () => {
      // Give the cycle a moment to flip to running, then keep the state fresh.
      setTimeout(() => qc.invalidateQueries({ queryKey: ["agent-state"] }), 1500);
    },
  });
}

function pendingError(s: AgentState | undefined, has: boolean): Error | null {
  if (has) return null;
  if (!s) return null;
  if (s.status === "error" && s.error) return new Error(s.error);
  if (s.running || s.status === "idle" || s.completedAt === null) {
    return new Error("Awaiting first analysis cycle — refreshes every 15 min");
  }
  return new Error("Analysis unavailable — no data to interpret this cycle");
}

// ---- AI (derived from the cached agent cycle — no AI calls from the frontend) ----

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: () => get<{ available: boolean }>("/api/ai/status"),
    staleTime: Infinity,
  });
}

export function useBias(instrument: string) {
  const q = useAgentState();
  const p = q.data?.pairs?.[instrument] ?? null;
  const data: BiasResult | undefined = p
    ? { instrument, bias: p.bias, confidence: p.confidence, analysis: p.analysis, drivers: p.drivers, timestamp: p.timestamp }
    : undefined;
  return {
    data,
    isLoading: q.isLoading || (!p && q.data?.running === true),
    error: q.error ?? pendingError(q.data, Boolean(p)),
  };
}

export function useEdge(instrument: string) {
  const q = useAgentState();
  const p = q.data?.pairs?.[instrument] ?? null;
  const data: EdgeResult | undefined = p
    ? {
        instrument,
        edge: p.edge,
        overview: p.overview,
        mood: p.mood,
        policy: p.policy,
        flow: p.flow,
        bearing: p.bearing,
        pulse: p.pulse,
        risks: p.risks,
        tradingNarrative: p.tradingNarrative,
        invalidationLevel: p.invalidationLevel,
        timestamp: p.timestamp,
      }
    : undefined;
  return {
    data,
    isLoading: q.isLoading || (!p && q.data?.running === true),
    error: q.error ?? pendingError(q.data, Boolean(p)),
  };
}

export function useBriefing() {
  const q = useAgentState();
  const b = q.data?.macro?.briefing;
  const data: Briefing | undefined = b
    ? { headline: b.headline, paragraphs: b.paragraphs, moods: b.moods, timestamp: q.data!.macro!.timestamp }
    : undefined;
  return {
    data,
    isLoading: q.isLoading || (!b && q.data?.running === true),
    error: q.error ?? pendingError(q.data, Boolean(b)),
  };
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

// ---- psychology ----

export function usePsychology(period: string) {
  return useQuery({
    queryKey: ["psychology", period],
    queryFn: () => get<Psychology>(`/api/journal/psychology?period=${period}`),
  });
}

export function usePsychologyInsight() {
  return useMutation({
    mutationFn: (period: string) => send<PsychologyInsight>("POST", "/api/ai/psychology", { period }),
  });
}

// ---- community ----

export function useCommunity() {
  return useQuery({
    queryKey: ["community"],
    queryFn: () => get<{ proposals: CommunityProposal[] }>("/api/community"),
  });
}

export function useVoteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
      send("POST", `/api/community/${id}/vote`, { direction }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community"] }),
  });
}

export function useProposePair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { symbol: string; name: string; category: string; description: string }) =>
      send("POST", "/api/community", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community"] }),
  });
}
