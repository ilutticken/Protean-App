// Pure scoring math for the assessment engine.
// Sources: docs/research/04-assessment-domains.md (§2 axes, §3.10 aerobic formulas,
// §4.2 criterion-anchor scoring, §4.6 symmetry ratios, §4.7 composite rules).
// No imports from other agents' modules — every number arrives as an input.

import type { Sex } from "./types";

// ---------------------------------------------------------------------------
// Local types (not present in src/lib/types.ts — flagged to the integrator)

/** "higher" = bigger raw is better (reps, cm, kg); "lower" = smaller raw is better (times). */
export type ScoreDirection = "higher" | "lower";

/**
 * One test's criterion anchors (doc 04 §4.2): raw values aligned 1:1 with anchor scores.
 * raw is strictly increasing for "higher" tests, strictly decreasing for "lower" tests;
 * scores are strictly increasing within 0–100.
 */
export interface AnchorSet {
  raw: number[];
  scores: number[];
  direction: ScoreDirection;
}

/** The 7 radar axes (doc 04 §2). */
export type AxisId =
  | "max_strength"
  | "relative_strength"
  | "power"
  | "strength_endurance"
  | "skill_balance"
  | "mobility"
  | "aerobic";

/** Canonical axis order for rendering (doc 04 §2 table order). */
export const AXIS_ORDER: AxisId[] = [
  "max_strength",
  "relative_strength",
  "power",
  "strength_endurance",
  "skill_balance",
  "mobility",
  "aerobic",
];

/** Axis display labels, verbatim from doc 04 §2. */
export const AXIS_LABELS: Record<AxisId, string> = {
  max_strength: "Maximal strength",
  relative_strength: "Relative strength",
  power: "Explosive power",
  strength_endurance: "Strength-endurance",
  skill_balance: "Skill & balance",
  mobility: "Mobility",
  aerobic: "Aerobic capacity",
};

/**
 * Anchor scores for 5-tier Beg/Nov/Int/Adv/Elite lift anchors
 * (doc 04 §4.2 label mapping: Beginner 25 / Novice 45 / Intermediate 60 / Advanced 80 / Elite 92).
 */
export const LIFT_TIER_SCORES = [25, 45, 60, 80, 92];

// ---------------------------------------------------------------------------
// Piecewise criterion-anchor scoring

function clamp0100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/** Criterion-anchor piecewise-linear score, clamped 0–100 — doc 04 §4.2 option 3 (the workhorse). */
export function piecewiseScore(
  anchorsRaw: number[],
  anchorScores: number[],
  raw: number,
  direction: ScoreDirection,
): number {
  const n = anchorsRaw.length;
  if (n === 0 || n !== anchorScores.length) {
    throw new Error("piecewiseScore: anchorsRaw and anchorScores must have the same non-zero length");
  }
  // Normalize to an ascending problem: negate raws for lower-is-better tests.
  const sign = direction === "lower" ? -1 : 1;
  const xs = anchorsRaw.map((a) => sign * a);
  for (let i = 1; i < n; i++) {
    if (!(xs[i] > xs[i - 1])) {
      throw new Error("piecewiseScore: anchors must be strictly monotonic in the scoring direction");
    }
  }
  const x = sign * raw;
  if (x <= xs[0]) return clamp0100(anchorScores[0]);
  if (x >= xs[n - 1]) return clamp0100(anchorScores[n - 1]);
  let i = 0;
  while (x >= xs[i + 1]) i++;
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  return clamp0100(anchorScores[i] + t * (anchorScores[i + 1] - anchorScores[i]));
}

/** Convenience: score a raw result against an AnchorSet (doc 04 §4.2). */
export function scoreAgainst(set: AnchorSet, raw: number): number {
  return piecewiseScore(set.raw, set.scores, raw, set.direction);
}

// ---------------------------------------------------------------------------
// Aerobic formulas

