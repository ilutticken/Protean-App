// Complete Protean skill tree: every progression line of doc 01 §6, the three
// addendum-1 sectors (acrobatics / ring strength / locomotion), the addendum-2 §4
// flagged steps, and the promoted dip line.
// Sources: docs/research/01-skill-progressions.md (§3, §4.1, §6),
//          docs/research/06-addendum-1.md (§1–§4), docs/research/06-addendum-2.md (§4).
// Conventions: node ids reuse the seed's exercise ids where addendum-2 §4 maps them,
// so logging auto-feeds the tree. ring 0 = line hub; rings increase toward the stunt.
// Every prereq has a strictly smaller ring than its dependent (enforced in tests).

import type { Criterion, EvidenceTier, Sector, SkillNode } from "../lib/types";
import type { SectorExtension } from "./skill-helpers";
import { sectorExtensions } from "./skills-ext";
import { RDYN_SETS, rdynRepsByExercise } from "./prescription";

// ---------------------------------------------------------------------------
// Local criterion constructors (plain-data helpers, not exported).

const hold = (seconds: number, sets?: number): Criterion => ({ kind: "hold", seconds, sets });
const reps = (count: number, sets?: number, perSide?: boolean): Criterion => ({
  kind: "reps",
  reps: count,
  sets,
  perSide,
});
const wreps = (count: number, bwRatio: number, sets?: number): Criterion => ({
  kind: "weighted-reps",
  reps: count,
  sets,
  bwRatio,
});
const e1rmRatio = (liftId: string, bwRatio: number): Criterion => ({ kind: "e1rm-ratio", liftId, bwRatio });
const timeUnder = (seconds: number, note?: string): Criterion => ({ kind: "time", seconds, note });
const distanceOf = (meters: number, note?: string): Criterion => ({ kind: "distance", meters, note });
/** NO_AUTO_UNLOCK (addendum-1 §0): user attestation is the only unlock path. */
const ATTESTED: Criterion = { kind: "attested" };

type NodeExtras = Partial<
  Pick<SkillNode, "isStunt" | "sa" | "surface" | "spotterRequired" | "estMonths" | "description">
> & { evidence?: EvidenceTier };

// Node constructor with tier-C default evidence (doc 01 §0.1: most skill criteria are tier C).
function node(
  id: string,
  name: string,
  sector: Sector,
  ring: number,
  criterion: Criterion,
  prereqs: string[],
  extras: NodeExtras = {},
): SkillNode {
  const { evidence = "C", ...rest } = extras;
  return { id, name, sector, ring, criterion, prereqs, evidence, ...rest };
}

// ---------------------------------------------------------------------------
// Locomotion per-sex time thresholds (addendum-1 §3.2, RunRepeat percentiles, tier B).
// Criterion on the node stores the MALE threshold; computeSkillStatuses consults this
// table for the athlete's sex. Seconds.

interface RunSpeedSpec {
  id: string;
  name: string;
  ring: number;
  prereq: string;
  male: number;
  female: number;
}

const runSpeedSpecs: RunSpeedSpec[] = [
  { id: "run_speed.5k_t2", name: "5K — Median Finisher (T2)", ring: 2, prereq: "run_distance.5k", male: 1888, female: 2248 },
  { id: "run_speed.5k_t3", name: "5K — Top 30% (T3)", ring: 3, prereq: "run_speed.5k_t2", male: 1678, female: 1999 },
  { id: "run_speed.5k_t4", name: "5K — Top 10% (T4)", ring: 4, prereq: "run_speed.5k_t3", male: 1406, female: 1704 },
  { id: "run_speed.5k_t5", name: "5K — Top 1% (T5)", ring: 5, prereq: "run_speed.5k_t4", male: 1050, female: 1299 },
  { id: "run_speed.10k_t2", name: "10K — Median Finisher (T2)", ring: 3, prereq: "run_distance.10k", male: 3435, female: 4014 },
  { id: "run_speed.10k_t3", name: "10K — Top 30% (T3)", ring: 4, prereq: "run_speed.10k_t2", male: 3148, female: 3662 },
  { id: "run_speed.10k_t4", name: "10K — Top 10% (T4)", ring: 5, prereq: "run_speed.10k_t3", male: 2711, female: 3215 },
  { id: "run_speed.10k_t5", name: "10K — Top 1% (T5)", ring: 6, prereq: "run_speed.10k_t4", male: 2064, female: 2472 },
  { id: "run_speed.half_t2", name: "Half Marathon — Median (T2)", ring: 4, prereq: "run_distance.half", male: 7188, female: 8643 },
  { id: "run_speed.half_t3", name: "Half Marathon — Top 30% (T3)", ring: 5, prereq: "run_speed.half_t2", male: 6903, female: 7945 },
  { id: "run_speed.half_t4", name: "Half Marathon — Top 10% (T4)", ring: 6, prereq: "run_speed.half_t3", male: 6035, female: 7021 },
  { id: "run_speed.half_t5", name: "Half Marathon — Top 1% (T5)", ring: 7, prereq: "run_speed.half_t4", male: 4717, female: 5755 },
  { id: "run_speed.marathon_t2", name: "Marathon — Median (T2)", ring: 5, prereq: "run_distance.marathon", male: 15269, female: 16929 },
  { id: "run_speed.marathon_t3", name: "Marathon — Top 30% (T3)", ring: 6, prereq: "run_speed.marathon_t2", male: 13987, female: 15624 },
  { id: "run_speed.marathon_t4", name: "Marathon — Top 10% (T4)", ring: 7, prereq: "run_speed.marathon_t3", male: 12160, female: 13762 },
  { id: "run_speed.marathon_t5", name: "Marathon — Top 1% (T5)", ring: 8, prereq: "run_speed.marathon_t4", male: 9858, female: 11495 },
];

/** Per-sex locomotion time thresholds (seconds) keyed by node id — addendum-1 §3.2 (tier B). */
/**
 * 2 km erg standards. NOT in the research corpus — indoor rowing was never covered — so
 * these are sourced fresh from indoor-rowing aggregators and carry evidence tier D:
 * population approximations, not a validated table like StrengthLevel.
 *   median   all-ages Concept2 logbook average: M 7:04, F 8:25
 *            [rowingregimen.com/blog/2000m-rowing-times]
 *   advanced M 6:30, F 7:45  [boxrox.com average-2000m-row-times-for-men / -for-women]
 *   elite    M sub-6:00, F sub-7:00 (competitive heavyweight band)
 *            [doubleedgefitness.com/unlocking-the-power-of-the-2k-row]
 * Seconds, lower is better; female values are slower, as skills.test.ts asserts.
 */
const rowSpeedSpecs: RunSpeedSpec[] = [
  { id: "row_speed.2k_median", name: "2K Erg Median", ring: 3, prereq: "row.2k", male: 424, female: 505 },
  { id: "row_speed.2k_advanced", name: "2K Erg Advanced", ring: 4, prereq: "row_speed.2k_median", male: 390, female: 465 },
  { id: "row_speed.2k_elite", name: "2K Erg Elite", ring: 5, prereq: "row_speed.2k_advanced", male: 360, female: 420 },
];

export const locomotionTimeBySex: Record<string, { male: number; female: number }> = Object.fromEntries(
  [...runSpeedSpecs, ...rowSpeedSpecs].map((s) => [s.id, { male: s.male, female: s.female }]),
);

/**
 * Female bwRatio replacements for e1rm-ratio / weighted-reps criteria, keyed by node id —
 * doc 01 §4.1 explicit ♀ criteria plus §6 line multipliers (squat ×0.72, bench/OHP ×0.70,
 * deadlift ×0.78, power ×0.80–0.85). Consulted by computeSkillStatuses when sex === "female".
 */
