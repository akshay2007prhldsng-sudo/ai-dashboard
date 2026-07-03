import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useMeta } from "../lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: "M4 6h16M4 12h16M4 18h16" },
  { to: "/reports", label: "Reports", icon: "M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { to: "/calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/macro-desk", label: "Macro Desk", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { to: "/journal", label: "Journal", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/psychology", label: "Psychology", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { to: "/community", label: "Community", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
];

const TABS = [
  { to: "/", label: "Dashboard" },
  { to: "/macro-desk", label: "AI Macro Desk" },
  { to: "/macro-view/US100", label: "Macro view", match: "/macro-view" },
  { to: "/calendar", label: "Macro calendar" },
  { to: "/journal", label: "Dynamic Journal" },
  { to: "/reports", label: "Reports" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 17l5-10 3 6 3-4 5 8" />
        </svg>
      </div>
      <span className="font-semibold text-ink tracking-tight">
        APfx <span className="text-accent-bright">HybridDash</span>
      </span>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: meta } = useMeta();
  const initial = (meta?.traderName ?? "T").charAt(0).toUpperCase();

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-card-border/60 sticky top-0 bg-app/80 backdrop-blur z-20">
        <Logo />
        <div className="flex items-center gap-3">
          <button className="relative text-ink-muted hover:text-ink transition-colors" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-bold text-accent-bright">
            {initial}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 px-2 py-4 w-[92px] border-r border-card-border/60 shrink-0">
          {NAV.map((n) => {
            const active = n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] transition-colors ${
                  active ? "text-accent-bright bg-accent/10" : "text-ink-muted hover:text-ink hover:bg-card-alt"
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={n.icon} />
                </svg>
                {n.label}
              </NavLink>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Bottom pill tab bar */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 bg-app/90 backdrop-blur border border-card-border rounded-full px-2 py-1.5 shadow-card overflow-x-auto max-w-[95vw]">
        {TABS.map((t) => {
          const matchPath = t.match ?? t.to;
          const active = matchPath === "/" ? location.pathname === "/" : location.pathname.startsWith(matchPath);
          return (
            <NavLink
              key={t.label}
              to={t.to}
              className={`whitespace-nowrap text-xs font-medium rounded-full px-4 py-2 transition-colors ${
                active
                  ? "bg-accent text-app font-semibold"
                  : "text-ink-muted border border-transparent hover:border-card-border hover:text-ink"
              }`}
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
