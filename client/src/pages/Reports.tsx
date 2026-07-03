import { useState } from "react";
import { AiTag, Card, SectionTitle, Spinner, Unavailable } from "../components/ui";
import { useAiStatus, useCoaching, useReports } from "../lib/api";
import type { CoachingReport } from "../lib/types";

const PERIODS = [
  { id: "WEEK", label: "Weekly" },
  { id: "MONTH", label: "Monthly" },
  { id: "QUARTER", label: "Quarterly" },
];

function exportReport(r: CoachingReport) {
  const lines = [
    `APfx HybridDash — AI Coaching Report (${r.period})`,
    r.createdAt ? `Generated: ${new Date(r.createdAt).toLocaleString()}` : "",
    "",
    "SUMMARY",
    r.summary,
    "",
    "FOCUS ACTIONS",
    ...r.focusActions.map((f) => `- ${f.title}: ${f.description}`),
    "",
    "STRENGTHS",
    ...(r.strengths.length ? r.strengths.map((s) => `- ${s}`) : ["- none identified yet"]),
    "",
    "BEHAVIOURAL PATTERNS",
    ...(r.patterns.length ? r.patterns.map((p) => `- ${p}`) : ["- none detected"]),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `coaching-report-${r.period.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ReportCard({ report }: { report: CoachingReport }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <AiTag />
          <p className="text-sm font-semibold mt-1">
            {report.period.charAt(0) + report.period.slice(1).toLowerCase()} coaching report
          </p>
          {report.createdAt && (
            <p className="text-[10px] text-ink-muted">{new Date(report.createdAt).toLocaleString("en-GB")}</p>
          )}
        </div>
        <button onClick={() => exportReport(report)}
          className="text-[10px] text-ink-muted border border-card-border rounded-lg px-2 py-1 hover:text-ink shrink-0">
          ↓ Export
        </button>
      </div>
      <p className="text-xs text-ink-muted leading-relaxed mt-2">{report.summary}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <div className="rounded-xl bg-card-alt border border-card-border p-3">
          <p className="text-[11px] font-semibold text-accent-bright mb-1.5">Focus actions</p>
          {report.focusActions.map((f) => (
            <div key={f.title} className="mb-1.5">
              <p className="text-[11px] font-semibold">{f.title}</p>
              <p className="text-[10px] text-ink-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-card-alt border border-card-border p-3">
          <p className="text-[11px] font-semibold text-bull mb-1.5">Strengths</p>
          {report.strengths.length ? (
            report.strengths.map((s) => <p key={s} className="text-[10px] text-ink-muted mb-1">• {s}</p>)
          ) : (
            <p className="text-[10px] text-ink-muted">No standout strengths identified yet.</p>
          )}
        </div>
        <div className="rounded-xl bg-card-alt border border-card-border p-3">
          <p className="text-[11px] font-semibold text-amber-400 mb-1.5">Behavioural patterns</p>
          {report.patterns.length ? (
            report.patterns.map((p) => <p key={p} className="text-[10px] text-ink-muted mb-1">• {p}</p>)
          ) : (
            <p className="text-[10px] text-ink-muted">No recurring patterns detected.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function Reports() {
  const { data: ai } = useAiStatus();
  const reports = useReports();
  const coaching = useCoaching();
  const [period, setPeriod] = useState("QUARTER");

  const generate = () =>
    coaching.mutate(period, { onSuccess: () => reports.refetch() });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-accent-bright tracking-tight">Reports</h1>
          <p className="text-sm text-ink-muted mt-1">
            AI coaching — review behaviour and execution with full decision context
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`text-xs rounded-full px-3 py-1.5 font-medium border transition-colors ${
                  period === p.id ? "bg-accent text-app border-accent" : "text-ink-muted border-card-border hover:text-ink"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={generate} disabled={!ai?.available || coaching.isPending}
            className="text-xs font-semibold text-app bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg px-4 py-2 transition-colors">
            {coaching.isPending ? "Analysing your journal…" : "Generate report"}
          </button>
        </div>
      </div>

      {!ai?.available && (
        <Card className="!py-3 text-xs text-amber-400">
          AI layer not configured — set <code className="text-ink">ANTHROPIC_API_KEY</code> in server/.env to generate coaching reports.
        </Card>
      )}
      {coaching.isError && (
        <Card className="!py-3 text-xs text-amber-400">{(coaching.error as Error).message}</Card>
      )}

      {reports.isLoading ? (
        <Spinner />
      ) : reports.data?.reports.length ? (
        <div className="space-y-4">
          {reports.data.reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      ) : (
        <Card>
          <SectionTitle title="No reports yet" />
          <Unavailable what="reports — log trades in the journal, then generate a coaching report;" />
        </Card>
      )}
    </div>
  );
}
