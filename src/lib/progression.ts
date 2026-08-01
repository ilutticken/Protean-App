// Progression engine for Protean chain slots.
// Sources: docs/research/03-programming-science.md §1.4/§8/§15 (engine pseudocode, deload logic)
// as REWRITTEN by docs/research/06-addendum-2.md §1-§2 (band model, R-rule rewrites, config
// values, stepIndex/repBand naming). All functions are pure and never mutate their inputs.

import type {
  EntryLog,
  PlanConfig,
  RepBand,
  SessionLog,
  Slot,
  SlotState,
} from "./types";

// ---------------------------------------------------------------------------
// Date helpers (ISO yyyy-mm-dd; Date.parse of a date-only string is UTC midnight)

const MS_PER_DAY = 86_400_000;

/** Whole days from ISO date a to ISO date b (positive when b is later). Internal helper. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / MS_PER_DAY);
}

/** ISO date exactly n days after the given ISO date. Internal helper. */
function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso) + n * MS_PER_DAY).toISOString().slice(0, 10);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

// ---------------------------------------------------------------------------
// Band model

/** band(i, N) = N==1 ? 1 : roundHalfUp(2i/(N-1)) — addendum-2 §1.2 (Math.round is half-up for positives). */
export function band(i: number, n: number): RepBand {
  if (n <= 1) return 1;
  return clamp(Math.round((2 * i) / (n - 1)), 0, 2) as RepBand;
}

/** workTarget(step) = tiers[chain[stepIndex].band]; single-tier slots always tiers[0]; bounds guarded — addendum-2 §1.2/§1.3. */
export function workTarget(slot: Slot, stepIndex: number): number {
  const tiers = slot.tiers ?? [];
  if (tiers.length === 0) return slot.holdSec ?? slot.workSec ?? 0; // hold/rounds slots: seconds are the target
  if (tiers.length === 1) return tiers[0];
  const chain = slot.chain ?? [];
  const step = chain[clamp(stepIndex, 0, Math.max(chain.length - 1, 0))];
  return tiers[clamp(step?.band ?? 1, 0, tiers.length - 1)];
}

/** True for single-STEP multi-tier slots (full-04..06, full-08 shape) that use the in-step T0→T1→T2 rep ladder — addendum-2 §1.2 interpretation A. */
export function isInStepSlot(slot: Slot): boolean {
  return (slot.chain?.length ?? 0) === 1 && (slot.tiers?.length ?? 0) === 3;
}

export interface TargetInfo {
  target: number;
  repBand: RepBand;
  mode: "band" | "in-step";
}

/**
 * targetFor: current working target for either slot shape — addendum-2 §1.2 (band model for
 * multi-step chains; interpretation-A in-step ladder for single-step 3-tier slots).
 *
 * DESIGN NOTE: in-step slots REUSE SlotState.stepIndex as the T-index (0 = T0 entry … 2 = T2 exit),
 * since the chain has exactly one step and needs no position. This INVERTS the advancement
 * direction: band mode advances by DECREMENTING stepIndex (0 = hardest), in-step mode advances
 * by INCREMENTING the T-index. The returned repBand for in-step mode is the T-index itself
 * (it plays the same role: indexes tiers and drives rest suggestions).
 */
export function targetFor(slot: Slot, state: SlotState): TargetInfo {
  const tiers = slot.tiers ?? [];
  if (isInStepSlot(slot)) {
    const t = clamp(state.stepIndex, 0, tiers.length - 1);
    return { target: tiers[t], repBand: t as RepBand, mode: "in-step" };
  }
  const chain = slot.chain ?? [];
  const idx = clamp(state.stepIndex, 0, Math.max(chain.length - 1, 0));
  const repBand = clamp(chain[idx]?.band ?? 1, 0, 2) as RepBand;
  return { target: workTarget(slot, idx), repBand, mode: "band" };
}

// ---------------------------------------------------------------------------
// Session application (R-rules)

/** Events emitted by applySession — addendum-2 §1.3 rule table (R-REP/R-STEP/R-LOAD/R-LAND + sa/cooldown guards). */
export type ProgressionEvent =
  | { type: "rep-suggest"; slotId: string; suggestedReps: number; target: number }
  | { type: "load-suggest"; slotId: string; incKg: number; suggestedKg: number }
  | { type: "advanced"; slotId: string; from: number; to: number; mode: "band" | "in-step" }
  | { type: "sa-blocked"; slotId: string; daysUntilAllowed: number }
  | { type: "cooldown-blocked"; slotId: string; cooldownUntil: string }
  | { type: "reverted"; slotId: string; from: number; to: number; cooldownUntil: string };

/** Sectors whose slots take the lower-body load increment (+2.5 kg); everything else is upper (+1.25 kg) — addendum-2 §1.3 R-LOAD. */
const LOWER_BODY_SECTORS: ReadonlySet<string> = new Set(["squat", "posterior"]);