/** Cooper 12-min run VO2max (ml/kg/min) = (distance_m − 504.9) / 44.73 — doc 04 §3.10. */
export function vo2Cooper(distanceM: number): number {
  return (distanceM - 504.9) / 44.73;
}

/** Léger 1988 20 m beep-test VO2max (adults) = 5.857 × speed_kmh − 19.458 — doc 04 §3.10. */
export function vo2Leger(speedKmh: number): number {
  return 5.857 * speedKmh - 19.458;
}

/** Beep-test shuttle speed for a level: speed_kmh = 8.0 + 0.5 × level (level 1 = 8.5) — doc 04 §3.10. */
export function legerSpeedForLevel(level: number): number {
  return 8.0 + 0.5 * level;
}

// ---------------------------------------------------------------------------
// Radar (7 axes, each 0–100 vs the athlete's own sex reference — doc 04 §2, §4.4, §4.7)

/** Anchor bundle the caller supplies per sex (e.g. norms.radarAnchorsBySex[sex]). */
export interface RadarAnchors {
  verticalJump: AnchorSet;
  broadJump: AnchorSet;
  pushup: AnchorSet;
  pullup: AnchorSet;
  plank: AnchorSet;
  balanceEc: AnchorSet;
  sitAndReach: AnchorSet;
  vo2max: AnchorSet;
}

/** One lift's e1RM aggregate plus this athlete's absolute (kg) anchors for it. */
export interface LiftScoreInput {
  id: string;
  /** Canonical e1RM in kg (doc 06-addendum-3 §2.2), computed upstream — never here. */
  e1rmKg: number;
  /** Per-sex absolute anchor values in kg, ascending (e.g. standards-lookup output). */
  anchorsKg: number[];
  /** Defaults to LIFT_TIER_SCORES. */
  anchorScores?: number[];
}

/** One lift expressed as a bodyweight ratio plus the matching ×BW anchors. */
export interface RatioScoreInput {
  id: string;
  /** e1RM ÷ BW (ADDED ÷ BW for weighted pull-up/dip — anchors may be negative = assisted). */
  ratio: number;
  anchorsRatio: number[];
  /** Defaults to LIFT_TIER_SCORES. */
  anchorScores?: number[];
}

export interface RadarInput {
  anchors: RadarAnchors;
  /** Max-strength axis: e1RM aggregates per pattern lift (doc 04 §2 axis 1). */
  maxStrengthLifts?: LiftScoreInput[];
  /** Relative-strength axis: ×BW ratios (doc 04 §2 axis 2). */
  relStrengthLifts?: RatioScoreInput[];
  verticalJumpCm?: number;
  broadJumpCm?: number;
  pushupMax?: number;
  pullupMax?: number;
  plankSec?: number;
  /** Best single-leg eyes-closed balance time (s), cap 45 (doc 04 §3.11). */
  balanceEcSec?: number;
  /** 0–100 skill points from the balance/acrobatics skill-tree sector, supplied by caller. */
  skillPoints?: number;
  sitAndReachCm?: number;
  /** Pass/fail mobility screens (doc 04 §2 axis 6 "later shoulder/hip screens"). */
  mobilityChecks?: { passed: number; total: number };
  cooperDistanceM?: number;
  /** Final beep-test speed in km/h (use legerSpeedForLevel to convert a level). */
  legerSpeedKmh?: number;
}

export interface RadarAxis {
  id: AxisId;
  label: string;
  /** null = nothing logged for this axis; never a fake zero (doc 04 §4.7 confidence rule). */
  score: number | null;
  detail: string;
}