export const femaleBwRatioOverride: Record<string, number> = {
  "one_arm_pullup.wpu_50pct": 0.35, // doc 01 §4.1 weighted pull-up ½BW: ♀ +35%
  "dip.weighted_half_bw": 0.35, // doc 01 §4.1 weighted dip ½BW: ♀ +35%
  "barbell_squat.1_0xbw": 0.72,
  "barbell_squat.1_5xbw": 1.08,
  "barbell_squat.2_0xbw": 1.5, // doc 01 §4.1 explicit
  "barbell_squat.2_5xbw": 1.8,
  "barbell_bench.0_75xbw": 0.525,
  "barbell_bench.1_0xbw": 0.75, // doc 01 §4.1 explicit (bodyweight bench)
  "barbell_bench.1_5xbw": 1.05,
  "barbell_bench.2_0xbw": 1.4,
  "barbell_deadlift.1_5xbw": 1.17,
  "barbell_deadlift.2_0xbw": 1.5, // doc 01 §4.1 explicit
  "barbell_deadlift.2_5xbw": 1.95,
  "barbell_deadlift.3_0xbw": 2.25, // doc 01 §4.1 explicit
  "barbell_ohp.0_5xbw": 0.35,
  "barbell_ohp.0_75xbw": 0.525,
  "barbell_ohp.1_0xbw": 0.7, // doc 01 §4.1 explicit (bodyweight OHP)
  "barbell_ohp.1_25xbw": 0.875,
  "power_stunts.bw_power_clean": 0.8,
  "power_stunts.bw_clean_and_press": 0.8,
  "power_stunts.bw_snatch": 0.85,

  // --- Added at integration for the skills-ext/* nodes -----------------------------------
  // Every sector author flagged that their new ratio nodes had no ♀ row and that skills.ts
  // was not theirs to edit, so women were being gated at the MALE ratio on new rungs while
  // the shipped rungs above and below them were adjusted. Each entry below reuses the
  // multiplier already applied to a sibling node on the SAME line, so no new policy is
  // introduced: bench/OHP/pull ×0.70, squat ×0.72, deadlift ×0.78, power ×0.80 (doc 01 §4.1/§6).
  "barbell_bench.0_5xbw": 0.35, // ×0.70, cf. 0_75xbw 0.525 / 1_0xbw 0.75
  "barbell_ohp.0_35xbw": 0.245, // ×0.70, cf. 0_5xbw 0.35 / 1_0xbw 0.70

  // --- Curl line (skills-ext/pull_levers.ts) ---------------------------------------------
  // ×0.70, the same upper-body multiplier as bench / OHP / weighted pull-up above.
  "curl.strict_25pct": 0.175,
  "curl.strict_half_bw": 0.35,

  // --- Loaded carry stunt (skills-ext/run_martial.ts) ------------------------------------
  "carry.sandbag_bw": 0.75,

  // --- Loaded feats -------------------------------------------------------------------
  // Same line multipliers as above: squat x0.72, deadlift x0.78, upper/overhead x0.70,
  // olympic/power x0.80 (doc 01 SS4.1/SS6).
  "front_squat.0_75xbw": 0.54,
  "front_squat.1_0xbw": 0.72,
  "front_squat.1_5xbw": 1.08,
  "overhead_squat.0_5xbw": 0.36,
  "overhead_squat.0_75xbw": 0.54,
  "overhead_squat.bw": 0.72,
  "barbell.zercher_squat": 0.72,
  "barbell.suitcase_deadlift": 0.39,
  "barbell.jefferson_deadlift": 1.17,
  "barbell.hack_lift": 0.78,
  "barbell.steinborn": 0.78,
  "barbell.power_snatch": 0.6,
  "barbell.snatch_balance": 0.4,
  "barbell.sots_press": 0.175,
  "clean_jerk.bw": 0.8,
  "clean_jerk.1_5xbw": 1.2,
  "tgu.quarter_bw": 0.175,
  "tgu.half_bw": 0.35,
  "kb.windmill": 0.175,
  "kb.bent_press": 0.35,
  "db.crucifix_hold": 0.105,
  "barbell.two_hands_anyhow": 0.52,
  "dip.weighted_bw": 0.7,
  "one_arm_pullup.wpu_100pct": 0.7,
  "pull.weighted_muscleup": 0.175,
  "barbell_squat.0_75xbw": 0.54, // ×0.72, cf. 1_0xbw 0.72 — without this ♀ 0.75x gates ABOVE ♀ 1.0x
  "barbell_deadlift.1_0xbw": 0.78, // ×0.78, cf. 1_5xbw 1.17 / 2_0xbw 1.5
  "barbell_deadlift.1_25xbw": 0.975,
  "barbell_deadlift.2_25xbw": 1.755,
  "power_ramp.power_clean_0_75x": 0.6, // ×0.80, cf. power_stunts.bw_power_clean 0.8
  "dip.dip_weighted_10": 0.07, // ×0.70, cf. dip.weighted_half_bw 0.5 -> 0.35
  "pull_base.wpu_10pct": 0.07, // ×0.70, cf. one_arm_pullup.wpu_50pct 0.5 -> 0.35
  "pull_base.wpu_35pct": 0.245,
  "pull_base.wpu_70pct": 0.49,
};

// ---------------------------------------------------------------------------
// The tree.

