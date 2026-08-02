// Derived-data selectors: bridge the raw log (sessions, tests, liftLog) to the
// pure engines (strength, scoring, skilltree). This is the "producer" layer the
// integration report called for — see docs/PLAN.md.

import type {
  AppData,
  Athlete,
  AthleteState,
  SessionLog,
  Sex,
  Slot,
  TestResult,
} from "./types";
import { seedPlan } from "../data/seed-plan";
import { plan } from "../data/prescription";
import { exercises, standardsKeyByExercise, type StandardsLiftKey } from "../data/exercises";
import { skills } from "../data/skills";
import { skillExerciseAlias } from "../data/skill-exercise-alias";
import { computeSkillStatuses, sectorCompletion, type ExerciseBest, type SessionSets } from "./skilltree";
import { locomotionBestFrom } from "./locomotion";
import { e1rm, bwExerciseLoad, standardsLevel, type StandardsLevelResult } from "./strength";
import { radarAnchorsBySex } from "../data/norms";
import type { RadarInput } from "./scoring";
import { legerSpeedForLevel } from "./scoring";
import type { TrendPoint } from "../ui/components/TrendChart";
import { localISODate } from "./dates";

// ---------------------------------------------------------------------------
// Plan helpers

/** Keyed off the PRESCRIBED plan (prescription.ts), not the raw PDF transcription. */
export const slotById: Record<string, Slot> = {};
for (const day of Object.values(plan.days)) {
  for (const slot of day) slotById[slot.id] = slot;
}

