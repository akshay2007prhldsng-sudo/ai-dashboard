import { useState } from "react";
import { Card, LiveBadge, SectionTitle, Spinner, Unavailable } from "../components/ui";
import { useCommunity, useProposePair, useVoteProposal } from "../lib/api";

const CATEGORIES = ["fx", "index", "metal", "crypto", "energy"];
const CAT_COLOR: Record<string, string> = {
  fx: "text-accent-bright bg-accent/10 border-accent/30",
  index: "text-sky bg-sky/10 border-sky/30",
  metal: "text-amber bg-amber/10 border-amber/30",
  crypto: "text-violet bg-violet/10 border-violet/30",
  energy: "text-bear bg-bear/10 border-bear/30",
};

export function Community() {
  const { data, isLoading } = useCommunity();
  const vote = useVoteProposal();
  const propose = useProposePair();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ symbol: "", name: "", category: "fx", description: "" });

  const submit = () => {
    if (!form.symbol.trim()) return;
    propose.mutate(form, {
      onSuccess: () => {
        setForm({ symbol: "", name: "", category: "fx", description: "" });
        setOpen(false);
      },
    });
  };

  const total = data?.proposals.reduce((s, p) => s + p.votes, 0) ?? 0;
  const input = "w-full bg-card-alt border border-card-border rounded-lg px-2 py-1.5 text-ink text-xs focus:outline-none focus:border-accent/50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-accent-bright tracking-tight flex items-center gap-3">
            Community <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-bright bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5">Beta</span>
          </h1>
          <p className="text-sm text-ink-muted mt-1">Vote on which instruments to add to the desk next</p>
        </div>
        <button onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-app bg-accent hover:bg-accent-hover rounded-lg px-3 py-2 transition-colors">
          + Propose a pair
        </button>
      </div>

      {open && (
        <Card>
          <SectionTitle title="Propose a new instrument" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-[10px] text-ink-muted">Symbol *
              <input className={input} value={form.symbol} placeholder="e.g. NZDUSD"
                onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
            </label>
            <label className="text-[10px] text-ink-muted">Name
              <input className={input} value={form.name} placeholder="Full name"
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-[10px] text-ink-muted">Category
              <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[10px] text-ink-muted md:col-span-4">Why add it?
              <input className={input} value={form.description} placeholder="What makes it worth trading…"
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
          {propose.isError && <p className="text-xs text-bear mt-2">{(propose.error as Error).message}</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setOpen(false)} className="text-xs text-ink-muted border border-card-border rounded-lg px-3 py-1.5 hover:text-ink">Cancel</button>
            <button onClick={submit} disabled={propose.isPending || !form.symbol.trim()}
              className="text-xs font-semibold text-app bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg px-3 py-1.5">
              {propose.isPending ? "Submitting…" : "Submit proposal"}
            </button>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle
          title="Proposed instruments"
          sub={total ? `${total} total votes · ${data?.proposals.length} proposals` : undefined}
          right={<LiveBadge label="Board" />}
        />
        {isLoading ? (
          <Spinner />
        ) : data?.proposals.length ? (
          <div className="space-y-2">
            {data.proposals.map((p, i) => {
              const share = total ? (p.votes / total) * 100 : 0;
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card-alt border border-card-border p-3">
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button onClick={() => vote.mutate({ id: p.id, direction: "up" })}
                      className="text-ink-muted hover:text-bull transition-colors" title="Upvote">▲</button>
                    <span className="text-sm font-semibold tabular-nums">{p.votes}</span>
                    <button onClick={() => vote.mutate({ id: p.id, direction: "down" })}
                      className="text-ink-muted hover:text-bear transition-colors" title="Downvote">▼</button>
                  </div>
                  <div className="w-6 text-center text-xs text-ink-muted shrink-0">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{p.symbol}</span>
                      <span className={`text-[9px] font-semibold uppercase rounded px-1.5 border ${CAT_COLOR[p.category] ?? CAT_COLOR.fx}`}>
                        {p.category}
                      </span>
                      <span className="text-xs text-ink-muted truncate">{p.name}</span>
                    </div>
                    {p.description && <p className="text-[11px] text-ink-muted mt-0.5 truncate">{p.description}</p>}
                    <div className="h-1 rounded-full bg-card overflow-hidden mt-1.5">
                      <div className="h-full bg-accent/70" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Unavailable what="proposals — be the first to propose a pair" />
        )}
      </Card>

      <p className="text-[10px] text-ink-muted text-center">
        Community voting is a beta stub — votes persist locally in your dashboard database. Multi-user sync arrives with accounts.
      </p>
    </div>
  );
}