const nodeList: SkillNode[] = [
  // ------------------------------------------------------------------ pushup
  // One-arm push-up line — doc 01 §3.7 / §6 "one_arm_pushup".
  node("one_arm_pushup.pushup", "Push-Up", "pushup", 0, reps(20, 3), [], {
    description: "3×20 clean full-ROM push-ups (doc 01 §3.7 step 1).",
  }),
  node("one_arm_pushup.diamond", "Diamond Push-Up", "pushup", 1, reps(10, 3), ["one_arm_pushup.pushup"]),
  node("one_arm_pushup.archer", "Archer Push-Up", "pushup", 2, reps(8, 3, true), ["one_arm_pushup.diamond"], {
    description: "Start 3×3–5 per side, 2×/wk; pair with anti-rotation core work.",
  }),
  node("one_arm_pushup.elevated_archer", "Elevated-Arm Archer Push-Up", "pushup", 3, reps(8, 3, true), [
    "one_arm_pushup.archer",
  ]),
  node("one_arm_pushup.oap_negative", "One-Arm Push-Up Negative", "pushup", 4, reps(5, 3, true), [
    "one_arm_pushup.elevated_archer",
  ], { description: "5 s descent, two-hand press back up." }),
  node("one_arm_pushup.oap", "One-Arm Push-Up", "pushup", 5, reps(3, 3, true), ["one_arm_pushup.oap_negative"], {
    isStunt: true,
    estMonths: [6, 12],
    description: "Feet wide, square shoulders, 3×3 per side.",
  }),
  node("one_arm_pushup.oap_narrow", "One-Arm Push-Up (Feet Narrow)", "pushup", 6, reps(5, 3, true), [
    "one_arm_pushup.oap",
  ]),
  // Flagged step, addendum-2 §4.
  node("push.oap_weighted", "Weighted One-Arm Push-Up", "pushup", 6, wreps(5, 0.1, 3), ["one_arm_pushup.oap"], {
    description: "3×5 per side @ +10% BW (addendum-2 §4).",
  }),
  // Barbell bench milestones — doc 01 §4.1/§6 "barbell_bench" (tier B community data).
  node("barbell_bench.0_75xbw", "Bench Press 0.75×BW", "pushup", 0, e1rmRatio("bench", 0.75), [], { evidence: "B" }),
  node("barbell_bench.1_0xbw", "Bodyweight Bench Press", "pushup", 1, e1rmRatio("bench", 1.0), [
    "barbell_bench.0_75xbw",
  ], { evidence: "B", description: "♀ criterion 0.75×BW (doc 01 §4.1)." }),
  node("barbell_bench.1_5xbw", "Bench Press 1.5×BW", "pushup", 2, e1rmRatio("bench", 1.5), ["barbell_bench.1_0xbw"], {
    evidence: "B",
    isStunt: true,
    estMonths: [6, 24],
  }),
  node("barbell_bench.2_0xbw", "Bench Press 2.0×BW", "pushup", 3, e1rmRatio("bench", 2.0), ["barbell_bench.1_5xbw"], {
    evidence: "B",
    isStunt: true,
    estMonths: [24, 60],
    description: "Double-bodyweight bench — advanced/elite on the StrengthLevel tables. ♀ criterion 1.4×BW.",
  }),

  // -------------------------------------------------------- dips_planche_hs
  // Handstand line — doc 01 §3.6 / §6 "handstand".
  node("handstand.wall_hs", "Chest-to-Wall Handstand 30 s", "dips_planche_hs", 0, hold(30), [], {
    description: "Baseline assumes wrist prep + 3×45 s pike hold (doc 01 §3.6 step 1).",
  }),
  node("handstand.wall_60s", "Chest-to-Wall Handstand 60 s", "dips_planche_hs", 1, hold(60), ["handstand.wall_hs"], {
    description: "Straight arms, flat back.",
  }),
  node("handstand.weight_shift", "Wall Weight Shifts / Toe Pulls", "dips_planche_hs", 2, hold(3, 10), [
    "handstand.wall_60s",
  ], { description: "10×3 s of free balance out of the wall." }),
  node("handstand.free_3s", "Freestanding Handstand (brief)", "dips_planche_hs", 3, hold(3), [
    "handstand.weight_shift",
  ], { estMonths: [4, 9], description: "3–5 s unassisted." }),
  node("handstand.free_30s", "Freestanding Handstand 30 s", "dips_planche_hs", 4, hold(30, 3), ["handstand.free_3s"], {
    estMonths: [9, 18],
  }),
  node("handstand.free_60s", "Freestanding Handstand 60 s", "dips_planche_hs", 5, hold(60), ["handstand.free_30s"]),
  // One-arm handstand line — doc 01 §3.6 step 10 / §6 "one_arm_handstand".
  node("one_arm_handstand.shape_changes", "Handstand Shape Changes", "dips_planche_hs", 6, ATTESTED, [
    "handstand.free_60s",
  ], { description: "Form-judged: clean straight/tuck/straddle shape changes at 45–60 s balance." }),
  node("one_arm_handstand.weight_shift", "One-Arm Weight Shifts", "dips_planche_hs", 7, hold(20, 3), [
    "one_arm_handstand.shape_changes",
  ], { description: "3×20–30 s heavy lean per side." }),
  node("one_arm_handstand.fingertip_assist", "Fingertip-Assisted OAHS", "dips_planche_hs", 8, hold(20, 3), [
    "one_arm_handstand.weight_shift",
  ]),
  node("one_arm_handstand.oahs_3s", "One-Arm Handstand", "dips_planche_hs", 9, hold(3, 3), [
    "one_arm_handstand.fingertip_assist",
  ], { isStunt: true, estMonths: [24, 36], description: "3×3 s free one-arm holds." }),
  // HSPU line — doc 01 §3.6 / §6 "hspu".
  node("hspu.pike_pushup", "Pike Push-Up", "dips_planche_hs", 1, reps(8, 3), [
    "handstand.wall_hs",
    "one_arm_pushup.pushup",
  ]),
  node("hspu.elevated_pike", "Elevated Pike Push-Up", "dips_planche_hs", 2, reps(8, 3), ["hspu.pike_pushup"]),
  node("hspu.wall_hspu_partial", "Wall HSPU (partial ROM)", "dips_planche_hs", 3, reps(5, 3), ["hspu.elevated_pike"]),
  node("hspu.wall_hspu_full", "Wall HSPU (full ROM)", "dips_planche_hs", 4, reps(5, 3), ["hspu.wall_hspu_partial"]),
  node("hspu.deficit_hspu", "Deficit / Parallette HSPU", "dips_planche_hs", 5, reps(5, 3), ["hspu.wall_hspu_full"], {
    description: "3×5 with a 10 cm deficit.",
  }),
  node("hspu.free_hspu", "Freestanding HSPU", "dips_planche_hs", 6, reps(3, 3), [
    "hspu.deficit_hspu",
    "handstand.free_30s",
  ], { isStunt: true, estMonths: [8, 18] }),
  // Planche line — doc 01 §3.1 / §6 "planche"; all straight-arm (sa).
  node("planche.lean", "Planche Lean", "dips_planche_hs", 1, hold(30, 3), [
    "handstand.wall_hs",
    "one_arm_pushup.pushup",
  ], { sa: true, description: "3×30 s at ≥25° lean; cap lean-angle increase at 2–3°/wk (doc 01 §2.4)." }),
  node("planche.tuck", "Tuck Planche", "dips_planche_hs", 2, hold(15, 3), ["planche.lean"], {
    sa: true,
    estMonths: [3, 6],
    description: "Hips at shoulder height, arms locked.",
  }),
  node("planche.pseudo_planche_pushup", "Pseudo Planche Push-Up", "dips_planche_hs", 2, reps(8, 3), ["planche.lean"], {
    sa: true,
    description: "3×8 with shoulders ≥10 cm past hands (addendum-2 §4).",
  }),
  node("planche.adv_tuck", "Advanced Tuck Planche", "dips_planche_hs", 3, hold(12, 3), ["planche.tuck"], {
    sa: true,
    description: "3×12–15 s flat back — the most common plateau in the tree.",
  }),
  node("planche.tuck_planche_pushup", "Tuck Planche Push-Up", "dips_planche_hs", 4, reps(5, 3), ["planche.adv_tuck"], {
    sa: true,
    description: "3×5 (addendum-2 §4).",
  }),
  node("planche.straddle", "Straddle Planche", "dips_planche_hs", 4, hold(10, 3), ["planche.adv_tuck"], {
    sa: true,
    estMonths: [12, 18],
    description: "Entry gate ≈15 s solid advanced tuck; narrow the straddle over time.",
  }),
  node("planche.straddle_planche_pushup", "Straddle Planche Push-Up", "dips_planche_hs", 5, reps(3, 3), [
    "planche.straddle",
    "dip.dip_weighted",
  ], { sa: true, description: "3×3 (addendum-2 §4); needs weighted-dip strength (doc 01 §3.1)." }),
  node("planche.full", "Full Planche", "dips_planche_hs", 5, hold(5, 3), ["planche.straddle"], {
    sa: true,
    isStunt: true,
    estMonths: [18, 36],
    description: "3×5 s, own it at 3×10 s. τ ≈ 0.87·k bodyweight-equivalent (doc 01 §1.4).",
  }),
  node("planche.planche_pushup", "Planche Push-Up", "dips_planche_hs", 6, reps(3, 3), ["planche.full"], {
    sa: true,
    description: "3×3 full ROM (doc 01 §3.1 step 6).",
  }),
  // Ring foundation — addendum-1 §2.1 "ring_base".
  node("ring_base.support_60s", "Ring Support Hold", "dips_planche_hs", 0, hold(60), [], {
    description: "60 s single hold (after 3×30 s) before any ring dip/lever work.",
  }),
  node("ring_base.rto_support", "RTO Support Hold", "dips_planche_hs", 1, hold(20, 3), ["ring_base.support_60s"], {
    description: "Rings turned out ~45°, elbow pits forward; 3×20–30 s.",
  }),
  // Promoted dip line — addendum-2 §4 ("dip.* should be promoted to a skill line").
  node("dip.tricep_dip", "Tricep Dip (bench)", "dips_planche_hs", 0, reps(8, 3), []),
  node("dip.dip", "Parallel-Bar Dip", "dips_planche_hs", 1, reps(12, 3), ["dip.tricep_dip"], {
    description: "3×12 — the addendum-2 §4 gate for ring dips.",
  }),
  node("dip.ring_dip", "Ring Dip", "dips_planche_hs", 2, reps(8, 3), ["dip.dip", "ring_base.rto_support"], {
    description: "3×8 full ROM (shoulder below elbow) with turned-out lockout (addendum-2 §4 / addendum-1 §2.1).",
  }),
  node("dip.dip_weighted", "Weighted Dip", "dips_planche_hs", 2, wreps(5, 0.2, 3), ["dip.dip"], {
    description: "3×5 @ +20–30% BW (addendum-1 §2.1 weighted-dip band).",
  }),
  node("ring_base.rto75_dips", "RTO-75° Ring Dips", "dips_planche_hs", 3, reps(8, 3), ["dip.ring_dip"], {
    description: "Low's iron-cross prep spec: dips with rings turned out to 75° (addendum-1 §2.1).",
  }),
  node("dip.ring_dip_weighted", "Weighted Ring Dip", "dips_planche_hs", 3, wreps(5, 0.25, 3), [
    "dip.ring_dip",
    "dip.dip_weighted",
  ], { estMonths: [2, 4], description: "3×5 @ +20–30% BW — strength headroom for cross pullouts." }),
  node("dip.ring_mu_support", "Ring Muscle-Up Support (deep)", "dips_planche_hs", 3, hold(10, 3), ["dip.ring_dip"], {
    evidence: "D",
    description: "3×10 s support at muscle-up-top depth; local bridge from the dip line to the ring MU (addendum-2 §4).",
  }),
  node("dip.weighted_half_bw", "Weighted Dip ½ BW", "dips_planche_hs", 3, wreps(1, 0.5), ["dip.dip_weighted"], {
    isStunt: true,
    estMonths: [12, 30],
    description: "♂ +50% / ♀ +35% BW ×1 (doc 01 §4.1). The vertical-push weighted-calisthenics benchmark.",
  }),
  // Maltese line — addendum-1 §2.3; all sa.
  node("maltese.lean", "Maltese Lean", "dips_planche_hs", 12, hold(10, 4), [
    "planche.straddle",
    "iron_cross.iron_cross",
    "ring_base.rto75_dips",
  ], { sa: true, description: "4×10–15 s feet-supported; mobility gates: 45° shoulder ext, 90° ER, 90° wrist ext." }),
  node("maltese.band", "Band / Dream-Machine Maltese", "dips_planche_hs", 13, hold(5, 5), ["maltese.lean"], {
    sa: true,
    description: "5–6×5–8 s, reduce assistance stepwise; TENDON_GATE_12WK; 2–3 d/wk max, ≥48 h between sessions.",
  }),
  node("maltese.negative", "Negative Maltese", "dips_planche_hs", 14, reps(3, 4), ["maltese.band"], {
    sa: true,
    description: "4–5×3–5 controlled descents from support.",
  }),
  node("maltese.straddle", "Straddle Maltese", "dips_planche_hs", 15, hold(5, 3), ["maltese.negative"], { sa: true }),
  node("maltese.full", "Full Maltese", "dips_planche_hs", 16, hold(5, 3), ["maltese.straddle"], {
    sa: true,
    isStunt: true,
    estMonths: [24, 60],
    description: "First 1–2 s; owned at 3×5 s. Difficulty ≈2–3× the iron cross (addendum-1 §2.3).",
  }),
  // Barbell OHP milestones — doc 01 §4.1/§6 "barbell_ohp".
  node("barbell_ohp.0_5xbw", "Overhead Press 0.5×BW", "dips_planche_hs", 0, e1rmRatio("ohp", 0.5), [], {
    evidence: "B",
  }),
  node("barbell_ohp.0_75xbw", "Overhead Press 0.75×BW", "dips_planche_hs", 1, e1rmRatio("ohp", 0.75), [
    "barbell_ohp.0_5xbw",
  ], { evidence: "B" }),
  node("barbell_ohp.1_0xbw", "Bodyweight Overhead Press", "dips_planche_hs", 2, e1rmRatio("ohp", 1.0), [
    "barbell_ohp.0_75xbw",
  ], { evidence: "B", isStunt: true, estMonths: [8, 24], description: "♀ criterion 0.70×BW (doc 01 §4.1)." }),
  node("barbell_ohp.1_25xbw", "Overhead Press 1.25×BW", "dips_planche_hs", 3, e1rmRatio("ohp", 1.25), [
    "barbell_ohp.1_0xbw",
  ], { evidence: "B" }),

  // ------------------------------------------------------------ pull_levers
  // Pull hub + one-arm pull-up line — doc 01 §3.8 / §6 "one_arm_pullup".
  node("one_arm_pullup.pullup10", "Strict Pull-Ups ×10", "pull_levers", 0, reps(10), [], {
    description: "10–15 strict dead-hang pull-ups — the hard gate before any OAP work.",
  }),
  node("one_arm_pullup.wpu_25pct", "Weighted Pull-Up +25% BW", "pull_levers", 1, wreps(3, 0.25), [
    "one_arm_pullup.pullup10",
  ], { description: "3–5 reps @ +25% BW — sensible entry to the OAP branch." }),
  node("one_arm_pullup.wpu_50pct", "Weighted Pull-Up +50% BW", "pull_levers", 2, wreps(1, 0.5), [
    "one_arm_pullup.wpu_25pct",
  ], {
    isStunt: true,
    estMonths: [12, 30],
    description: "1 rep @ +50% BW (♀ +35%, doc 01 §4.1) — the vertical-pull weighted-calisthenics benchmark, and the halfway-loaded OAP checkpoint.",
  }),
  node("one_arm_pullup.archer_pullup", "Archer Pull-Up", "pull_levers", 3, reps(5, 3, true), [
    "one_arm_pullup.wpu_50pct",
  ]),
  node("one_arm_pullup.uneven_pullup", "Uneven / Towel-Assist Pull-Up", "pull_levers", 4, reps(5, 3, true), [
    "one_arm_pullup.archer_pullup",
  ]),
  node("one_arm_pullup.oap_negative", "One-Arm Pull-Up Negative", "pull_levers", 5, reps(3, 3, true), [
    "one_arm_pullup.uneven_pullup",
  ], { description: "5–8 s controlled negatives per side." }),
  node("one_arm_pullup.assisted_oap", "Assisted One-Arm Pull-Up", "pull_levers", 6, reps(3, 3, true), [
    "one_arm_pullup.oap_negative",
  ], { description: "Band or finger-assist." }),
  node("one_arm_pullup.one_arm_chinup", "One-Arm Chin-Up", "pull_levers", 7, reps(1, undefined, true), [
    "one_arm_pullup.assisted_oap",
  ], { description: "Supinated — the more commonly achieved variant." }),
  node("one_arm_pullup.one_arm_pullup", "One-Arm Pull-Up", "pull_levers", 8, reps(1, undefined, true), [
    "one_arm_pullup.one_arm_chinup",
  ], { isStunt: true, estMonths: [24, 36], description: "Pronated; ≈ +70–80% BW weighted pull-up strength." }),
  // Flagged step, addendum-2 §4.
  node("pull.towel_pullup", "Towel Pull-Up", "pull_levers", 1, reps(8, 2), ["one_arm_pullup.pullup10"], {
    description: "2×8; doc prereq: 5 strict pull-ups + 30 s towel hang (addendum-2 §4).",
  }),
  // Front lever line — doc 01 §3.2 / §6 "front_lever"; all sa.
  node("front_lever.tuck", "Tuck Front Lever", "pull_levers", 1, hold(20, 3), ["one_arm_pullup.pullup10"], {
    sa: true,
    description: "3×20–30 s; baseline also wants 3×8 straight-arm scap pulls (doc 01 §2.4).",
  }),
  node("front_lever.tuck_fl_kick", "Tuck Front Lever Kick", "pull_levers", 2, reps(10, 3), ["front_lever.tuck"], {
    sa: true,
    description: "3×10 controlled (addendum-2 §4).",
  }),
  node("front_lever.adv_tuck", "Advanced Tuck Front Lever", "pull_levers", 2, hold(10, 3), ["front_lever.tuck"], {
    sa: true,
    description: "3×10–15 s, flat back, hips open.",
  }),
  node("front_lever.one_leg", "One-Leg Front Lever", "pull_levers", 3, hold(8, 3), ["front_lever.adv_tuck"], {
    sa: true,
    description: "3×8–10 s per side, alternating sets.",
  }),
  node("front_lever.straddle", "Straddle Front Lever", "pull_levers", 4, hold(10, 3), ["front_lever.one_leg"], {
    sa: true,
  }),
  node("front_lever.fl_flutter", "Front Lever Flutter", "pull_levers", 5, reps(10, 3), ["front_lever.straddle"], {
    sa: true,
    description: "3×10 small-amplitude (addendum-2 §4).",
  }),
  node("front_lever.half_lay", "Half-Lay Front Lever", "pull_levers", 5, hold(8, 3), ["front_lever.straddle"], {
    sa: true,
    description: "Optional intermediate for long-limbed athletes.",
  }),
  node("front_lever.full", "Full Front Lever", "pull_levers", 6, hold(5, 3), ["front_lever.straddle"], {
    sa: true,
    isStunt: true,
    estMonths: [6, 18],
    description: "3×5 s, then hold 10 s. k = 1.00 (doc 01 §1.4).",
  }),
  node("front_lever.fl_pullup", "Front Lever Pull-Up / Raise", "pull_levers", 7, reps(3, 3), ["front_lever.full"], {
    sa: true,
  }),
  // Back lever line — doc 01 §3.3 / §6 "back_lever"; all sa; never faster than 1 step / 4 wk.
  node("back_lever.german_hang", "German Hang", "pull_levers", 0, hold(30, 3), [], {
    sa: true,
    description: "3×30 s pain-free — hard elbow gate; prereq skin-the-cat 3×5 (doc 01 §3.3).",
  }),
  node("back_lever.tuck", "Tuck Back Lever", "pull_levers", 1, hold(20, 3), ["back_lever.german_hang"], {
    sa: true,
    description: "Supinated grip preferred ≥60% of the time (doc 01 §2.4).",
  }),
  node("back_lever.adv_tuck", "Advanced Tuck Back Lever", "pull_levers", 2, hold(10, 3), ["back_lever.tuck"], {
    sa: true,
  }),
  node("back_lever.one_leg", "One-Leg Back Lever", "pull_levers", 3, hold(8, 3), ["back_lever.adv_tuck"], {
    sa: true,
    description: "3×8 s per side.",
  }),
  node("back_lever.straddle", "Straddle Back Lever", "pull_levers", 4, hold(10, 3), ["back_lever.one_leg"], {
    sa: true,
  }),
  node("back_lever.full", "Full Back Lever", "pull_levers", 5, hold(5, 3), ["back_lever.straddle"], {
    sa: true,
    estMonths: [6, 12],
    description: "3×5 s → 10 s, supinated.",
  }),
  // Human flag line — doc 01 §3.4 / §6 "human_flag"; advance at 3×15 s per step.
  node("human_flag.support", "Vertical-Bar Support Hold", "pull_levers", 1, hold(15, 3), ["one_arm_pullup.pullup10"], {
    description: "Prereq per doc 01 §3.4: strong OHP + lat strength.",
  }),
  node("human_flag.tuck", "Tuck Human Flag", "pull_levers", 2, hold(15, 3), ["human_flag.support"]),
  node("human_flag.one_leg", "One-Leg Human Flag", "pull_levers", 3, hold(15, 3), ["human_flag.tuck"]),
  node("human_flag.straddle", "Straddle Human Flag", "pull_levers", 4, hold(15, 3), ["human_flag.one_leg"]),
  node("human_flag.full", "Full Human Flag", "pull_levers", 5, hold(15, 3), ["human_flag.straddle"], {
    isStunt: true,
    estMonths: [6, 12],
  }),
  // Bar muscle-up line — doc 01 §3.5 / §6 "muscle_up_bar".
  node("muscle_up_bar.high_pullup", "High Pull-Up", "pull_levers", 1, reps(8, 3), ["one_arm_pullup.pullup10"]),
  node("muscle_up_bar.explosive_pullup", "Explosive Pull-Up (to sternum)", "pull_levers", 2, reps(5, 3), [
    "muscle_up_bar.high_pullup",
  ]),
  node("muscle_up_bar.assisted_mu", "Band-Assisted / Jumping Muscle-Up", "pull_levers", 3, reps(3, 3), [
    "muscle_up_bar.explosive_pullup",
  ]),
  node("muscle_up_bar.bar_mu", "Bar Muscle-Up", "pull_levers", 4, reps(1, 3), ["muscle_up_bar.assisted_mu"], {
    estMonths: [2, 4],
  }),
  node("muscle_up_bar.strict_bar_mu", "Strict Bar Muscle-Up", "pull_levers", 5, reps(3, 3), ["muscle_up_bar.bar_mu"], {
    description: "3×3 with no kip.",
  }),
  // Ring muscle-up line — doc 01 §3.5 / §6 "muscle_up_rings".
  node("muscle_up_rings.false_grip_hang", "False-Grip Dead Hang", "pull_levers", 3, hold(5, 3), [
    "one_arm_pullup.pullup10",
    "dip.ring_dip",
  ], { description: "3×5 s; 2–3 wk of wrist adaptation discomfort is normal, sharp ulnar pain is not." }),
  node("muscle_up_rings.false_grip_pullup", "False-Grip Pull-Up", "pull_levers", 4, reps(5, 3), [
    "muscle_up_rings.false_grip_hang",
  ]),
  node("muscle_up_rings.transition_drill", "Ring Transition Drill", "pull_levers", 5, reps(5, 3), [
    "muscle_up_rings.false_grip_pullup",
    "dip.ring_mu_support",
  ], { description: "Feet-assisted transitions." }),
  node("muscle_up_rings.ring_mu", "Ring Muscle-Up", "pull_levers", 6, reps(1, 3), [
    "muscle_up_rings.transition_drill",
  ], { estMonths: [3, 6] }),
  node("muscle_up_rings.strict_ring_mu", "Strict Ring Muscle-Up", "pull_levers", 7, reps(3, 3), [
    "muscle_up_rings.ring_mu",
  ]),
  // Rope climb line — doc 01 §3.13 / §6 "rope_climb".
  node("rope_climb.rope_hang", "Rope / Towel Dead Hang", "pull_levers", 1, hold(30, 3), ["one_arm_pullup.pullup10"]),
  node("rope_climb.rope_pullup", "Rope Pull-Up", "pull_levers", 2, reps(8, 3), ["rope_climb.rope_hang"], {
    description: "Feet on ground, arm-over-arm.",
  }),
  node("rope_climb.legged_climb", "Rope Climb (leg wrap)", "pull_levers", 3, reps(2), ["rope_climb.rope_pullup"], {
    description: "2 ascents of 4–5 m, J-hook or S-wrap.",
  }),
  node("rope_climb.legless_climb", "Legless Rope Climb", "pull_levers", 4, reps(3), ["rope_climb.legged_climb"], {
    description: "1 ascent, then 3; grip endurance is the limiter.",
  }),
  node("rope_climb.lsit_rope_climb", "L-Sit Rope Climb", "pull_levers", 5, reps(3), [
    "rope_climb.legless_climb",
    "l_sit_manna.l_sit",
  ], { estMonths: [3, 6], description: "Two-parent node: rope line × owned L-sit (doc 01 §3.13)." }),
  node("rope_climb.weighted_climb", "Weighted Legless Climb", "pull_levers", 6, wreps(1, 0.1), [
    "rope_climb.lsit_rope_climb",
  ], { description: "Legless ascent with +10% BW vest." }),
  // Iron cross line — addendum-1 §2.2; all sa; TENDON_GATE_12WK at band pullouts.
  node("iron_cross.ring_flies", "Ring Flies Ladder", "pull_levers", 6, reps(8, 3), [
    "back_lever.full",
    "front_lever.one_leg",
    "planche.adv_tuck",
    "ring_base.rto75_dips",
    "one_arm_pullup.pullup10",
  ], { sa: true, description: "3×8 at each rung (standing → knees → full); Low's cross prerequisites gate entry." }),
  node("iron_cross.box_pullouts", "Box-Assisted Cross Pullouts", "pull_levers", 7, reps(5, 5), [
    "iron_cross.ring_flies",
  ], { sa: true, description: "5×5 per box height; lower the box to raise %BW." }),
  node("iron_cross.band_pullouts", "Band / Dream-Machine Pullouts", "pull_levers", 8, reps(8, 5), [
    "iron_cross.box_pullouts",
  ], { sa: true, description: "Phase I 3×5 → 5×8, 3 d/wk; TENDON_GATE_12WK before this step; ≤1 step per 3 wk." }),
  node("iron_cross.pullouts_90pct", "Heavy Pullouts ≥90% BW", "pull_levers", 9, reps(5, 5), [
    "iron_cross.band_pullouts",
  ], { sa: true, description: "5×5 at assistance ≤10% BW — the switch point to isometrics." }),
  node("iron_cross.iso_holds", "Cross Isometric Holds", "pull_levers", 10, hold(3, 5), ["iron_cross.pullouts_90pct"], {
    sa: true,
    description: "5×3–5 s at ≤5% assistance.",
  }),
  node("iron_cross.iron_cross", "Iron Cross", "pull_levers", 11, hold(3), ["iron_cross.iso_holds"], {
    sa: true,
    isStunt: true,
    estMonths: [12, 36],
    description: "1×3 s clean → owned at 3×5 s; elbows locked at all times (addendum-1 §2.2).",
  }),

  // -------------------------------------------------------------- back_chain
  // Bridge / backbend line — doc 01 §3.12 / §6 "bridge".
  node("bridge.glute_bridge", "Glute Bridge / Hip Thrust", "back_chain", 0, reps(15, 3), []),
  node("bridge.wall_bridge", "Wall Bridge (walk-down)", "back_chain", 1, reps(5, 3), ["bridge.glute_bridge"], {
    description: "Reach 3 hand-widths lower than start; gate on shoulder-flexion ROM (doc 01 §3.12).",
  }),
  node("bridge.short_bridge", "Short Bridge (head-supported)", "back_chain", 2, hold(20, 3), ["bridge.wall_bridge"]),
  node("bridge.full_bridge", "Full Floor Bridge", "back_chain", 3, hold(30, 3), ["bridge.short_bridge"], {
    description: "Arms straight, chest over hands.",
  }),
  node("bridge.gecko_bridge", "Elevated-Feet / Gecko Bridge", "back_chain", 4, hold(20, 3), ["bridge.full_bridge"]),
  node("bridge.assisted_stand2stand", "Bridge Wall-Walk to Standing", "back_chain", 5, reps(3, 3), [
    "bridge.gecko_bridge",
  ]),
  node("bridge.stand_to_stand", "Stand-to-Stand Bridge", "back_chain", 6, reps(3, 3), [
    "bridge.assisted_stand2stand",
  ], { estMonths: [6, 12] }),
  // Power stunts — doc 01 §4.1/§6 "power_stunts"; ordered by Everett cross-ratios.
  node("power_stunts.bw_power_clean", "Bodyweight Power Clean", "back_chain", 0, e1rmRatio("power_clean", 1.0), [], {
    description: "1.0×BW (♀ 0.80); coached technique assumed.",
  }),
  node("power_stunts.bw_clean_and_press", "Bodyweight Clean & Press", "back_chain", 1, e1rmRatio("clean_and_press", 1.0), [
    "power_stunts.bw_power_clean",
  ], { description: "1.0×BW (♀ 0.80)." }),
  node("power_stunts.bw_snatch", "Bodyweight Snatch", "back_chain", 2, e1rmRatio("snatch", 1.0), [
    "power_stunts.bw_clean_and_press",
  ], { isStunt: true, estMonths: [12, 24], description: "1.0×BW (♀ 0.85); sanity check snatch ≈ 0.78–0.83 × C&J." }),

  // --------------------------------------------------------------- posterior
  // Nordic curl line — doc 01 §3.11 / §6 "nordic_curl".
  node("nordic_curl.bridge_slr", "Hamstring Bridge / Single-Leg RDL", "posterior", 0, reps(10, 3, true), [], {
    description: "No acute hamstring injury; cap 2 sessions/wk initially (doc 01 §3.11).",
  }),
  node("nordic_curl.assisted_nordic", "Assisted Nordic", "posterior", 1, reps(6, 3), ["nordic_curl.bridge_slr"], {
    description: "Band or hands-on-box, control past 45°.",
  }),
  node("nordic_curl.ecc_nordic", "Eccentric-Only Nordic", "posterior", 2, reps(6, 3), ["nordic_curl.assisted_nordic"], {
    description: "Controlled to floor, push back with hands.",
  }),
  node("nordic_curl.slow_ecc_nordic", "Slow Eccentric Nordic", "posterior", 3, reps(5, 3), ["nordic_curl.ecc_nordic"], {
    description: "≥4 s descent.",
  }),
  node("nordic_curl.full_nordic", "Full Nordic Curl", "posterior", 4, reps(5, 3), ["nordic_curl.slow_ecc_nordic"], {
    estMonths: [3, 6],
    description: "Eccentric + hamstring-driven concentric. NHE ≈ halves hamstring-injury risk (tier A outcome).",
  }),
  node("nordic_curl.weighted_nordic", "Weighted / Fast Nordic", "posterior", 5, reps(5, 3), ["nordic_curl.full_nordic"], {
    description: "3×5 holding 5–10 kg; speed variant from week 6+.",
  }),
  // Flagged step, addendum-2 §4.
  node("hinge.glute_bridge_weighted", "Weighted Glute Bridge", "posterior", 1, wreps(20, 0.25, 2), [
    "bridge.glute_bridge",
  ], { description: "Band target (2×20) @ +25% BW (addendum-2 §4)." }),
  // Barbell deadlift milestones — doc 01 §4.1/§6 "barbell_deadlift".
  node("barbell_deadlift.1_5xbw", "Deadlift 1.5×BW", "posterior", 0, e1rmRatio("deadlift", 1.5), [], { evidence: "B" }),
  node("barbell_deadlift.2_0xbw", "Double-Bodyweight Deadlift", "posterior", 1, e1rmRatio("deadlift", 2.0), [
    "barbell_deadlift.1_5xbw",
  ], { evidence: "B", isStunt: true, estMonths: [6, 18], description: "♀ criterion 1.5×BW (doc 01 §4.1)." }),
  node("barbell_deadlift.2_5xbw", "Deadlift 2.5×BW", "posterior", 2, e1rmRatio("deadlift", 2.5), [
    "barbell_deadlift.2_0xbw",
  ], { evidence: "B" }),
  node("barbell_deadlift.3_0xbw", "Triple-Bodyweight Deadlift", "posterior", 3, e1rmRatio("deadlift", 3.0), [
    "barbell_deadlift.2_5xbw",
  ], { evidence: "B", isStunt: true, description: "♀ criterion 2.25×BW — near elite for both (doc 01 §4.1)." }),

  // ------------------------------------------------------------------- squat
  // Pistol line — doc 01 §3.9 / §6 "pistol_squat".
  node("pistol_squat.split_squat", "Split Squat / RFE Split Squat", "squat", 0, reps(12, 3, true), [], {
    description: "Baseline: 20 BW squats + ankle dorsiflexion ≥10 cm knee-to-wall (doc 01 §3.9).",
  }),
  node("pistol_squat.assisted_pistol", "Assisted Pistol (TRX/doorframe)", "squat", 1, reps(8, 3, true), [
    "pistol_squat.split_squat",
  ]),
  node("pistol_squat.box_pistol", "Box Pistol (high → low)", "squat", 2, reps(8, 3, true), [
    "pistol_squat.assisted_pistol",
  ], { description: "3×8 per side at each height, drop 5 cm — the ankle-mobility workaround." }),
  node("pistol_squat.counterbalance_pistol", "Counterbalance Pistol", "squat", 3, reps(5, 3, true), [
    "pistol_squat.box_pistol",
  ], { description: "2.5–5 kg held out front makes it easier." }),
  node("pistol_squat.pistol", "Pistol Squat", "squat", 4, reps(8, 3, true), ["pistol_squat.counterbalance_pistol"], {
    estMonths: [2, 4],
    description: "3×5 → 3×8 per side.",
  }),
  node("pistol_squat.weighted_pistol", "Weighted Pistol Squat", "squat", 5, wreps(5, 0.25, 3), [
    "pistol_squat.pistol",
  ], { description: "+10% BW 3×5 → +25% BW (doc 01 §3.9 step 6); reps per side." }),
  node("pistol_squat.pistol_half_bw", "Pistol +50% BW", "squat", 6, wreps(1, 0.5), ["pistol_squat.weighted_pistol"], {
    isStunt: true,
    description: "≈ 2×BW back squat by Low's bilateral-deficit arithmetic (addendum-3 §3.5).",
  }),
  // Shrimp line — doc 01 §3.9 / §6 "shrimp_squat".
  node("shrimp_squat.assisted", "Assisted Shrimp Squat", "squat", 0, reps(5, 3, true), []),
  node("shrimp_squat.beginner", "Beginner Shrimp Squat", "squat", 1, reps(5, 3, true), ["shrimp_squat.assisted"], {
    description: "Hands free, rear knee to floor.",
  }),
  node("shrimp_squat.intermediate", "Intermediate Shrimp Squat", "squat", 2, reps(5, 3, true), [
    "shrimp_squat.beginner",
  ], { description: "Holding rear foot, torso upright." }),
  node("shrimp_squat.advanced", "Advanced Shrimp Squat", "squat", 3, reps(5, 3, true), ["shrimp_squat.intermediate"], {
    estMonths: [3, 6],
    description: "Rear foot held, knee taps floor, hands overhead.",
  }),
  node("shrimp_squat.weighted", "Weighted Shrimp Squat", "squat", 4, reps(5, 3, true), ["shrimp_squat.advanced"]),
  // Barbell squat milestones — doc 01 §4.1/§6 "barbell_squat".
  node("barbell_squat.1_0xbw", "Back Squat 1.0×BW", "squat", 0, e1rmRatio("squat", 1.0), [], {
    evidence: "B",
    description: "Baseline: competent technique, 3×5 @ 0.75×BW.",
  }),
  node("barbell_squat.1_5xbw", "Back Squat 1.5×BW", "squat", 1, e1rmRatio("squat", 1.5), ["barbell_squat.1_0xbw"], {
    evidence: "B",
  }),
  node("barbell_squat.2_0xbw", "Double-Bodyweight Squat", "squat", 2, e1rmRatio("squat", 2.0), [
    "barbell_squat.1_5xbw",
  ], { evidence: "B", isStunt: true, estMonths: [6, 24], description: "♀ criterion 1.5×BW (doc 01 §4.1)." }),
  node("barbell_squat.2_5xbw", "Back Squat 2.5×BW", "squat", 3, e1rmRatio("squat", 2.5), ["barbell_squat.2_0xbw"], {
    evidence: "B",
    isStunt: true,
    estMonths: [24, 60],
    description: "The squat counterpart to the 3×BW deadlift — advanced/elite on the StrengthLevel tables. ♀ criterion 1.8×BW.",
  }),

  // -------------------------------------------------------------------- core
  // Dragon flag line — doc 01 §3.4 / §6 "dragon_flag".
  node("dragon_flag.hollow", "Hollow-Body Hold", "core", 0, hold(30), [], {
    description: "1×30 s perfect — also the G-HOLLOW acrobatics gate (addendum-1 §1.1).",
  }),
  node("dragon_flag.tuck", "Tuck Dragon Flag", "core", 1, hold(10, 3), ["dragon_flag.hollow"], {
    description: "3×10 s or 3×8 slow negatives.",
  }),
  node("dragon_flag.straddle", "Straddle Dragon Flag", "core", 2, hold(10, 3), ["dragon_flag.tuck"]),
  node("dragon_flag.full_hold", "Full Dragon Flag", "core", 3, hold(10, 3), ["dragon_flag.straddle"], {
    estMonths: [4, 8],
  }),
  node("dragon_flag.full_reps", "Dragon Flag Reps", "core", 4, reps(5, 3), ["dragon_flag.full_hold"], {
    description: "3×5 controlled reps.",
  }),
  // L-sit → V-sit → manna line — doc 01 §3.10 / §6 "l_sit_manna".
  node("l_sit_manna.support", "Parallette Support Hold", "core", 0, hold(30, 3), []),
  node("l_sit_manna.one_leg_l", "One-Leg / Foot-Supported L-Sit", "core", 1, hold(20, 3), ["l_sit_manna.support"], {
    description: "3×20 s per side.",
  }),
  node("l_sit_manna.tuck_l", "Tuck L-Sit", "core", 2, hold(30, 3), ["l_sit_manna.one_leg_l"]),
  node("l_sit_manna.l_sit", "L-Sit", "core", 3, hold(30, 3), ["l_sit_manna.tuck_l"], {
    description: "3×30 s; accumulate 60 s/day as practice.",
  }),
  node("l_sit_manna.straddle_l", "Straddle / High L-Sit", "core", 4, hold(20, 3), ["l_sit_manna.l_sit"]),
  node("l_sit_manna.v_sit", "V-Sit", "core", 5, hold(10, 3), ["l_sit_manna.straddle_l"], {
    description: "Pike compression, not strength, is the limiter — mobility gate (doc 01 §3.10).",
  }),
  node("l_sit_manna.manna", "Manna", "core", 6, hold(5, 3), ["l_sit_manna.v_sit"], {
    isStunt: true,
    estMonths: [24, 48],
    description: "Requires substantial shoulder extension; multi-year skill.",
  }),
  // Flagged step, addendum-2 §4.
  node("core.lsit_flutter", "L-Sit Flutter", "core", 4, reps(20), ["l_sit_manna.l_sit"], {
    description: "20 flutters without dropping the legs (addendum-2 §4).",
  }),

  // ----------------------------------------------------------------- balance
  // Acrobatics sector — addendum-1 §1. ALL nodes are NO_AUTO_UNLOCK (attested):
  // the app cannot verify a coach, spotter, or surface. Measurable criteria live in
  // descriptions; surface / spotterRequired flags mirror §1's tables.
  node("acro.cmj_gate", "Jump Gate (G-JUMP)", "balance", 0, ATTESTED, [], {
    evidence: "D",
    description:
      "CMJ with arm swing ≥ 0.25 × height (recommended 0.33×); floor constant max(0.25×height_cm, 40) cm. No-jump-mat proxy (G-TUCKJUMP): 10 clean tuck jumps, knees above waist, quiet landing (addendum-1 §1.1).",
  }),
  // Roll line — addendum-1 §1.2 (sector hub).
  node("rolls.fwd_roll", "Forward Roll", "balance", 0, ATTESTED, [], {
    description: "5 consecutive, chin tucked, stand without hands.",
  }),
  node("rolls.back_shoulder_roll", "Backward Shoulder Roll", "balance", 1, ATTESTED, ["rolls.fwd_roll"], {
    description: "5 consecutive, no neck loading.",
  }),
  node("rolls.back_roll", "Backward Roll", "balance", 2, ATTESTED, ["rolls.back_shoulder_roll"], {
    description: "5 consecutive to feet, hands push.",
  }),
  node("rolls.roll_combos", "Roll Combinations", "balance", 3, ATTESTED, ["rolls.back_roll"], {
    description: "3 × 4-roll sequences (fwd→back→fwd) without pausing.",
  }),
  node("rolls.dive_roll", "Dive Roll", "balance", 4, ATTESTED, ["rolls.roll_combos"], {
    description: "5 clean over a knee-height obstacle, silent hands — direct front-flip prep.",
  }),
  node("rolls.back_extension_roll", "Back Extension Roll", "balance", 5, ATTESTED, ["rolls.dive_roll"], {
    description: "3×3 roll-to-handstand snap; optional feeder for the back-handspring line.",
  }),
  // Cartwheel → roundoff → aerial line — addendum-1 §1.3.
  node("cartwheel.cartwheel", "Cartwheel", "balance", 1, ATTESTED, ["rolls.fwd_roll"], {
    description: "5 clean per side, legs straight, lands in lunge.",
  }),
  node("cartwheel.power_cartwheel", "Power / Dive Cartwheel", "balance", 2, ATTESTED, ["cartwheel.cartwheel"], {
    description: "5 per dominant side with visible flight to hands.",
  }),
  node("cartwheel.one_hand_cartwheel", "One-Handed Cartwheel", "balance", 3, ATTESTED, ["cartwheel.power_cartwheel"], {
    description: "3×3 near-hand and far-hand variants.",
  }),
  node("cartwheel.roundoff", "Roundoff", "balance", 4, ATTESTED, ["cartwheel.one_hand_cartwheel"], {
    description: "5 with immediate vertical rebound; handstand snap-down drill 3×5.",
  }),
  node("cartwheel.aerial", "Side Aerial", "balance", 5, ATTESTED, ["cartwheel.roundoff"], {
    surface: "resi",
    spotterRequired: true,
    estMonths: [3, 9],
    description: "First: 1 clean spotted on soft; owned at 3 per side on firm mat. Adds 60 s side plank prereq.",
  }),
  // Back handspring line — addendum-1 §1.5; reuses handstand.wall_60s + bridge.full_bridge.
  node("back_handspring.jump_back", "Jump-Back Drill", "balance", 4, ATTESTED, [
    "handstand.wall_60s",
    "bridge.full_bridge",
  ], { surface: "resi", description: "3×10 sit-to-jump-back onto stacked soft mats." }),
  node("back_handspring.bridge_kickover", "Bridge Kickover", "balance", 5, ATTESTED, ["back_handspring.jump_back"], {
    description: "3×5 kickovers.",
  }),
  node("back_handspring.hs_snapdown", "Handstand Snap-Down", "balance", 6, ATTESTED, [
    "back_handspring.bridge_kickover",
  ], { description: "3×8 with rebound." }),
  node("back_handspring.bhs_spotted", "Back Handspring (spotted, soft)", "balance", 7, ATTESTED, [
    "back_handspring.hs_snapdown",
  ], { surface: "tumbltrak", spotterRequired: true, description: "10 spotted, then 10 unspotted on soft." }),
  node("back_handspring.bhs_floor", "Back Handspring (floor)", "balance", 8, ATTESTED, [
    "back_handspring.bhs_spotted",
  ], { surface: "floor", estMonths: [3, 9], description: "3 consecutive, straight arms." }),
  // Back flip line — addendum-1 §1.4; rep counts are one coach's program (tier D).
  node("backflip.set_drills", "Backflip Set Drills", "balance", 3, ATTESTED, [
    "acro.cmj_gate",
    "dragon_flag.hollow",
    "rolls.back_roll",
  ], { evidence: "D", description: "15 clean eagle-arm-swing straight jumps, full height, arms finish by ears." }),
  node("backflip.candlestick_jumpback", "Eagle → Tucked Candlestick", "balance", 4, ATTESTED, [
    "backflip.set_drills",
  ], { evidence: "D", surface: "floor", description: "30 reps jumping back onto a flat mat stack, roll to candlestick." }),
  node("backflip.elevated_jumpback", "Dead-Bug Jump-Back to Elevated Mat", "balance", 5, ATTESTED, [
    "backflip.candlestick_jumpback",
  ], { evidence: "D", surface: "resi", description: "30 reps." }),
  node("backflip.tramp_backtuck", "Trampoline Rebound Back Tuck", "balance", 6, ATTESTED, [
    "backflip.elevated_jumpback",
  ], { evidence: "D", surface: "tumbltrak", spotterRequired: true, description: "10 spotted, then 50 unspotted." }),
  node("backflip.raised_to_pit", "Back Tuck from Raised Surface to Pit", "balance", 7, ATTESTED, [
    "backflip.tramp_backtuck",
  ], { evidence: "D", surface: "pit", description: "30 reps." }),
  node("backflip.pit_backtuck", "Standing Back Tuck into Pit / Resi", "balance", 8, ATTESTED, [
    "backflip.raised_to_pit",
  ], { evidence: "D", surface: "pit", description: "50 reps." }),
  node("backflip.floor_spotted", "Back Tuck on Floor (spotted)", "balance", 9, ATTESTED, ["backflip.pit_backtuck"], {
    evidence: "D",
    surface: "floor",
    spotterRequired: true,
    description: "15 reps with spot.",
  }),
  node("backflip.standing_backtuck", "Standing Back Tuck", "balance", 10, ATTESTED, ["backflip.floor_spotted"], {
    surface: "floor",
    isStunt: true,
    estMonths: [2, 6],
    description: "3 consecutive on floor, landed on feet, no hand-down. Coach supervision mandatory for first attempts.",
  }),
  // Front flip line — addendum-1 §1.6; lands blind.
  node("frontflip.tuck_jump_punch", "Tuck Jump + Punch Drills", "balance", 5, ATTESTED, [
    "acro.cmj_gate",
    "dragon_flag.hollow",
    "rolls.dive_roll",
  ], { description: "10 tuck jumps knees-above-waist; punch = stiff-ankle bounce." }),
  node("frontflip.dive_roll_block", "Dive Roll over Elevated Block", "balance", 6, ATTESTED, [
    "frontflip.tuck_jump_punch",
  ], { surface: "floor", description: "5 clean, silent hands." }),
  node("frontflip.tramp_fronttuck", "Trampoline Front Tuck", "balance", 7, ATTESTED, ["frontflip.dive_roll_block"], {
    surface: "tumbltrak",
    description: "10 clean to feet.",
  }),
  node("frontflip.punch_to_resi_seated", "Punch Front onto Elevated Resi (seated finish)", "balance", 8, ATTESTED, [
    "frontflip.tramp_fronttuck",
  ], { surface: "resi", description: "10 reps — the seated finish proves upward set, not forward throw." }),
  node("frontflip.punch_into_pit", "Punch Front into Pit", "balance", 9, ATTESTED, ["frontflip.punch_to_resi_seated"], {
    surface: "pit",
    description: "10 to feet.",
  }),
  node("frontflip.resi_spotted", "Punch Front onto 20 cm Mat (spotted)", "balance", 10, ATTESTED, [
    "frontflip.punch_into_pit",
  ], { surface: "resi", spotterRequired: true, description: "10 reps." }),
  node("frontflip.floor_fronttuck", "Standing / Punch Front Tuck", "balance", 11, ATTESTED, [
    "frontflip.resi_spotted",
  ], { surface: "floor", isStunt: true, estMonths: [2, 6], description: "3 consecutive to feet on floor; lands blind." }),

  // ------------------------------------------------------------- run_martial
  // Run distance ladder — addendum-1 §3.1.
  node("run_distance.mile", "Run 1 Mile Continuous", "run_martial", 0, distanceOf(1609, "1 completion, conversational pace"), [], {
    estMonths: [0, 1],
  }),
  node("run_distance.5k", "Run 5K Continuous", "run_martial", 1, distanceOf(5000, "1 completion"), [
    "run_distance.mile",
  ], { estMonths: [2, 3], description: "C25K-style build: 9 wk × 3 sessions/wk to 30 min continuous." }),
  node("run_distance.10k", "Run 10K", "run_martial", 2, distanceOf(10000, "1 completion"), ["run_distance.5k"], {
    estMonths: [4, 6],
    description: "≥3 runs/wk for 6+ wk post-5K; weekly volume +≤10%.",
  }),
  node("run_distance.half", "Half Marathon Finish", "run_martial", 3, distanceOf(21097, "1 finish"), [
    "run_distance.10k",
  ], { estMonths: [8, 12], description: "Long run ≥15 km logged; 10–12 wk block." }),
  node("run_distance.marathon", "Marathon Finish", "run_martial", 4, distanceOf(42195, "1 finish"), [
    "run_distance.half",
  ], { isStunt: true, estMonths: [14, 24], description: "16–18 wk block; long run ≥28–30 km. Keep runs ≥24 h from Legs day." }),
  // Run speed tiers — addendum-1 §3.2 (criterion seconds = ♂ threshold; ♀ via locomotionTimeBySex).
  ...runSpeedSpecs.map((s) =>
    node(s.id, s.name, "run_martial", s.ring, timeUnder(s.male, "male threshold; female via locomotionTimeBySex"), [
      s.prereq,
    ], { evidence: "B", description: "RunRepeat finisher percentiles (finishers-only, pre-2020 vintage)." }),
  ),
  // Rowing / erg ladder. Nothing in the corpus covers indoor rowing; distances are the
  // standard Concept2 pieces and the whole line is evidence tier D. Logged from the cardio
  // log (modality "row") — the routine contains no rowing, exactly as with running.
  node("row.500m", "Row 500 m", "run_martial", 0, distanceOf(500, "one continuous piece"), [], {
    evidence: "D",
    description: "The erg sprint. Two minutes of unpleasantness and the entry point to every other piece here.",
  }),
  node("row.1k", "Row 1 km", "run_martial", 1, distanceOf(1000), ["row.500m"], {
    evidence: "D", description: "Long enough that pacing starts to matter.",
  }),
  node("row.2k", "Row 2 km", "run_martial", 2, distanceOf(2000), ["row.1k"], {
    evidence: "D",
    description: "THE benchmark piece — every rowing programme in the world is judged on it. Complete one first; the time tiers above ask you to get fast at it.",
  }),
  node("row.5k", "Row 5 km", "run_martial", 3, distanceOf(5000), ["row.2k"], {
    evidence: "D", description: "The aerobic counterpart to the 2K's threshold test.",
  }),
  node("row.10k", "Row 10 km", "run_martial", 4, distanceOf(10000), ["row.5k"], { evidence: "D" }),
  node("row.half", "Row Half Marathon", "run_martial", 5, distanceOf(21097, "1 piece"), ["row.10k"], {
    evidence: "D", estMonths: [6, 12], description: "21,097 m unbroken. Seat and hands fail before the legs do.",
  }),
  node("row.marathon", "Row Marathon", "run_martial", 6, distanceOf(42195, "1 piece"), ["row.half"], {
    isStunt: true, evidence: "D", estMonths: [12, 24],
    description: "42,195 m in one sitting — around three hours on the erg. A Concept2 season-classic piece and pure attrition.",
  }),
  node("row.million_meters", "Million Metres", "run_martial", 7, distanceOf(1000000, "CUMULATIVE total"), [
    "row.marathon",
  ], {
    isStunt: true, evidence: "D", estMonths: [12, 36],
    description: "The Concept2 Million Metre Club. The ONLY cumulative criterion in the app — every other distance is one unbroken effort. Roughly 20 km a week for a year.",
  }),
  // 2K erg time tiers — criterion seconds = ♂ threshold; ♀ via locomotionTimeBySex.
  ...rowSpeedSpecs.map((s) =>
    node(s.id, s.name, "run_martial", s.ring, timeUnder(s.male, "male threshold; female via locomotionTimeBySex"), [
      s.prereq,
    ], { evidence: "D", description: "Indoor-rowing population approximations, not a validated table — see the note on rowSpeedSpecs." }),
  ),
  // Swim ladder — addendum-1 §3.4.
  node("swim.competence_100m", "Water Competence (100 m)", "run_martial", 0, distanceOf(100, "continuous, any stroke"), [], {
    description: "Below this, recommend lessons — do not gamify (drowning risk).",
  }),
  node("swim.400m", "400 m Continuous Freestyle", "run_martial", 1, distanceOf(400), ["swim.competence_100m"], {
    estMonths: [1, 3],
  }),
  node("swim.750m", "750 m (Sprint-Tri Distance)", "run_martial", 2, distanceOf(750), ["swim.400m"]),
  node("swim.1000m", "1000 m Continuous", "run_martial", 3, distanceOf(1000), ["swim.750m"]),
  node("swim.1500m", "1500 m — the Mile", "run_martial", 4, distanceOf(1500), ["swim.1000m"], {
    estMonths: [6, 12],
    description: "Olympic-tri distance; beginner 30–40 min, advanced 20–25 min.",
  }),
  node("swim.2km", "2 km Continuous", "run_martial", 5, distanceOf(2000), ["swim.1500m"]),
  node("swim.3800m", "3.8 km Swim (Ironman Distance)", "run_martial", 6, distanceOf(3800), ["swim.2km"], {
    isStunt: true,
    description: "Elite-endurance capstone; open-water only with lifeguard/buddy.",
  }),
];