export interface RadarResult {
  axes: RadarAxis[];
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function axisFrom(id: AxisId, comps: Array<[string, number]>): RadarAxis {
  const label = AXIS_LABELS[id];
  if (comps.length === 0) return { id, label, score: null, detail: "no data" };
  return {
    id,
    label,
    score: mean(comps.map(([, v]) => v)),
    detail: comps.map(([name, v]) => `${name} ${Math.round(v)}`).join(" · "),
  };
}

/** 7-axis radar: each axis = unweighted mean of its available 0–100 component scores — doc 04 §2, §4.7. */
export function radar(input: RadarInput): RadarResult {
  const a = input.anchors;
  const comps: Record<AxisId, Array<[string, number]>> = {
    max_strength: (input.maxStrengthLifts ?? []).map((l) => [
      l.id,
      piecewiseScore(l.anchorsKg, l.anchorScores ?? LIFT_TIER_SCORES, l.e1rmKg, "higher"),
    ]),
    relative_strength: (input.relStrengthLifts ?? []).map((l) => [
      l.id,
      piecewiseScore(l.anchorsRatio, l.anchorScores ?? LIFT_TIER_SCORES, l.ratio, "higher"),
    ]),
    power: [],
    strength_endurance: [],
    skill_balance: [],
    mobility: [],
    aerobic: [],
  };

  if (input.verticalJumpCm !== undefined) {
    comps.power.push(["vertical jump", scoreAgainst(a.verticalJump, input.verticalJumpCm)]);
  }
  if (input.broadJumpCm !== undefined) {
    comps.power.push(["broad jump", scoreAgainst(a.broadJump, input.broadJumpCm)]);
  }

  if (input.pushupMax !== undefined) {
    comps.strength_endurance.push(["push-ups", scoreAgainst(a.pushup, input.pushupMax)]);
  }
  if (input.pullupMax !== undefined) {
    comps.strength_endurance.push(["pull-ups", scoreAgainst(a.pullup, input.pullupMax)]);
  }
  if (input.plankSec !== undefined) {
    comps.strength_endurance.push(["plank", scoreAgainst(a.plank, input.plankSec)]);
  }

  if (input.balanceEcSec !== undefined) {
    comps.skill_balance.push(["balance EC", scoreAgainst(a.balanceEc, input.balanceEcSec)]);
  }
  if (input.skillPoints !== undefined) {
    comps.skill_balance.push(["skill tree", clamp0100(input.skillPoints)]);
  }

  if (input.sitAndReachCm !== undefined) {
    comps.mobility.push(["sit-and-reach", scoreAgainst(a.sitAndReach, input.sitAndReachCm)]);
  }
  if (input.mobilityChecks !== undefined && input.mobilityChecks.total > 0) {
    comps.mobility.push([
      "screens",
      clamp0100((100 * input.mobilityChecks.passed) / input.mobilityChecks.total),
    ]);
  }

  // Aerobic: best available VO2max estimate (Cooper or Léger), scored vs VO2 anchors.
  let vo2Best: [string, number] | null = null;
  if (input.cooperDistanceM !== undefined) {
    vo2Best = ["Cooper", vo2Cooper(input.cooperDistanceM)];
  }
  if (input.legerSpeedKmh !== undefined) {
    const v = vo2Leger(input.legerSpeedKmh);
    if (vo2Best === null || v > vo2Best[1]) vo2Best = ["beep", v];
  }
  if (vo2Best !== null) {
    comps.aerobic.push([
      `VO2max ${vo2Best[1].toFixed(1)} (${vo2Best[0]})`,
      scoreAgainst(a.vo2max, vo2Best[1]),
    ]);
  }

  return { axes: AXIS_ORDER.map((id) => axisFrom(id, comps[id])) };
}

// ---------------------------------------------------------------------------
// Symmetry & balance flag engine (doc 04 §4.6, ratio targets per §5 SymStr reverse-engineering)

export type SymmetryStatus = "ok" | "warn" | "flag";

export interface SymmetryFlag {
  id: string;
  name: string;
  ratio: number;
  /** Inclusive healthy band; Infinity = unbounded above. */
  healthy: [number, number];
  status: SymmetryStatus;
}

export interface SymmetryE1rms {
  squat?: number;
  deadlift?: number;
  bench?: number;
  row?: number;
  ohp?: number;
  /** Pull-up / dip TOTALS including bodyweight — doc 04 §4.6 "Pull-up(+BW) : Dip(+BW)". */
  pullupPlusBwKg?: number;
  dipPlusBwKg?: number;
  /** H:Q proxies in any consistent unit pair (in-app proxy: Nordic tier + RDL vs squat pattern scores). */
  hamstring?: number;
  quad?: number;
}

export interface UnilateralBest {
  /** e.g. "grip", "sl_wall_sit", "balance_ec", "pistol" */
  id: string;
  left: number;
  right: number;
}

export interface SymmetryInput {
  sex: Sex;
  e1rm?: SymmetryE1rms;
  unilateral?: UnilateralBest[];
}

function judge(ratio: number, healthy: [number, number], flagBand: [number, number]): SymmetryStatus {
  if (ratio >= healthy[0] && ratio <= healthy[1]) return "ok";
  if (ratio >= flagBand[0] && ratio <= flagBand[1]) return "warn";
  return "flag";
}

/** Ratio/symmetry flag engine — doc 04 §4.6 table (squat:dead 0.87M/0.84F, bench:dead 0.65/0.57, H:Q ≥0.60, LSI ≥0.90, push:pull). */
export function symmetryFlags(input: SymmetryInput): SymmetryFlag[] {
  const e = input.e1rm ?? {};
  const m = input.sex === "male";
  const INF = Number.POSITIVE_INFINITY;
  const out: SymmetryFlag[] = [];

  const add = (
    id: string,
    name: string,
    num: number | undefined,
    den: number | undefined,
    healthy: [number, number],
    flagBand: [number, number],
  ): void => {
    if (num === undefined || den === undefined || den <= 0) return;
    const ratio = num / den;
    out.push({ id, name, ratio, healthy, status: judge(ratio, healthy, flagBand) });
  };

  // Squat:Deadlift — healthy M 0.83–0.90 / F 0.80–0.88 (means 0.87/0.84); flag <0.75 or >1.00.
  add("squat_deadlift", "Squat : Deadlift (e1RM)", e.squat, e.deadlift, m ? [0.83, 0.9] : [0.8, 0.88], [0.75, 1.0]);
  // Bench:Deadlift — target M 0.65 / F 0.57, flagged beyond ±0.12 from target (band = flag band).
  add("bench_deadlift", "Bench : Deadlift (e1RM)", e.bench, e.deadlift, m ? [0.53, 0.77] : [0.45, 0.69], m ? [0.53, 0.77] : [0.45, 0.69]);
  // OHP:Bench — healthy 0.60–0.68; flag <0.55.
  add("ohp_bench", "OHP : Bench (e1RM)", e.ohp, e.bench, [0.6, 0.68], [0.55, INF]);
  // Bench:Row (HPUSH:HPULL) — healthy 1.0–1.1; flag when row e1RM <85% of bench (ratio >1/0.85).
  add("push_pull", "Bench : Row (push : pull)", e.bench, e.row, [1.0, 1.1], [0, 1 / 0.85]);
  // Pull-up(+BW):Dip(+BW) — healthy 0.85–1.05; flag <0.80.
  add("pullup_dip", "Pull-up(+BW) : Dip(+BW)", e.pullupPlusBwKg, e.dipPlusBwKg, [0.85, 1.05], [0.8, INF]);
  // Hamstring:Quad conventional — healthy ≥0.60; <0.60 = injury-risk flag (no warn zone).
  add("hq", "Hamstring : Quad", e.hamstring, e.quad, [0.6, INF], [0.6, INF]);

  // Limb Symmetry Index: min/max — healthy ≥0.90; <0.90 warn; <0.85 act (flag).
  for (const u of input.unilateral ?? []) {
    const hi = Math.max(u.left, u.right);
    const lo = Math.min(u.left, u.right);
    if (hi <= 0) continue;
    const ratio = lo / hi;
    out.push({
      id: `lsi_${u.id}`,
      name: `L:R symmetry (${u.id})`,
      ratio,
      healthy: [0.9, 1],
      status: judge(ratio, [0.9, 1], [0.85, 1]),
    });
  }

  return out;
}