export function athleteSessions(sessions: SessionLog[], athleteId: string): SessionLog[] {
  return sessions.filter((s) => s.athleteId === athleteId).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Next planned training day: rotate weekOrder from the athlete's last logged day. */
export function nextDayId(sessions: SessionLog[], athleteId: string): (typeof seedPlan.config.weekOrder)[number] {
  const order = seedPlan.config.weekOrder;
  const mine = athleteSessions(sessions, athleteId);
  const last = mine[mine.length - 1];
  if (!last) return order[0];
  const ix = order.indexOf(last.dayId);
  return order[(ix + 1) % order.length];
}

/** Was `slot` performed as seconds (hold) rather than reps-like units? */
function isHoldSlot(slot: Slot | undefined): boolean {
  if (!slot) return false;
  return slot.type === "quasi_iso" || slot.type === "timed_hold" || slot.unit === "seconds";
}

// ---------------------------------------------------------------------------
// Bests per exercise (feeds the skill tree)

export function bestByExercise(
  sessions: SessionLog[],
  state: AthleteState,
  athleteId: string,
): Record<string, ExerciseBest> {
  const out: Record<string, ExerciseBest> = {};
  const sessionKeys: Record<string, Map<string, SessionSets>> = {};
  const bump = (id: string, patch: Partial<ExerciseBest>) => {
    const b = (out[id] ??= {});
    if (patch.maxRepsPerSet !== undefined)
      b.maxRepsPerSet = Math.max(b.maxRepsPerSet ?? 0, patch.maxRepsPerSet);
    if (patch.maxHoldSec !== undefined) b.maxHoldSec = Math.max(b.maxHoldSec ?? 0, patch.maxHoldSec);
    if (patch.maxWeightKg !== undefined)
      b.maxWeightKg = Math.max(b.maxWeightKg ?? 0, patch.maxWeightKg);
  };
  // Weighted criteria need reps and weight from the SAME set (review finding #15):
  // keep a small Pareto frontier of (reps, weightKg) pairs per exercise.
  const pair = (id: string, reps: number, weightKg: number) => {
    if (!Number.isFinite(reps) || !Number.isFinite(weightKg) || reps <= 0) return;
    const b = (out[id] ??= {});
    const list = (b.weightedSetBests ??= []);
    if (list.some((p) => p.reps >= reps && p.weightKg >= weightKg)) return; // dominated
    const kept = list.filter((p) => !(p.reps <= reps && p.weightKg <= weightKg));
    kept.push({ reps, weightKg });
    b.weightedSetBests = kept.slice(-12);
  };
  // Per-session set values: a criterion's `sets` is a real requirement (doc 01 R-DYN,
  // "3 sets x 8 in ONE session"), so the engine needs sets grouped by session, not just
  // all-time maxima.
  const session = (id: string, sessionKey: string): SessionSets => {
    const b = (out[id] ??= {});
    const list = (b.sessions ??= []);
    const seen = (sessionKeys[id] ??= new Map<string, SessionSets>());
    let rec = seen.get(sessionKey);
    if (!rec) {
      rec = { reps: [], holds: [], pairs: [] };
      seen.set(sessionKey, rec);
      list.push(rec);
    }
    return rec;
  };

  for (const s of athleteSessions(sessions, athleteId)) {
    for (const e of s.entries) {
      const slot = slotById[e.slotId];
      const hold = isHoldSlot(slot);
      const rec = session(e.exerciseId, s.id);
      for (const set of e.sets) {
        if (hold) {
          bump(e.exerciseId, { maxHoldSec: set.value });
          rec.holds.push(set.value);
        } else {
          bump(e.exerciseId, { maxRepsPerSet: set.value });
          rec.reps.push(set.value);
        }
        if (set.weightKg !== undefined) {
          bump(e.exerciseId, { maxWeightKg: set.weightKg });
          if (!hold) {
            pair(e.exerciseId, set.value, set.weightKg);
            rec.pairs.push({ reps: set.value, weightKg: set.weightKg });
          }
        }
      }
    }
  }
  // Quick-logged lifts group by DATE — several entries on one day are one testing session.
  for (const l of state.liftLog ?? []) {
    bump(l.exerciseId, { maxRepsPerSet: l.reps, maxWeightKg: l.weightKg });
    pair(l.exerciseId, l.reps, l.weightKg);
    const rec = session(l.exerciseId, `lift:${l.date}`);
    rec.reps.push(l.reps);
    rec.pairs.push({ reps: l.reps, weightKg: l.weightKg });
  }
  // Republish source bests (weightedSetBests pairs included) under the aliased skill-node
  // ids so on-ramp rungs auto-achieve — skilltree.criterionMet keys on node.id, and these
  // node ids are not exercise ids. Never clobbers a key that carries its own logged data.
  for (const nodeId in skillExerciseAlias) {
    if (out[nodeId] !== undefined) continue;
    const src = out[skillExerciseAlias[nodeId]];
    if (src !== undefined) out[nodeId] = src;
  }
  return out;
}

// ---------------------------------------------------------------------------
// e1RM aggregation (feeds standards, radar, stunt unlocks, trend charts)

export interface LiftAggregate {
  key: StandardsLiftKey;
  /** Best canonical e1RM (kg). For weighted pull-up/dip this is ADDED weight (may be negative). */
  e1rmKg: number;
  /** Per-session best e1RM series for the trend chart. */
  series: TrendPoint[];
  level: StandardsLevelResult;
}

/** Added-weight lifts whose standards tables are ADDED kg, not total. */
const ADDED_WEIGHT_KEYS: ReadonlySet<StandardsLiftKey> = new Set(["weighted_pullup", "weighted_dip"]);

/**
 * Best e1RM per standards lift from sessions + quick lift log. Bodyweight-leveraged
 * lifts convert via bwLoadFactor (addendum-3): total = factor·BW + added; the
 * added-weight e1RM reported for pull-up/dip standards is e1RM(total) − factor·BW.
 */
export function liftAggregates(
  sessions: SessionLog[],
  state: AthleteState,
  athlete: Athlete,
): Partial<Record<StandardsLiftKey, LiftAggregate>> {
  // gather raw (date, weightKg-for-e1rm, reps) per standards key
  const raw: Partial<Record<StandardsLiftKey, { date: string; load: number; reps: number }[]>> = {};
  const push = (exerciseId: string, date: string, weightKg: number | undefined, reps: number) => {
    const key = standardsKeyByExercise[exerciseId];
    if (!key || !Number.isFinite(reps) || reps <= 0 || reps > 15) return;
    if (weightKg !== undefined && !Number.isFinite(weightKg)) return;
    const ex = exercises[exerciseId];
    let load: number;
    if (ex?.bwLoadFactor !== undefined) {
      load = bwExerciseLoad(athlete.bodyweightKg, weightKg ?? 0, ex.bwLoadFactor);
    } else {
      if (weightKg === undefined || weightKg <= 0) return;
      load = weightKg;
    }
    (raw[key] ??= []).push({ date, load, reps });
  };

  for (const s of athleteSessions(sessions, athlete.id)) {
    for (const e of s.entries) {
      const slot = slotById[e.slotId];
      if (isHoldSlot(slot)) continue;
      for (const set of e.sets) push(e.exerciseId, s.date, set.weightKg, set.value);
    }
  }
  for (const l of state.liftLog ?? []) push(l.exerciseId, l.date, l.weightKg, l.reps);

  const out: Partial<Record<StandardsLiftKey, LiftAggregate>> = {};
  for (const key of Object.keys(raw) as StandardsLiftKey[]) {
    const factorOffset = ADDED_WEIGHT_KEYS.has(key) ? 0.956 * athlete.bodyweightKg : 0;
    const perDate = new Map<string, { value: number; flagged: boolean }>();
    let best = -Infinity;
    for (const r of raw[key]!) {
      const res = e1rm(r.load, r.reps);
      if (res.value === null) continue;
      const v = Math.round((res.value - factorOffset) * 10) / 10;
      // Locked decision 1: 11-15-rep estimates are display-only — they never set
      // the headline e1RM, standards level, or stunt unlocks (review finding #14).
      if (res.confidence === "full") best = Math.max(best, v);
      const prev = perDate.get(r.date);
      if (!prev || v > prev.value) perDate.set(r.date, { value: v, flagged: res.confidence === "flagged" });
    }
    if (best === -Infinity) continue;
    const series: TrendPoint[] = [...perDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, p]) => ({ date, value: p.value, flagged: p.flagged }));
    out[key] = {
      key,
      e1rmKg: best,
      series,
      level: standardsLevel(key, athlete.sex, athlete.bodyweightKg, best),
    };
  }
  return out;
}

