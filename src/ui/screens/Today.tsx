import { useMemo } from "react";
import type { DayId } from "../../lib/types";
import { seedPlan } from "../../data/seed-plan";
import { useApp } from "../../lib/useAppData";
import { backupDue, exportJson } from "../../lib/storage";
import { nextDayId, prFeed, weeklyStreak, athleteSessions, skillStatuses } from "../../lib/selectors";
import { goalPath } from "../../lib/goal";
import { coreSlots, REGIME_LABEL } from "../../data/prescription";
import { deloadCheck } from "../../lib/progression";
import { localISODate } from "../../lib/dates";

const DAY_LABEL: Record<DayId, string> = {
  legs: "Legs",
  pull: "Pull",
  push: "Push",
  fullbody: "Full Body",
  mobility: "Mobility",
};

const DAY_BLURB: Record<DayId, string> = {
  legs: "Pistols, hinge, cossacks, carry — 6 exercises",
  pull: "Rows, levers, pull-ups, grip — 6 exercises",
  push: "Dips, handstands, planche work — 6 exercises",
  fullbody: "Power, carries, skipping — 6 exercises",
  mobility: "11 holds + meditation, ~15 min",
};

export default function Today({ onStart }: { onStart: (day: DayId) => void }) {
  const { data, athlete, athleteState, update } = useApp();
  const todayISO = localISODate();

  const planned = useMemo(() => nextDayId(data.sessions, athlete.id), [data.sessions, athlete.id]);
  const streak = useMemo(
    () => weeklyStreak(data.sessions, athlete.id, todayISO),
    [data.sessions, athlete.id, todayISO],
  );
  const prs = useMemo(() => prFeed(data), [data]);
  const deload = useMemo(() => {
    const mine = athleteSessions(data.sessions, athlete.id);
    return deloadCheck(mine.slice(-40), todayISO);
  }, [data.sessions, athlete.id, todayISO]);

  const sessionsToday = data.sessions.filter((s) => s.athleteId === athlete.id && s.date === todayISO);

  return (
    <div className="flex flex-col gap-4">
      {/* planned session card */}
      <section
        className="rounded-2xl border border-line p-5"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${athlete.accent} 16%, var(--color-surface-1)), var(--color-surface-1) 70%)`,
        }}
      >
        <div className="text-xs uppercase tracking-widest text-ink-2">
          {sessionsToday.length > 0 ? "logged today ✓ — next up" : "up next"}
        </div>
        <h1 className="text-3xl font-extrabold mt-1">{DAY_LABEL[planned]}</h1>
        <p className="text-ink-2 text-sm mt-1">{DAY_BLURB[planned]}</p>
        {planned !== "mobility" && (
          <p className="text-ink-3 text-xs mt-1">
            {REGIME_LABEL[athleteState.regime ?? "calisthenic"]} lean ·{" "}
            {coreSlots(planned, athleteState.regime ?? "calisthenic")
              .filter((s) => s.id.startsWith("heavy-"))
              .map((s) => s.chain[0].n)
              .join(" · ") || "no barbell today"}
          </p>
        )}
        <button
          onClick={() => onStart(planned)}
          className="mt-4 rounded-xl px-6 py-3 font-semibold text-surface-0 active:scale-[0.98] transition-transform"
          style={{ background: athlete.accent }}
        >
          Start {DAY_LABEL[planned]} →
        </button>
        <div className="flex gap-1.5 mt-4">
          {seedPlan.config.weekOrder.map((d, i) => (
            <button
              key={i}
              onClick={() => onStart(d)}
              className={`rounded-full px-3 py-1 text-xs border ${
                d === planned ? "border-ink-3 text-ink-1 bg-surface-2" : "border-line text-ink-3"
              }`}
            >
              {DAY_LABEL[d]}
            </button>
          ))}
        </div>
      </section>

      {backupDue(data.settings.lastBackupISO, todayISO, data.sessions.length > 0) && (
        <section className="rounded-2xl bg-surface-1 border border-line p-4 flex items-center gap-3">
          <span className="text-xl">💾</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm">Back up your data</div>
            <p className="text-ink-2 text-xs mt-0.5">
              {data.settings.lastBackupISO
                ? `Last export ${data.settings.lastBackupISO} — this phone is the only copy.`
                : "Never exported — this phone is the only copy of your training history."}
            </p>
          </div>
          <button
            onClick={() => {
              exportJson(data);
              update((d) => ({
                ...d,
                settings: { ...d.settings, lastBackupISO: todayISO },
              }));
            }}
            className="shrink-0 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
          >
            Export
          </button>
        </section>
      )}

      {deload.due && (
        <section className="rounded-2xl bg-surface-1 border border-line p-4 flex gap-3">
          <span className="text-xl">🪫</span>
          <div>
            <div className="font-semibold text-sm">Deload week suggested</div>
            <p className="text-ink-2 text-xs mt-0.5">
              {deload.reasons[0]}. Do half the sets at ~90% load (RIR 4–5) — don't skip training entirely;
              add "deload" to a session note to reset the clock.
            </p>
          </div>
        </section>
      )}

      {/* weekly streak */}
      <section className="rounded-2xl bg-surface-1 border border-line p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">This week</div>
            <div className="text-ink-2 text-xs mt-0.5 nums">
              {streak.thisWeek}/{streak.target} training days · streak {streak.current} wk · best {streak.longest} wk
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: streak.target }, (_, i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-full border"
                style={{
                  background: i < streak.thisWeek ? athlete.accent : "transparent",
                  borderColor: i < streak.thisWeek ? athlete.accent : "var(--color-surface-3)",
                }}
              />
            ))}
          </div>
        </div>
        <p className="text-ink-3 text-[11px] mt-2">
          Streaks count weeks with ≥{streak.target} training days — one missed day never matters.
        </p>
      </section>

      {/* goal card */}
      {(() => {
        const g = athleteState.goal;
        if (!g) return null;
        const p = goalPath(g.nodeId, skillStatuses(data, athlete, athleteState));
        if (!p) return null;
        return (
          <section className="rounded-2xl bg-surface-1 border border-line p-4" style={{ borderTop: "2px solid #e8b23a" }}>
            <div className="flex items-baseline justify-between">
              <div className="font-semibold text-sm">★ {p.goal.name}</div>
              <div className="text-ink-3 text-xs nums">
                {p.achieved}/{p.total} · {p.remaining} steps left
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-surface-3 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round((100 * p.achieved) / Math.max(p.total, 1))}%`, background: "#e8b23a" }}
              />
            </div>
            {p.remaining > 0 ? (
              <p className="text-ink-2 text-xs mt-2">
                Next up: {p.nextUp.slice(0, 2).map((n) => n.name).join(" · ") || "clear a locked prerequisite"}
              </p>
            ) : (
              <p className="text-xs mt-2" style={{ color: "#e8b23a" }}>
                Path complete — go take it, then pick the next one.
              </p>
            )}
          </section>
        );
      })()}

      {/* PR feed */}
      <section className="rounded-2xl bg-surface-1 border border-line p-4">
        <div className="font-semibold text-sm mb-2">Recent PRs</div>
        {prs.length === 0 ? (
          <p className="text-ink-3 text-sm">PRs will show up here as you log sessions.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {prs.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: athlete.accent }}
                />
                <span className="text-ink-1 truncate">{p.label}</span>
                <span className="text-ink-3 text-xs ml-auto shrink-0 nums">{p.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
