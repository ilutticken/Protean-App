import { useEffect, useMemo, useState } from "react";
import type { ChainStep, DayId, EntryLog, SessionLog, SetLog, Slot } from "../../lib/types";
import { seedPlan } from "../../data/seed-plan";
import { coreSlots } from "../../data/prescription";
import { exercises } from "../../data/exercises";
import { useApp, updateAthleteState } from "../../lib/useAppData";
import { applySession, ghost, restSuggestion, targetFor, type ProgressionEvent } from "../../lib/progression";
import { resolveSlotState, stampSlotState } from "../../lib/slot-identity";
import { sessionCredit, type NodeCredit, type SessionCredit } from "../../lib/credit";
import { goalRelevantIds } from "../../lib/goal";
import { athleteSessions, effectiveStepIndex, skillStatuses, slotById } from "../../lib/selectors";
import { SECTORS } from "../sectors";
import RestTimer from "../components/RestTimer";
import IsoTimer from "../components/IsoTimer";
import BottomSheet from "../components/BottomSheet";

interface SlotDraft {
  stepIndex: number;
  optIndex: number;
  sets: (SetLog | null)[];
}

import { localISODate } from "../../lib/dates";

export default function Workout({ dayId, onExit }: { dayId: DayId; onExit: () => void }) {
  const store = useApp();
  const { data, athlete, athleteState } = store;

  const slots = useMemo(() => {
    if (dayId === "mobility") return [];
    // Six exercises per day (prescription.ts CORE_SLOTS); the rest are `optional` and
    // live on the Plan screen.
    const all = coreSlots(dayId, athleteState.regime ?? "calisthenic");
    return all.filter((s) => {
      if (!s.alternativeTo) {
        // hidden when the athlete picked its alternative
        const altPicked = all.some(
          (o) => o.alternativeTo === s.id && athleteState.slotAlternatives[s.id] === o.id,
        );
        return !altPicked;
      }
      return athleteState.slotAlternatives[s.alternativeTo] === s.id;
    });
  }, [dayId, athleteState.slotAlternatives, athleteState.regime]);

  // last logged entry per slot (ghost source)
  const lastEntryBySlot = useMemo(() => {
    const out: Record<string, EntryLog> = {};
    for (const s of athleteSessions(data.sessions, athlete.id)) {
      for (const e of s.entries) out[e.slotId] = e;
    }
    return out;
  }, [data.sessions, athlete.id]);

  // Skill statuses drive the bi-directional start position below.
  const statuses = useMemo(
    () => skillStatuses(data, athlete, athleteState),
    [data, athlete, athleteState],
  );

  const [draft, setDraft] = useState<Record<string, SlotDraft>>(() => {
    const d: Record<string, SlotDraft> = {};
    for (const s of slots) {
      // resolveSlotState re-points a stored position at the CURRENT chain, so
      // adding a rung to a chain can't reassign an athlete mid-progression.
      const st = resolveSlotState(s, athleteState.slotState[s.id]);
      d[s.id] = {
        // Bi-directional: never prescribe a step whose skill is already achieved,
        // however it was achieved (workout, Stunts log, or attestation).
        stepIndex: effectiveStepIndex(s, st?.stepIndex, statuses),
        optIndex: st?.optIndex ?? 0,
        sets: Array(s.sets).fill(null),
      };
    }
    return d;
  });
  const [rest, setRest] = useState<number | null>(null);
  const [restNonce, setRestNonce] = useState(0);
  const [isoOpen, setIsoOpen] = useState(false);
  const [isoDone, setIsoDone] = useState(false);
  const [warmupOpen, setWarmupOpen] = useState(true);
  const [warmupDone, setWarmupDone] = useState(false);
  const [summary, setSummary] = useState<{
    events: ProgressionEvent[];
    setCount: number;
    credit: SessionCredit;
  } | null>(null);
  const [holdTimer, setHoldTimer] = useState<{ slotId: string; setIx: number; sec: number } | null>(null);

  // Straight-arm pacing: in "advisory" mode the 21-day rate limit becomes 0 days, so
  // applySession still emits the warning path but never blocks an advance. The seed
  // config itself stays at addendum-2 §1.3's 21 days — this is a display-time override,
  // not an edit to the plan. See PLAN.md "Tendon pacing".
  const config = useMemo(
    () =>
      data.settings.tendonPacing === "guided"
        ? seedPlan.config
        : { ...seedPlan.config, saStepRateLimitDays: 0 },
    [data.settings.tendonPacing],
  );

  // Keep the screen awake for the whole session — a phone that locks mid-set hides
  // the rest timer and the set targets. Reacquired on tab return because Android
  // releases the sentinel whenever the page is hidden. Failure is fine: the app
  // works identically, the screen just dims on the gym timer.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      try {
        if (!disposed && "wakeLock" in navigator && document.visibilityState === "visible") {
          sentinel = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* unsupported / battery saver — non-essential */
      }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      sentinel?.release().catch(() => {});
    };
  }, []);

  const isoPattern = seedPlan.iso.patternByDay[dayId];
  const isoAngles = isoPattern ? seedPlan.iso.anglePresetsDeg[isoPattern] : undefined;

  function stepOf(slot: Slot, d: SlotDraft): ChainStep {
    return slot.chain[Math.min(d.stepIndex, slot.chain.length - 1)];
  }

  function commitSet(slot: Slot, setIx: number, value: number, weightKg?: number) {
    setDraft((prev) => {
      const d = prev[slot.id];
      const sets = [...d.sets];
      sets[setIx] = { value, ...(weightKg !== undefined && weightKg > 0 ? { weightKg } : {}) };
      return { ...prev, [slot.id]: { ...d, sets } };
    });
    const st = resolveSlotState(slot, athleteState.slotState[slot.id]) ?? {
      stepIndex: draft[slot.id].stepIndex,
      confirmCount: 0,
    };
    setRest(restSuggestion(slot, targetFor(slot, { ...st, stepIndex: draft[slot.id].stepIndex }).repBand, config));
    setRestNonce((n) => n + 1); // remount the timer even when the suggestion is unchanged
  }

  function finish() {
    const date = localISODate();
    const entries: EntryLog[] = [];
    const allEvents: ProgressionEvent[] = [];
    let setCount = 0;

    for (const slot of slots) {
      const d = draft[slot.id];
      const done = d.sets.filter((s): s is SetLog => s !== null);
      if (done.length === 0) continue;
      const step = stepOf(slot, d);
      const exId = step.ex ?? step.opts?.[d.optIndex]?.ex ?? step.opts?.[0]?.ex ?? "unknown";
      const entry: EntryLog = {
        slotId: slot.id,
        stepIndex: d.stepIndex,
        optIndex: step.opts ? d.optIndex : undefined,
        exerciseId: exId,
        // engine-defined repBand: T-index for single-step 3-tier slots (finding #4)
        repBand: targetFor(slot, { stepIndex: d.stepIndex, confirmCount: 0 }).repBand,
        sets: done,
      };
      entries.push(entry);
      setCount += done.length;

      const prevState = resolveSlotState(slot, athleteState.slotState[slot.id]) ?? {
        stepIndex: d.stepIndex,
        confirmCount: 0,
      };
      // Progression evaluates at the step actually worked; confirm credit banked
      // at a DIFFERENT step never carries over (finding #2 — else a mid-session
      // tier switch could advance after one session).
      const evalState = {
        ...prevState,
        stepIndex: d.stepIndex,
        optIndex: d.optIndex,
        confirmCount: d.stepIndex === prevState.stepIndex ? prevState.confirmCount : 0,
      };
      const { state: nextState, events } = applySession(slot, evalState, entry, config, date);
      allEvents.push(...events);
      // Stamp the step key alongside the index the engine just chose — the key
      // is what survives a chain edit (slot-identity.ts).
      const stamped = stampSlotState(slot, nextState);
      updateAthleteState(store, (s) => ({
        ...s,
        slotState: { ...s.slotState, [slot.id]: stamped },
      }));
    }

    // Nothing logged and no iso work → discard instead of saving an empty
    // session there is no UI to delete (finding #11).
    if (entries.length === 0 && !isoDone) {
      onExit();
      return;
    }

    const session: SessionLog = {
      id: `s-${Date.now().toString(36)}`,
      athleteId: athlete.id,
      date,
      dayId,
      entries,
      isoDone,
      warmupDone,
    };
    // What did this session actually move in the tree? Diff the statuses across it —
    // the direct answer to "does doing the workout mark off stunts?".
    const credit = sessionCredit(
      skillStatuses(data, athlete, athleteState),
      skillStatuses({ ...data, sessions: [...data.sessions, session] }, athlete, athleteState),
    );
    store.update((dd) => ({ ...dd, sessions: [...dd.sessions, session] }));
    setSummary({ events: allEvents, setCount, credit });
  }

  // ------- mobility day -------
  if (dayId === "mobility") {
    return (
      <MobilityDay
        onExit={onExit}
        onSave={() => {
          const session: SessionLog = {
            id: `s-${Date.now().toString(36)}`,
            athleteId: athlete.id,
            date: localISODate(),
            dayId,
            entries: [],
            warmupDone: true,
          };
          store.update((dd) => ({ ...dd, sessions: [...dd.sessions, session] }));
          onExit();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-surface-0 overflow-y-auto">
      <header className="sticky top-0 z-10 bg-surface-0/95 backdrop-blur border-b border-line">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => {
              const hasLogged = Object.values(draft).some((d) => d.sets.some((s) => s !== null));
              if (!hasLogged || window.confirm("Discard this session? Logged sets will not be saved."))
                onExit();
            }}
            className="text-ink-2 text-sm"
          >
            ← exit
          </button>
          <div className="font-bold capitalize">
            {dayId === "fullbody" ? "Full Body" : dayId} · <span style={{ color: athlete.accent }}>{athlete.name}</span>
          </div>
          <button
            onClick={finish}
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-surface-0"
            style={{ background: athlete.accent }}
          >
            Finish
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 pb-32 flex flex-col gap-3">
        {/* Warm-up */}
        <section className="rounded-2xl bg-surface-1 border border-line p-4">
          <button className="w-full flex items-center justify-between" onClick={() => setWarmupOpen((o) => !o)}>
            <span className="font-semibold text-sm">
              Warm-Up {warmupDone && <span className="text-success">✓</span>}
            </span>
            <span className="text-ink-3 text-xs">{warmupOpen ? "hide" : "show"}</span>
          </button>
          {warmupOpen && (
            <div className="mt-3 flex flex-col gap-1.5">
              {seedPlan.warmup.map((w) => (
                <div key={w.id} className="text-sm text-ink-2 flex gap-2">
                  <span className="text-ink-3">·</span>
                  <span>
                    {w.n}
                    {w.dose?.reps ? ` — ${w.dose.reps}${w.dose.perSide ? "/side" : w.dose.perDirection ? "/dir" : ""}` : ""}
                    {w.dose?.min ? ` — ${w.dose.min} min` : ""}
                    {w.optional ? " (optional)" : ""}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                {isoAngles && (
                  <button
                    onClick={() => setIsoOpen(true)}
                    disabled={isoDone}
                    className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {isoDone ? "✓ Overcoming iso done" : `▶ Overcoming iso — ${isoPattern} (${isoAngles.angles.join("/")}° ${isoAngles.joint})`}
                  </button>
                )}
                <button
                  onClick={() => {
                    setWarmupDone(true);
                    setWarmupOpen(false);
                  }}
                  className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
                >
                  Mark warm-up done
                </button>
              </div>
            </div>
          )}
        </section>

        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            draft={draft[slot.id]}
            lastEntry={lastEntryBySlot[slot.id]}
            accent={athlete.accent}
            onStep={(delta) =>
              setDraft((prev) => {
                const d = prev[slot.id];
                const ix = Math.max(0, Math.min(slot.chain.length - 1, d.stepIndex + delta));
                return { ...prev, [slot.id]: { ...d, stepIndex: ix } };
              })
            }
            onOpt={(optIndex) => setDraft((prev) => ({ ...prev, [slot.id]: { ...prev[slot.id], optIndex } }))}
            onCommit={(setIx, value, weightKg) => commitSet(slot, setIx, value, weightKg)}
            onHold={(setIx, sec) => setHoldTimer({ slotId: slot.id, setIx, sec })}
          />
        ))}
      </main>

      {rest !== null && (
        <RestTimer key={restNonce} seconds={rest} onDone={() => setRest(null)} onSkip={() => setRest(null)} />
      )}

      {isoOpen && isoAngles && (
        <IsoTimer
          angles={isoAngles.angles.map((a) => `${isoAngles.joint} ${a}°`)}
          sets={seedPlan.iso.sets}
          holdSec={seedPlan.iso.holdSec}
          onFinish={() => {
            setIsoDone(true);
            setIsoOpen(false);
          }}
          onCancel={() => setIsoOpen(false)}
        />
      )}

      {holdTimer && (
        <IsoTimer
          angles={["Hold"]}
          sets={1}
          holdSec={holdTimer.sec}
          onFinish={() => {
            const slot = slotById[holdTimer.slotId];
            commitSet(slot, holdTimer.setIx, holdTimer.sec);
            setHoldTimer(null);
          }}
          onCancel={() => setHoldTimer(null)}
        />
      )}

      <BottomSheet open={summary !== null} onClose={() => { setSummary(null); onExit(); }}>
        {summary && (
          <div>
            <h2 className="text-xl font-bold mb-1">Session saved</h2>
            <p className="text-ink-2 text-sm mb-4">{summary.setCount} sets logged for {athlete.name}.</p>
            <CreditSummary
              credit={summary.credit}
              goalClosure={athleteState.goal ? goalRelevantIds(athleteState.goal.nodeId) : undefined}
            />
            <div className="flex flex-col gap-2">
              {summary.events.length === 0 && (
                <p className="text-ink-3 text-sm">Keep stacking sessions — hit every set target twice in a row to advance a chain step.</p>
              )}
              {summary.events.map((e, i) => (
                <EventLine key={i} e={e} />
              ))}
            </div>
            <button
              onClick={() => { setSummary(null); onExit(); }}
              className="mt-5 w-full rounded-xl py-3 font-semibold text-surface-0"
              style={{ background: athlete.accent }}
            >
              Done
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

/** What the session moved in the skill tree — the credit half of the summary. */
function CreditSummary({
  credit,
  goalClosure,
}: {
  credit: SessionCredit;
  goalClosure?: ReadonlySet<string>;
}) {
  if (credit.total === 0) {
    return (
      <p className="text-ink-3 text-sm mb-3">
        No tree movement this session — every node these exercises feed is already at its best.
      </p>
    );
  }
  const groups: { kind: NodeCredit["kind"]; label: string; icon: string; rows: NodeCredit[] }[] = [
    { kind: "achieved", label: "achieved", icon: "✓", rows: credit.achieved },
    { kind: "unlocked", label: "unlocked", icon: "◇", rows: credit.unlocked },
    { kind: "progressed", label: "moved", icon: "→", rows: credit.progressed },
  ];
  const headline = groups
    .filter((g) => g.rows.length > 0)
    .map((g) => `${g.rows.length} ${g.label}`)
    .join(" · ");

  // Cap the TOTAL rows, not one bucket. A first-ever Legs session credits 25 nodes
  // (12 achieved + 13 unlocked) and would otherwise bury the sheet; achievements
  // outrank unlocks outrank movement. The headline still counts everything.
  const MAX_ROWS = 8;
  const flat = groups.flatMap((g) => g.rows.map((r) => ({ ...r, icon: g.icon, kind: g.kind })));
  const shown = flat.slice(0, MAX_ROWS);

  return (
    <div className="mb-3">
      <div className="text-xs text-ink-3 uppercase tracking-wide mb-1.5">Skill tree · {headline}</div>
      <div className="flex flex-col gap-1">
        {shown.map((r) => (
          <div key={r.nodeId} className="flex items-center gap-2 text-sm">
            <span className={r.kind === "achieved" ? "text-success" : "text-ink-3"}>{r.icon}</span>
            <span className={r.kind === "achieved" ? "text-ink-1 font-medium" : "text-ink-2"}>
              {r.name}
            </span>
            {goalClosure?.has(r.nodeId) && <span style={{ color: "#e8b23a" }}>★</span>}
            {r.to !== undefined && (
              <span className="text-ink-3 text-xs nums ml-auto">
                {r.from !== undefined && r.from > 0 ? `${round1(r.from)} → ` : ""}
                {round1(r.to)}
              </span>
            )}
          </div>
        ))}
        {flat.length > shown.length && (
          <div className="text-ink-3 text-xs">
            +{flat.length - shown.length} more — see the Stunts map
          </div>
        )}
      </div>
    </div>
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function EventLine({ e }: { e: ProgressionEvent }) {
  const slot = slotById[e.slotId];
  const name = slot ? slot.chain[0]?.n ?? e.slotId : e.slotId;
  const map: Record<ProgressionEvent["type"], [string, string]> = {
    advanced: ["▲", "Advanced a chain step in"],
    reverted: ["▼", "Stepped back (cooldown 14d) in"],
    "rep-suggest": ["＋", "Next time aim for more reps in"],
    "load-suggest": ["⚓", "Ready to add load in"],
    "sa-blocked": ["⏳", "Tendon guard: advance delayed in"],
    "cooldown-blocked": ["⏳", "Cooldown active in"],
  };
  const [icon, text] = map[e.type];
  const good = e.type === "advanced" || e.type === "load-suggest";
  return (
    <div className="flex items-center gap-2.5 text-sm rounded-lg bg-surface-1 border border-line px-3 py-2">
      <span className={good ? "text-success" : "text-ink-2"}>{icon}</span>
      <span className="text-ink-2">
        {text} <span className="text-ink-1 font-medium">{slot?.id ?? e.slotId}</span>
        <span className="text-ink-3"> · {name}</span>
        {e.type === "load-suggest" && <span className="nums text-ink-1"> (+{e.incKg} kg → {e.suggestedKg} kg)</span>}
        {e.type === "sa-blocked" && <span className="nums"> ({e.daysUntilAllowed}d left)</span>}
      </span>
    </div>
  );
}

function SlotCard({
  slot,
  draft,
  lastEntry,
  accent,
  onStep,
  onOpt,
  onCommit,
  onHold,
}: {
  slot: Slot;
  draft: SlotDraft;
  lastEntry?: EntryLog;
  accent: string;
  onStep: (delta: number) => void;
  onOpt: (ix: number) => void;
  onCommit: (setIx: number, value: number, weightKg?: number) => void;
  onHold: (setIx: number, sec: number) => void;
}) {
  const step = slot.chain[Math.min(draft.stepIndex, slot.chain.length - 1)];
  // Engine-authoritative target — for single-step 3-tier slots stepIndex is the
  // T-index and tiers[band] is WRONG (critical review finding #1).
  const target = targetFor(slot, { stepIndex: draft.stepIndex, confirmCount: 0 }).target;
  const hue = SECTORS[slot.sector].hex;
  const isHold = slot.type === "quasi_iso" || slot.type === "timed_hold";
  const isRounds = slot.type === "rounds";
  const ghosts = ghost(lastEntry && lastEntry.stepIndex === draft.stepIndex ? lastEntry : undefined, slot.sets);
  const unit = isHold ? "s" : slot.unit === "steps" ? "steps" : slot.unit === "skips" ? "skips" : "reps";
  const stepName = step?.opts ? step.opts[draft.optIndex]?.n ?? step.n : step?.n;
  const exName = step?.ex ? exercises[step.ex]?.name ?? step.n : stepName;

  return (
    <section className="rounded-2xl bg-surface-1 border border-line overflow-hidden">
      <div className="px-4 pt-3 pb-2" style={{ borderLeft: `3px solid ${hue}` }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: hue }}>
              {SECTORS[slot.sector].short} · {slot.id}
              {step?.sa && <span title="straight-arm: tendon-paced"> · SA</span>}
            </div>
            <div className="font-semibold truncate">{exName ?? stepName}</div>
          </div>
          {slot.chain.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onStep(1)}
                disabled={draft.stepIndex >= slot.chain.length - 1}
                className="w-9 h-9 rounded-lg bg-surface-2 border border-line text-ink-2 disabled:opacity-30"
                title="easier variant"
              >
                ▼
              </button>
              <button
                onClick={() => onStep(-1)}
                disabled={draft.stepIndex <= 0}
                className="w-9 h-9 rounded-lg bg-surface-2 border border-line text-ink-2 disabled:opacity-30"
                title="harder variant"
              >
                ▲
              </button>
            </div>
          )}
        </div>
        {/* chain position dots (hardest on the left) */}
        {slot.chain.length > 1 && (
          <div className="flex gap-1 mt-2">
            {slot.chain.map((c, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full flex-1"
                title={c.n}
                style={{
                  background: i === draft.stepIndex ? hue : "var(--color-surface-3)",
                  opacity: i < draft.stepIndex ? 0.9 : 1,
                }}
              />
            ))}
          </div>
        )}
        {step?.opts && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {step.opts.map((o, i) => (
              <button
                key={o.ex}
                onClick={() => onOpt(i)}
                className={`rounded-full px-2.5 py-1 text-xs border ${
                  i === draft.optIndex ? "text-ink-1 border-ink-3 bg-surface-3" : "text-ink-3 border-line bg-surface-2"
                }`}
              >
                {o.n}
              </button>
            ))}
          </div>
        )}
        <div className="text-xs text-ink-3 mt-1.5 nums">
          {isRounds
            ? `${slot.sets} × ${slot.workSec}s work / ${slot.restSec}s rest`
            : isHold
              ? `${slot.sets} × ${slot.holdSec ?? slot.tiers[0]}s hold`
              : `${slot.sets} × ${target} ${unit}${step?.uni ? " / side" : ""}${step?.alt ? " (alternating total)" : ""}`}
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-col gap-1.5">
        {draft.sets.map((logged, i) => (
          <SetRow
            key={i}
            n={i + 1}
            logged={logged}
            ghostValue={ghosts[i]}
            target={isHold ? (slot.holdSec ?? slot.tiers[0]) : target}
            unit={unit}
            loadable={Boolean(step?.load || step?.loadOpt || step?.opts?.[draft.optIndex]?.load)}
            accent={accent}
            isHold={isHold}
            onCommit={(v, w) => onCommit(i, v, w)}
            onHold={(sec) => onHold(i, sec)}
          />
        ))}
      </div>
    </section>
  );
}

function SetRow({
  n,
  logged,
  ghostValue,
  target,
  unit,
  loadable,
  accent,
  isHold,
  onCommit,
  onHold,
}: {
  n: number;
  logged: SetLog | null;
  ghostValue?: { value: number | null; weightKg: number | null };
  target: number;
  unit: string;
  loadable: boolean;
  accent: string;
  isHold: boolean;
  onCommit: (value: number, weightKg?: number) => void;
  onHold: (sec: number) => void;
}) {
  const [value, setValue] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const ghostV = ghostValue?.value ?? target;
  const ghostW = ghostValue?.weightKg ?? undefined;

  if (logged) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 border border-line px-3 h-12 opacity-90">
        <span className="text-ink-3 text-xs w-5">{n}</span>
        <span className="nums font-semibold" style={{ color: accent }}>
          {logged.value} {unit}
          {logged.weightKg ? ` @ ${logged.weightKg} kg` : ""}
        </span>
        <span className="ml-auto text-success">✓</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3 h-14">
      <span className="text-ink-3 text-xs w-5">{n}</span>
      {isHold ? (
        <button
          onClick={() => onHold(target)}
          className="flex-1 text-left text-sm text-ink-2"
        >
          ▶ start {target}s hold <span className="text-ink-3">(or log actual below)</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <Stepper onClick={() => setValue((v) => String(Math.max(0, (Number(v) || ghostV) - 1)))} label="−" />
          <input
            className="w-16 h-10 rounded-lg bg-surface-1 border border-line text-center nums font-semibold outline-none focus:border-ink-3 placeholder:text-ink-3"
            inputMode="numeric"
            placeholder={String(ghostV)}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
          />
          <Stepper onClick={() => setValue((v) => String((Number(v) || ghostV) + 1))} label="＋" />
        </div>
      )}
      {loadable && (
        <input
          className="w-16 h-10 rounded-lg bg-surface-1 border border-line text-center nums outline-none focus:border-ink-3 placeholder:text-ink-3"
          inputMode="decimal"
          placeholder={ghostW !== undefined ? `${ghostW}kg` : "kg"}
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
        />
      )}
      {isHold && (
        <input
          className="w-16 h-10 rounded-lg bg-surface-1 border border-line text-center nums outline-none focus:border-ink-3 placeholder:text-ink-3"
          inputMode="numeric"
          placeholder={`${target}s`}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        />
      )}
      <button
        onClick={() => {
          // Empty field = accept ghost; an explicit "0" is a no-op, never the ghost (finding #21).
          const v = value === "" ? ghostV : Number(value);
          const w = weight === "" ? ghostW : Number(weight);
          if (Number.isFinite(v) && v > 0 && (w === undefined || Number.isFinite(w))) onCommit(v, w);
        }}
        className="ml-auto w-11 h-11 rounded-xl font-bold text-surface-0 active:scale-95 transition-transform"
        style={{ background: accent }}
        aria-label={`log set ${n}`}
      >
        ✓
      </button>
    </div>
  );
}

function Stepper({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-10 rounded-lg bg-surface-1 border border-line text-ink-2 text-lg leading-none"
    >
      {label}
    </button>
  );
}

function MobilityDay({ onExit, onSave }: { onExit: () => void; onSave: () => void }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  return (
    <div className="fixed inset-0 z-40 bg-surface-0 overflow-y-auto">
      <header className="sticky top-0 bg-surface-0/95 backdrop-blur border-b border-line">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <button onClick={onExit} className="text-ink-2 text-sm">← exit</button>
          <div className="font-bold">Mobility</div>
          <button onClick={onSave} className="rounded-full px-4 py-1.5 text-sm font-semibold text-surface-0 accent-bg">
            Save
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-2">
        {seedPlan.mobility.map((m) => (
          <button
            key={m.id}
            onClick={() =>
              setDone((s) => {
                const n = new Set(s);
                if (n.has(m.id)) n.delete(m.id);
                else n.add(m.id);
                return n;
              })
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${
              done.has(m.id) ? "bg-surface-2 border-ink-3" : "bg-surface-1 border-line"
            }`}
          >
            <span className={done.has(m.id) ? "text-ink-1" : "text-ink-2"}>
              {m.n}
              <span className="text-ink-3 text-sm">
                {m.holdSec ? ` — ${m.holdSec}s${m.perSide ? "/side" : ""}` : m.dose?.min ? ` — ${m.dose.min} min` : ""}
              </span>
            </span>
            {done.has(m.id) && <span className="text-success">✓</span>}
          </button>
        ))}
      </main>
    </div>
  );
}
