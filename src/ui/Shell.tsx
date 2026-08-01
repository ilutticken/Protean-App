import type { ReactNode } from "react";
import { useApp } from "../lib/useAppData";

export type Tab = "today" | "stunts" | "stats" | "plan";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "today",
    label: "Today",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "stunts",
    label: "Stunts",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    ),
  },
  {
    id: "stats",
    label: "Stats",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "plan",
    label: "Plan",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 9.5h16M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Shell({
  tab,
  onTab,
  children,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  children: ReactNode;
}) {
  const { data, athlete, setActiveAthlete } = useApp();
  const other = data.athletes.find((a) => a.id !== athlete.id);

  return (
    <div className="min-h-screen flex flex-col" style={{ ["--accent" as string]: athlete.accent }}>
      <header
        className="sticky top-0 z-30 bg-surface-0/90 backdrop-blur border-b border-line"
        style={{ borderBottomColor: "color-mix(in oklab, var(--accent) 35%, var(--color-line))" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="font-extrabold tracking-tight text-lg select-none">
            PROTEAN<span className="text-ink-3">⬡</span>
          </div>
          <button
            onClick={() => other && setActiveAthlete(other.id)}
            title={other ? `Switch to ${other.name}` : undefined}
            className="flex items-center gap-2 rounded-full bg-surface-1 border border-line pl-1.5 pr-3 py-1.5 active:scale-95 transition-transform"
          >
            <span
              className="w-7 h-7 rounded-full grid place-items-center text-surface-0 font-bold text-sm"
              style={{ background: athlete.accent }}
            >
              {athlete.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm font-medium">{athlete.name}</span>
            {other && (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16l-3-3 3-3M17 8l3 3-3 3M4 13h12M20 11H8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface-1/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "" : "text-ink-3"
                }`}
                style={active ? { color: "var(--accent)" } : undefined}
                aria-current={active ? "page" : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