/** e1RM record keyed the way the skill tree expects (squat/bench/deadlift/ohp/…). */
export function e1rmByLiftForTree(
  aggs: Partial<Record<StandardsLiftKey, LiftAggregate>>,
  bodyweightKg: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  const map: [string, StandardsLiftKey][] = [
    ["squat", "back_squat"],
    ["bench", "bench_press"],
    ["deadlift", "deadlift"],
    ["ohp", "ohp"],
  ];
  for (const [treeKey, stdKey] of map) {
    const a = aggs[stdKey];
    if (a) out[treeKey] = a.e1rmKg;
  }
  // weighted pull-up/dip aggregates are ADDED weight; tree ratio criteria for
  // power_clean/clean_and_press/snatch have no producer yet (manual marking).
  void bodyweightKg;
  return out;
}

// ---------------------------------------------------------------------------
// Skill tree wiring

export function skillStatuses(data: AppData, athlete: Athlete, state: AthleteState) {
  const bests = bestByExercise(data.sessions, state, athlete.id);
  const aggs = liftAggregates(data.sessions, state, athlete);
  return computeSkillStatuses({
    skills,
    manual: state.skillProgress,
    bestByExercise: bests,
    e1rmByLift: e1rmByLiftForTree(aggs, athlete.bodyweightKg),
    // The routine has no running or swimming, so the cardio log is the only producer
    // for `time` / `distance` criteria — without this, 41 nodes are permanently locked.
    locomotionBest: locomotionBestFrom(state.cardioLog),
    bodyweightKg: athlete.bodyweightKg,
    sex: athlete.sex,
  });
}

// ---------------------------------------------------------------------------
// Tests