/**
 * Merge the core lines with the per-sector extensions, then normalize rings so each
 * sector's lowest ring is 0. Extensions author true-beginner content at NEGATIVE
 * rings (there is no room below an existing hub otherwise); the shift preserves every
 * prereq ordering, so the strict-ring / DAG invariants in skills.test.ts still hold.
 */
function buildSkills(list: SkillNode[], extensions: SectorExtension[]): Record<string, SkillNode> {
  const out: Record<string, SkillNode> = {};
  for (const n of list) {
    if (out[n.id]) throw new Error(`duplicate skill id: ${n.id}`);
    out[n.id] = n;
  }
  for (const ext of extensions) {
    for (const n of ext.nodes) {
      if (out[n.id]) throw new Error(`duplicate skill id: ${n.id}`);
      out[n.id] = n;
    }
  }
  // Splice extra prereqs onto existing nodes (extensions cannot edit this file).
  for (const ext of extensions) {
    for (const [id, extraPrereqs] of Object.entries(ext.rewire ?? {})) {
      const target = out[id];
      if (!target) throw new Error(`rewire targets unknown skill: ${id}`);
      const merged = [...new Set([...target.prereqs, ...extraPrereqs])];
      for (const p of merged) {
        if (!out[p]) throw new Error(`rewire ${id} references unknown prereq: ${p}`);
      }
      out[id] = { ...target, prereqs: merged };
    }
  }
  // Per-sector ring normalization.
  const minRing: Partial<Record<Sector, number>> = {};
  for (const n of Object.values(out)) {
    const cur = minRing[n.sector];
    if (cur === undefined || n.ring < cur) minRing[n.sector] = n.ring;
  }
  for (const id of Object.keys(out)) {
    const n = out[id];
    const shift = minRing[n.sector] ?? 0;
    if (shift !== 0) out[id] = { ...n, ring: n.ring - shift };
  }
  // Bring rep criteria into agreement with what the plan actually prescribes. The routine
  // now advances a progression at 3x8 (prescription.ts, doc 01 R-DYN), so a node asking for
  // more reps than the plan will ever prescribe could never be reached by training it —
  // which is exactly the "the stunt chart and the workout disagree" complaint.
  //
  // Only LOWERED, never raised: a node whose criterion is already <= 8 is a genuine skill
  // standard from doc 01's tables (planche push-up 3x3, HSPU 3x5) and the plan simply
  // overshoots it. Raising those to 8 would invent difficulty the corpus does not support.
  for (const id of Object.keys(out)) {
    const n = out[id];
    const target = rdynRepsByExercise[id];
    if (target === undefined || n.criterion.kind !== "reps") continue;
    // reps > target -> lower it; reps === target -> still align the SET COUNT, or the
    // card reads "2 sets x 8" while the plan prescribes 3. reps < target is a genuine
    // skill standard from doc 01 (planche push-up 3x3) and keeps both numbers.
    if (n.criterion.reps < target) continue;
    out[id] = { ...n, criterion: { ...n.criterion, reps: target, sets: RDYN_SETS } };
  }
  return out;
}

/** The complete Protean skill tree across all 9 sectors — doc 01 §6 + addendum-1 §4 + addendum-2 §4. */
export const skills: Record<string, SkillNode> = buildSkills(nodeList, sectorExtensions);