/**
 * applySession: post-session progression engine — addendum-2 §1.3 (rewriting doc 03 §1.4/§15).
 * Rules, in evaluation order:
 *  - R-LAND: value < landingFailPctOfTarget% (60) of target on ≥ half the sets → revert one step
 *    (bounded), cooldownUntil = date + chainCooldownDays (14), event "reverted".
 *  - R-REP: below target but not failing → suggest lowest set + 1 rep (capped at target).
 *  - R-LOAD: loaded step at band target → suggest +loadIncKg (lower/upper inferred from sector).
 *  - R-STEP: all sets ≥ target for confirmSessions (2) CONSECUTIVE sessions → advance one step
 *    (band: stepIndex−1; in-step ladder: T-index+1). Cooldown blocks it ("cooldown-blocked");
 *    sa steps (current or destination) require ≥ saStepRateLimitDays (21) since lastAdvanceDate
 *    ("sa-blocked"). Blocked attempts RETAIN banked confirms (doc 03 §15 consumes them; retained
 *    here so a rate-limited slot advances on the first qualifying session after expiry).
 * The entry is assumed performed at the state's current step: targets come from `state`,
 * not from entry.stepIndex.
 */
export function applySession(
  slot: Slot,
  state: SlotState,
  entry: EntryLog,
  config: PlanConfig,
  dateISO: string,
): { state: SlotState; events: ProgressionEvent[] } {
  const events: ProgressionEvent[] = [];
  const next: SlotState = { ...state };
  const { target, mode } = targetFor(slot, state);
  const sets = entry.sets;
  if (sets.length === 0 || target <= 0) return { state: next, events };

  const chainMax = Math.max(slot.chain.length - 1, 0);

  // R-LAND — landing failure reverts one step and starts the cooldown.
  const failCut = (config.landingFailPctOfTarget / 100) * target;
  const failedSets = sets.filter((s) => s.value < failCut).length;
  if (failedSets >= Math.ceil(sets.length / 2)) {
    const from = state.stepIndex;
    const to = mode === "band" ? Math.min(from + 1, chainMax) : Math.max(from - 1, 0);
    next.stepIndex = to;
    next.confirmCount = 0;
    next.cooldownUntil = addDays(dateISO, config.chainCooldownDays);
    events.push({ type: "reverted", slotId: slot.id, from, to, cooldownUntil: next.cooldownUntil });
    return { state: next, events };
  }

  // R-REP — working toward the band target: consecutive-confirm counter resets.
  // A confirm requires the FULL prescription: an incomplete session (fewer sets
  // logged than prescribed) never banks advancement credit (review finding #5).
  const qualifying = sets.length >= slot.sets && sets.every((s) => s.value >= target);
  if (!qualifying) {
    next.confirmCount = 0;
    const lowest = Math.min(...sets.map((s) => s.value));
    events.push({
      type: "rep-suggest",
      slotId: slot.id,
      suggestedReps: Math.min(lowest + 1, target),
      target,
    });
    return { state: next, events };
  }

  // R-LOAD — loaded step at band target: suggest the sector-appropriate kg increment.
  const stepIdx = mode === "band" ? clamp(state.stepIndex, 0, chainMax) : 0;
  const step = slot.chain[stepIdx];
  if (step?.load) {
    const incKg = LOWER_BODY_SECTORS.has(slot.sector) ? config.loadIncKg.lower : config.loadIncKg.upper;
    const base = state.workingWeightKg ?? Math.max(0, ...sets.map((s) => s.weightKg ?? 0));
    events.push({ type: "load-suggest", slotId: slot.id, incKg, suggestedKg: base + incKg });
  }

  // R-STEP — confirm, then attempt the advance.
  next.confirmCount = Math.min(state.confirmCount + 1, config.confirmSessions);
  if (next.confirmCount < config.confirmSessions) return { state: next, events };

  const from = state.stepIndex;
  const to = mode === "band" ? from - 1 : from + 1;
  const inBounds = mode === "band" ? to >= 0 : to <= (slot.tiers?.length ?? 1) - 1;
  if (!inBounds) {
    next.confirmCount = 0; // already at the hardest step / T2 exit — nothing to advance into
    return { state: next, events };
  }

  if (next.cooldownUntil && dateISO < next.cooldownUntil) {
    events.push({ type: "cooldown-blocked", slotId: slot.id, cooldownUntil: next.cooldownUntil });
    return { state: next, events };
  }

  const saInvolved =
    mode === "band"
      ? Boolean(slot.chain[stepIdx]?.sa || slot.chain[to]?.sa)
      : Boolean(slot.chain[0]?.sa);
  if (saInvolved && next.lastAdvanceDate) {
    const since = daysBetween(next.lastAdvanceDate, dateISO);
    if (since < config.saStepRateLimitDays) {
      events.push({
        type: "sa-blocked",
        slotId: slot.id,
        daysUntilAllowed: config.saStepRateLimitDays - since,
      });
      return { state: next, events };
    }
  }

  next.stepIndex = to;
  next.confirmCount = 0;
  next.lastAdvanceDate = dateISO;
  next.cooldownUntil = undefined;
  events.push({ type: "advanced", slotId: slot.id, from, to, mode });
  return { state: next, events };
}