export function latestTest(tests: TestResult[], athleteId: string, testId: string): TestResult | undefined {
  return tests
    .filter((t) => t.athleteId === athleteId && t.testId === testId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

// ---------------------------------------------------------------------------
// Radar input (integration note: anchorsKg from live standards lookup, not frozen tables)

export function radarInputFor(data: AppData, athlete: Athlete, state: AthleteState): RadarInput {
  const sex: Sex = athlete.sex;
  const bw = athlete.bodyweightKg;
  const aggs = liftAggregates(data.sessions, state, athlete);
  const t = (id: string) => latestTest(data.tests, athlete.id, id)?.value;

  const maxKeys: StandardsLiftKey[] = ["back_squat", "bench_press", "deadlift", "ohp", "barbell_row", "weighted_pullup", "weighted_dip"];
  const maxStrengthLifts = maxKeys
    .filter((k) => aggs[k])
    .map((k) => ({
      id: k,
      e1rmKg: aggs[k]!.e1rmKg,
      anchorsKg: [...aggs[k]!.level.interpolatedThresholds],
    }));
  const relStrengthLifts = maxKeys
    .filter((k) => aggs[k] && !ADDED_WEIGHT_KEYS.has(k))
    .map((k) => ({
      id: k,
      ratio: aggs[k]!.e1rmKg / bw,
      anchorsRatio: aggs[k]!.level.interpolatedThresholds.map((x) => x / bw),
    }));

  const statuses = skillStatuses(data, athlete, state);
  const sectors = sectorCompletion(statuses, skills);
  const bal = sectors.balance;
  const skillPoints = bal.total > 0 ? (100 * bal.achieved) / bal.total : undefined;

  const beepLevel = t("beep_test");
  return {
    anchors: radarAnchorsBySex[sex],
    maxStrengthLifts,
    relStrengthLifts,
    verticalJumpCm: t("vertical_jump"),
    broadJumpCm: t("broad_jump"),
    pushupMax: t("pushup_max"),
    pullupMax: t("pullup_max"),
    plankSec: t("plank_hold"),
    balanceEcSec: t("balance_ec_single_leg"),
    skillPoints,
    sitAndReachCm: t("sit_and_reach"),
    cooperDistanceM: t("cooper_12min"),
    legerSpeedKmh: beepLevel !== undefined ? legerSpeedForLevel(beepLevel) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Heatmap, streaks, PRs

export function heatmapValues(sessions: SessionLog[], athleteId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of athleteSessions(sessions, athleteId)) {
    out[s.date] = (out[s.date] ?? 0) + s.entries.reduce((n, e) => n + e.sets.length, 0);
  }
  return out;
}

function mondayOf(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return localISODate(d);
}

export interface StreakInfo {
  /** consecutive completed weeks (before this one) with >= target sessions */
  current: number;
  longest: number;
  thisWeek: number;
  target: number;
}

/** Weekly schedule-relative streak (doc 05 §2): >=4 sessions/week, never daily. */
export function weeklyStreak(sessions: SessionLog[], athleteId: string, todayISO: string): StreakInfo {
  const target = 4;
  const byWeek = new Map<string, Set<string>>();
  for (const s of athleteSessions(sessions, athleteId)) {
    const wk = mondayOf(s.date);
    if (!byWeek.has(wk)) byWeek.set(wk, new Set());
    byWeek.get(wk)!.add(s.date);
  }
  const thisMonday = mondayOf(todayISO);
  const thisWeek = byWeek.get(thisMonday)?.size ?? 0;
  let current = 0;
  const cursor = new Date(thisMonday + "T12:00:00");
  for (;;) {
    cursor.setDate(cursor.getDate() - 7);
    const wk = localISODate(cursor);
    if ((byWeek.get(wk)?.size ?? 0) >= target) current += 1;
    else break;
  }
  let longest = 0;
  let run = 0;
  const weeks = [...byWeek.keys()].sort();
  if (weeks.length) {
    const start = new Date(weeks[0] + "T12:00:00");
    const end = new Date(thisMonday + "T12:00:00");
    for (let d = start; d < end; d.setDate(d.getDate() + 7)) {
      const wk = localISODate(d);
      if ((byWeek.get(wk)?.size ?? 0) >= target) {
        run += 1;
        longest = Math.max(longest, run);
      } else run = 0;
    }
  }
  longest = Math.max(longest, current);
  return { current, longest, thisWeek, target };
}

export interface PrEvent {
  date: string;
  exerciseId: string;
  label: string;
}

/** Recent PRs for this athlete (doc 05 §5.2 relatedness). */
export function prFeed(data: AppData, limit = 6): PrEvent[] {
  const events: PrEvent[] = [];
  const athleteId = data.athlete?.id;
  if (!athleteId) return events;
  // Compare each session against the PRE-session best, then merge — otherwise
  // ascending sets within the first session fire bogus PRs (review finding #18).
  const best: Record<string, { reps: number; hold: number; kg: number }> = {};
  for (const s of athleteSessions(data.sessions, athleteId)) {
    const sessionMax: Record<string, { reps: number; hold: number; kg: number }> = {};
    for (const e of s.entries) {
      const hold = isHoldSlot(slotById[e.slotId]);
      const m = (sessionMax[e.exerciseId] ??= { reps: 0, hold: 0, kg: 0 });
      for (const set of e.sets) {
        if (hold) m.hold = Math.max(m.hold, set.value);
        else m.reps = Math.max(m.reps, set.value);
        if (set.weightKg !== undefined) m.kg = Math.max(m.kg, set.weightKg);
      }
    }
    for (const [exId, m] of Object.entries(sessionMax)) {
      const b = (best[exId] ??= { reps: 0, hold: 0, kg: 0 });
      const name = exercises[exId]?.name ?? exId;
      if (b.hold > 0 && m.hold > b.hold)
        events.push({ date: s.date, exerciseId: exId, label: `${name} ${m.hold}s hold` });
      if (b.reps > 0 && m.reps > b.reps)
        events.push({ date: s.date, exerciseId: exId, label: `${name} ×${m.reps}` });
      if (b.kg > 0 && m.kg > b.kg)
        events.push({ date: s.date, exerciseId: exId, label: `${name} ${m.kg}kg` });
      b.hold = Math.max(b.hold, m.hold);
      b.reps = Math.max(b.reps, m.reps);
      b.kg = Math.max(b.kg, m.kg);
    }
  }
  return events.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

export { ADDED_WEIGHT_KEYS };