// ---------------------------------------------------------------------------
// Ghost values

export interface GhostSet {
  value: number | null;
  weightKg: number | null;
  rir: number | null;
}

/** ghost: previous-session per-set display values (nulls when no history) — addendum-2 §1.3 log record shape, doc 03 §1.2 double-progression display. */
export function ghost(lastEntry?: EntryLog, setCount?: number): GhostSet[] {
  const n = Math.max(setCount ?? 0, lastEntry?.sets.length ?? 0);
  return Array.from({ length: n }, (_, i) => {
    const s = lastEntry?.sets[i];
    return {
      value: s ? s.value : null,
      weightKg: s?.weightKg ?? null,
      rir: s?.rir ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Rest

/** restSuggestion: seconds of rest per addendum-2 §2 rest defaults (band 150/120/90 s; quasi-iso/timed 60 s; iso-overcoming per §5; rounds use the slot's printed rest). */
export function restSuggestion(slot: Slot, repBand: RepBand, config: PlanConfig): number {
  switch (slot.type ?? "chain") {
    case "quasi_iso":
    case "timed_hold":
      return config.restSecTimed;
    case "iso_overcoming":
      return config.restSecIso;
    case "rounds":
      return slot.restSec ?? config.restSecTimed;
    default:
      return config.restSecByBand[repBand];
  }
}

// ---------------------------------------------------------------------------
// Deload

/** Deload prescription: 50% sets at 90% load, RIR 4–5, chain advancement disabled — doc 03 §8.1/§14 (PLAN.md rule 7: never full rest). */
export const DELOAD_PRESCRIPTION = {
  setMult: 0.5,
  loadMult: 0.9,
  rirMin: 4,
  rirMax: 5,
  chainAdvancement: false,
} as const;

export interface DeloadCheck {
  due: boolean;
  reasons: string[];
}

/**
 * deloadCheck: pragmatic reduction of doc 03 §8.3's weighted trigger table to 3 OR-ed triggers
 * an offline log can actually compute:
 *  1. ≥ 6 training weeks since the last deload marker (a session whose notes contain "deload"),
 *     or since the first logged session when no marker exists (doc 03 §8.3 time trigger).
 *  2. Performance regression: ≥ 2 distinct slots reverted (stepIndex increased between sessions)
 *     within the last 14 days (doc 03 §8.3 performance-drop trigger, weight-3 signal).
 *  3. User-flagged fatigue: the `fatigueFlagged` param, or a session note containing "fatigue"
 *     within the last 7 days (placeholder for doc 03 §8.3 subjective readiness — sleep/sRPE
 *     streams are not collected yet).
 * SIMPLIFICATIONS (documented deviations from doc 03 §8.3): the weighted score (fire at ≥ 5) is
 * collapsed to a plain OR; sRPE trend, sleep, per-muscle MRV and ACWR inputs are omitted.
 */
export function deloadCheck(
  recentSessions: SessionLog[],
  now: string,
  fatigueFlagged = false,
): DeloadCheck {
  const reasons: string[] = [];
  if (recentSessions.length === 0) return { due: false, reasons };

  const sorted = [...recentSessions].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  // 1. Time since last deload marker.
  const lastDeload = [...sorted].reverse().find((s) => /deload/i.test(s.notes ?? ""));
  const baseline = lastDeload ? lastDeload.date : sorted[0].date;
  const weeks = daysBetween(baseline, now) / 7;
  if (weeks >= 6) {
    reasons.push(`${Math.floor(weeks)} weeks since last deload (>=6-week trigger)`);
  }

  // 2. Performance regression: distinct slots whose stepIndex increased within 14 days of now.
  const bySlot = new Map<string, { date: string; stepIndex: number }[]>();
  for (const session of sorted) {
    for (const e of session.entries) {
      const rows = bySlot.get(e.slotId) ?? [];
      rows.push({ date: session.date, stepIndex: e.stepIndex });
      bySlot.set(e.slotId, rows);
    }
  }
  let revertedSlots = 0;
  for (const rows of bySlot.values()) {
    const reverted = rows.some(
      (row, i) =>
        i > 0 && row.stepIndex > rows[i - 1].stepIndex && daysBetween(row.date, now) <= 14,
    );
    if (reverted) revertedSlots += 1;
  }
  if (revertedSlots >= 2) {
    reasons.push(`${revertedSlots} slots reverted within 14 days (performance regression)`);
  }

  // 3. User-flagged fatigue placeholder.
  const notedFatigue = sorted.some(
    (s) => daysBetween(s.date, now) <= 7 && /fatigue/i.test(s.notes ?? ""),
  );
  if (fatigueFlagged || notedFatigue) {
    reasons.push("user-flagged fatigue");
  }

  return { due: reasons.length > 0, reasons };
}
