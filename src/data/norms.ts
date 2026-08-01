// Field-test registry + normative anchor tables.
// Sources: docs/research/04-assessment-domains.md §3 (norm tables), §4.2 (anchor scores),
// §6 (Protean Combine battery); docs/research/06-addendum-1.md §3.2–3.3 (locomotion tiers);
// docs/research/06-addendum-3.md §4 (canonical strength standards — supersedes doc 04 §4.3).
// All values are TRANSCRIBED from the docs, never re-derived.
//
// Category-table → anchor conversion policy (doc 04 §4.2 anchor scores:
// Poor/Untrained 10 · Fair/Beginner 25 · Average/Novice 45 · Good/Intermediate 60 ·
// Very good/Advanced 80 · Excellent/Elite 92 · Superior/World-class 100):
//   - anchor raw = minimum value qualifying for the category (higher-is-better tests);
//   - the bottom open category ("<x" / "≤x") anchors at its boundary (x − 1 unit) with score 10;
//   - ">x" thresholds anchor at x + 1 measurement unit;
//   - below the first anchor the piecewise scorer clamps to the first anchor's score.

import type { Sex } from "../lib/types";
import type { AnchorSet, AxisId, RadarAnchors, ScoreDirection } from "../lib/scoring";

// ---------------------------------------------------------------------------
// Test registry

/**
 * Field-test definition (local type — not in src/lib/types.ts).
 * domain = the radar axis the test primarily feeds (doc 04 §2); grip is folded into
 * max strength (dynamometer) per doc 04 §2's 7-spoke recommendation.
 */
export interface TestDef {
  id: string;
  name: string;
  unit: string;
  domain: AxisId;
  direction: ScoreDirection;
  /** Protocol reminder shown at result entry. */
  entryHint: string;
  /** true = derived from the lift log (canonical e1RM), never user-entered. */
  computed?: boolean;
}

/** The Protean Combine battery + extras covered by doc 04 §3 tables (doc 04 §6). */
export const tests: TestDef[] = [
  {
    id: "pushup_max",
    name: "Push-up max reps",
    unit: "reps",
    domain: "strength_endurance",
    direction: "higher",
    entryHint: "Strict full push-ups to failure, no pausing (ACSM/CSEP protocol). Flag if the knee variant was tested.",
  },
  {
    id: "pullup_max",
    name: "Pull-up max reps",
    unit: "reps",
    domain: "strength_endurance",
    direction: "higher",
    entryHint: "Strict reps from a dead-hang start, chin over bar, no kip.",
  },
  {
    id: "plank_hold",
    name: "Plank hold",
    unit: "s",
    domain: "strength_endurance",
    direction: "higher",
    entryHint: "Forearm plank, strict hips — stop the clock on sag or pike.",
  },
  {
    id: "dead_hang",
    name: "Dead hang",
    unit: "s",
    domain: "strength_endurance",
    direction: "higher",
    entryHint: "Two-arm hang on a bar, straight arms, to release.",
  },
  {
    id: "wall_sit",
    name: "Wall sit",
    unit: "s",
    domain: "strength_endurance",
    direction: "higher",
    entryHint: "Back flat on the wall, hips and knees at 90°.",
  },
  {
    id: "vertical_jump",
    name: "Vertical jump",
    unit: "cm",
    domain: "power",
    direction: "higher",
    entryHint: "Countermovement jump with arm swing; best of 3.",
  },
  {
    id: "broad_jump",
    name: "Standing broad jump",
    unit: "cm",
    domain: "power",
    direction: "higher",
    entryHint: "Two-foot take-off and stuck landing; best of 3, measured to rear heel.",
  },
  {
    id: "grip_strength",
    name: "Grip strength",
    unit: "kg",
    domain: "max_strength",
    direction: "higher",
    entryHint: "Jamar-style dynamometer, dominant hand, seated, elbow at 90°. Test both hands for symmetry.",
  },
  {
    id: "sit_and_reach",
    name: "Sit-and-reach",
    unit: "cm",
    domain: "mobility",
    direction: "higher",
    entryHint: "Box test, footline = 26 cm (ACSM convention). Record which box convention was used.",
  },
  {
    id: "balance_ec_single_leg",
    name: "Single-leg balance (eyes closed)",
    unit: "s",
    domain: "skill_balance",
    direction: "higher",
    entryHint: "Eyes closed, arms free, free foot off the floor; cap at 45 s; test both legs.",
  },
  {
    id: "cooper_12min",
    name: "Cooper 12-min run",
    unit: "m",
    domain: "aerobic",
    direction: "higher",
    entryHint: "Maximum distance in 12 minutes on a track or with GPS.",
  },
  {
    id: "beep_test",
    name: "20 m beep test",
    unit: "level",
    domain: "aerobic",
    direction: "higher",
    entryHint: "20 m shuttle to the beep; enter the last completed level (level 1 = 8.5 km/h, Léger 1988).",
  },
  // Lift-derived pseudo-tests (doc 04 §6 battery items 1–4) — computed from the lift log
  // via the canonical e1RM (doc 06-addendum-3 §2.2), never entered directly.
  {
    id: "squat_e1rm",
    name: "Squat e1RM",
    unit: "kg",
    domain: "max_strength",
    direction: "higher",
    computed: true,
    entryHint: "Computed from logged squat/weighted-pistol sets (canonical e1RM, r ≤ 10) — not entered directly.",
  },
  {
    id: "deadlift_e1rm",
    name: "Deadlift e1RM",
    unit: "kg",
    domain: "max_strength",
    direction: "higher",
    computed: true,
    entryHint: "Computed from logged deadlift/RDL sets (canonical e1RM, r ≤ 10) — not entered directly.",
  },
  {
    id: "weighted_pullup_e1rm",
    name: "Weighted pull-up e1RM",
    unit: "kg added",
    domain: "max_strength",
    direction: "higher",
    computed: true,
    entryHint: "Computed from logged weighted pull-up sets (added weight; negative = assisted) — not entered directly.",
  },
  {
    id: "weighted_dip_e1rm",
    name: "Weighted dip e1RM",
    unit: "kg added",
    domain: "max_strength",
    direction: "higher",
    computed: true,
    entryHint: "Computed from logged weighted dip sets (added weight; negative = assisted) — not entered directly.",
  },
];

// ---------------------------------------------------------------------------
// Anchor-table helpers

const hi = (raw: number[], scores: number[]): AnchorSet => ({ raw, scores, direction: "higher" });
const lo = (raw: number[], scores: number[]): AnchorSet => ({ raw, scores, direction: "lower" });

/** Age-bracket keys as printed in doc 04 §3.1. */
export type AgeBracket = "20-29" | "30-39" | "40-49" | "50-59";

// ---------------------------------------------------------------------------
// Doc 04 §3 norm tables, by sex (age brackets where the doc has them)

/**
 * §3.1 Push-up max reps (ACSM/CSEP strict full push-ups) — TrainRBoost/Topendsports norms.
 * Categories Needs-work/Fair/Good/Excellent/Superior → scores 10/25/60/92/100.
 * Female "35–39 (alt src)" row not encoded (conflicting duplicate of 30–39).
 */
export const pushupNorms = {
  male: {
    "20-29": hi([16, 17, 22, 29, 36], [10, 25, 60, 92, 100]),
    "30-39": hi([11, 12, 17, 22, 30], [10, 25, 60, 92, 100]),
    "40-49": hi([9, 10, 13, 17, 25], [10, 25, 60, 92, 100]),
    "50-59": hi([6, 7, 10, 13, 21], [10, 25, 60, 92, 100]),
  },
  female: {
    "20-29": hi([9, 10, 15, 21, 30], [10, 25, 60, 92, 100]),
    "30-39": hi([7, 8, 13, 20, 27], [10, 25, 60, 92, 100]),
  },
} satisfies Record<Sex, Partial<Record<AgeBracket, AnchorSet>>>;

/**
 * §3.2 Pull-up max reps (strict, dead-hang start) — strengthlevel.com user data [practitioner].
 * Untrained/Beginner/Intermediate/Advanced/Elite → 10/25/60/80/92 (levels ≈ percentiles).
 */
export const pullupNorms: Record<Sex, AnchorSet> = {
  male: hi([0, 2, 8, 15, 25], [10, 25, 60, 80, 92]),
  female: hi([0, 1, 4, 8, 15], [10, 25, 60, 80, 92]),
};

/** §3.3 Plank hold (forearm, strict hips), app categories in seconds — J.Hum.Kinet. + Topendsports. */
export const plankNorms: Record<Sex, AnchorSet> = {
  male: hi([29, 30, 60, 110, 181], [10, 25, 45, 60, 92]),
  female: hi([29, 30, 60, 95, 151], [10, 25, 45, 60, 92]),
};

/**
 * §3.4 Dead hang (two-arm, straight arms) — deadhangs.com / Marathon Handbook [practitioner only].
 * Poor/Below-avg/Median/Top-25%/Excellent → 10/25/45/80/92 (top quartile ≈ Advanced).
 */
export const deadHangNorms: Record<Sex, AnchorSet> = {
  male: hi([19, 20, 40, 60, 90], [10, 25, 45, 80, 92]),
  female: hi([14, 15, 28, 45, 70], [10, 25, 45, 80, 92]),
};

/** §3.5 Wall sit, two-leg 90° app anchors (s) — MAT Assessment / Topendsports [practitioner]. */
export const wallSitNorms: Record<Sex, AnchorSet> = {
  male: hi([29, 30, 50, 121], [10, 25, 60, 92]),
  female: hi([29, 30, 35, 101], [10, 25, 60, 92]),
};

/** §3.6 Vertical jump, general adult (cm, countermovement + arm swing) — Topendsports compilation. */
export const verticalJumpNorms: Record<Sex, AnchorSet> = {
  male: hi([30, 31, 41, 51, 61, 71], [10, 25, 45, 60, 80, 92]),
  female: hi([20, 21, 31, 41, 51, 61], [10, 25, 45, 60, 80, 92]),
};

/**
 * §3.7 Standing broad jump (cm), ages 20–29 — Topendsports/NSCA compilation.
 * Doc gives no "Poor" band, so the floor score is 25 (Below-avg), not 10.
 */
export const broadJumpNorms: Record<Sex, AnchorSet> = {
  male: hi([190, 191, 221, 241], [25, 45, 60, 92]),
  female: hi([145, 146, 176, 196], [25, 45, 60, 92]),
};

/**
 * §3.8 Grip dynamometer (kg, dominant hand), ages 25–34 — JOSPT 2018 / UK pooling [peer-reviewed].
 * Percentile-as-score (doc 04 §4.2 option 1): p25/p50/p75 → 25/50/75; the score-10 anchor is
 * the EWGSOP2 clinical weakness cutoff (M <27 kg, F <16 kg).
 */
export const gripNorms: Record<Sex, AnchorSet> = {
  male: hi([27, 44, 50, 56], [10, 25, 50, 75]),
  female: hi([16, 25, 30, 34], [10, 25, 50, 75]),
};

/**
 * §3.9 Sit-and-reach (cm, box footline = 26 cm ACSM) — FitnessNorms/Topendsports.
 * Male ">33 excellent / >36 elite" → anchors 34→92, 37→100; no female elite value published.
 */
export const sitAndReachNorms: Record<Sex, AnchorSet> = {
  male: hi([14, 15, 24, 25, 34, 37], [10, 25, 45, 60, 92, 100]),
  female: hi([21, 22, 31, 32, 40], [10, 25, 45, 60, 92]),
};

/** §3.11 Single-leg balance eyes-closed (s, adults <40) — Springer 2007; gender-independent norms. */
const balanceEcAnchors = hi([4, 5, 13, 20, 31], [10, 25, 45, 60, 92]);
export const balanceEcNorms: Record<Sex, AnchorSet> = {
  male: balanceEcAnchors,
  female: balanceEcAnchors,
};

/** §3.10 Cooper 12-min distance norms (m), ages 20–29 — Topendsports. */
export const cooperDistanceNorms: Record<Sex, AnchorSet> = {
  male: hi([1599, 1600, 2200, 2400, 2801], [10, 25, 45, 60, 92]),
  female: hi([1499, 1500, 1800, 2200, 2701], [10, 25, 45, 60, 92]),
};

/**
 * §3.10 VO2max categories (ml/kg/min), ages 20–29 (30–39 shifts bands down ~2–3 units — not encoded).
 * The 33/28 anchor is the implied Fair band between "poor" and "avg".
 */
export const vo2maxNorms: Record<Sex, AnchorSet> = {
  male: hi([32, 33, 37, 44, 49], [10, 25, 45, 60, 92]),
  female: hi([27, 28, 31, 37, 41], [10, 25, 45, 60, 92]),
};

// ---------------------------------------------------------------------------
// Locomotion percentile tables (doc 06-addendum-1 §3.2–3.3) — feed the aerobic axis

export type RunDistanceId = "run_5k" | "run_10k" | "run_half" | "run_marathon";

/** Percentile-as-score for RunRepeat finisher tiers: median/top-30%/top-10%/top-1% → 50/70/90/99. */
const RUN_TIER_SCORES = [50, 70, 90, 99];

/**
 * Addendum-1 §3.2 sex-specific run finish-time tiers (seconds; RunRepeat n≈107.9M, tier B).
 * direction "lower": faster time = higher score. Finishers-only — survivor bias, display caveat.
 */
export const runTimeNorms: Record<RunDistanceId, Record<Sex, AnchorSet>> = {
  run_5k: {
    male: lo([1888, 1678, 1406, 1050], RUN_TIER_SCORES), // 31:28 / 27:58 / 23:26 / 17:30
    female: lo([2248, 1999, 1704, 1299], RUN_TIER_SCORES), // 37:28 / 33:19 / 28:24 / 21:39
  },
  run_10k: {
    male: lo([3435, 3148, 2711, 2064], RUN_TIER_SCORES), // 57:15 / 52:28 / 45:11 / 34:24
    female: lo([4014, 3662, 3215, 2472], RUN_TIER_SCORES), // 1:06:54 / 1:01:02 / 53:35 / 41:12
  },
  run_half: {
    male: lo([7188, 6903, 6035, 4717], RUN_TIER_SCORES), // 1:59:48 / 1:55:03 / 1:40:35 / 1:18:37
    female: lo([8643, 7945, 7021, 5755], RUN_TIER_SCORES), // 2:24:03 / 2:12:25 / 1:57:01 / 1:35:55
  },
  run_marathon: {
    male: lo([15269, 13987, 12160, 9858], RUN_TIER_SCORES), // 4:14:29 / 3:53:07 / 3:22:40 / 2:44:18
    female: lo([16929, 15624, 13762, 11495], RUN_TIER_SCORES), // 4:42:09 / 4:20:24 / 3:49:22 / 3:11:35
  },
};

/** Addendum-1 §3.3 WMA age-graded % bands (highest matching min wins). */
export const agGradeBands: Array<{ min: number; label: string }> = [
  { min: 90, label: "World class" },
  { min: 80, label: "National class" },
  { min: 70, label: "Regional class" },
  { min: 60, label: "Local class" },
  { min: 0, label: "Recreational" },
];

// ---------------------------------------------------------------------------
// Strength anchors for the max/relative-strength axes (doc 06-addendum-3 §4 — canonical;
// supersedes doc 04 §4.3, which is deleted by decree)

export type LiftId =
  | "squat"
  | "bench"
  | "deadlift"
  | "ohp"
  | "row"
  | "weighted_pullup"
  | "weighted_dip";

/**
 * REFERENCE absolute anchors (kg) at M 80 kg / F 60 kg — addendum-3 §4.1 fresh StrengthLevel
 * pull (2026-08-01), Beg/Nov/Int/Adv/Elite; pair with scoring.LIFT_TIER_SCORES [25,45,60,80,92].
 * Weighted pull-up/dip values are ADDED weight (negative = assistance). PRODUCTION NOTE
 * (addendum-3 §4.3): anchors are NOT bodyweight-invariant — prefer the standards-lookup module
 * at the athlete's current logged bodyweight and pass its output to scoring.radar().
 */
export const refMaxStrengthAnchorsKg: Record<Sex, Record<LiftId, number[]>> = {
  male: {
    squat: [75, 101, 132, 168, 206],
    bench: [56, 75, 98, 124, 151],
    deadlift: [89, 119, 155, 196, 239],
    ohp: [33, 46, 62, 81, 101],
    row: [48, 66, 88, 114, 141],
    weighted_pullup: [-2, 14, 33, 54, 75],
    weighted_dip: [5, 26, 52, 81, 111],
  },
  female: {
    squat: [32, 49, 72, 99, 129],
    bench: [19, 31, 47, 66, 88],
    deadlift: [40, 60, 86, 116, 149],
    ohp: [12, 20, 31, 43, 57],
    row: [18, 29, 43, 59, 78],
    weighted_pullup: [-16, -4, 9, 23, 38],
    weighted_dip: [-15, 0, 17, 37, 58],
  },
};

/**
 * ×BW anchors at the reference bodyweights (addendum-3 §4.3, computed M 80 / F 60).
 * Same tier scores as above; weighted pull-up/dip = added÷BW (negative = assisted).
 * Frozen ratios drift ~±0.05 ×BW over a 10 kg bodyweight swing — reference/default only.
 */
export const relStrengthAnchorsXbw: Record<Sex, Record<LiftId, number[]>> = {
  male: {
    squat: [0.94, 1.26, 1.65, 2.1, 2.58],
    bench: [0.7, 0.94, 1.23, 1.55, 1.89],
    deadlift: [1.11, 1.49, 1.94, 2.45, 2.99],
    ohp: [0.41, 0.57, 0.78, 1.01, 1.26],
    row: [0.6, 0.82, 1.1, 1.43, 1.76],
    weighted_pullup: [-0.03, 0.17, 0.41, 0.68, 0.94],
    weighted_dip: [0.06, 0.33, 0.65, 1.01, 1.39],
  },
  female: {
    squat: [0.53, 0.82, 1.2, 1.65, 2.15],
    bench: [0.32, 0.52, 0.78, 1.1, 1.47],
    deadlift: [0.67, 1.0, 1.43, 1.93, 2.48],
    ohp: [0.2, 0.33, 0.52, 0.72, 0.95],
    row: [0.3, 0.48, 0.72, 0.98, 1.3],
    weighted_pullup: [-0.27, -0.07, 0.15, 0.38, 0.63],
    weighted_dip: [-0.25, 0.0, 0.28, 0.62, 0.97],
  },
};

// ---------------------------------------------------------------------------
// Per-sex anchor bundles for scoring.radar()

/**
 * Default per-sex field-test anchor bundle for the 7-axis radar (doc 04 §2, §4.4:
 * each athlete is scored against their own sex's tables). Uses the 20–29 age brackets;
 * doc 04 §4.5: ship without age adjustment for the current users, add Foster/McCulloch later.
 */
export const radarAnchorsBySex: Record<Sex, RadarAnchors> = {
  male: {
    verticalJump: verticalJumpNorms.male,
    broadJump: broadJumpNorms.male,
    pushup: pushupNorms.male["20-29"],
    pullup: pullupNorms.male,
    plank: plankNorms.male,
    balanceEc: balanceEcNorms.male,
    sitAndReach: sitAndReachNorms.male,
    vo2max: vo2maxNorms.male,
  },
  female: {
    verticalJump: verticalJumpNorms.female,
    broadJump: broadJumpNorms.female,
    pushup: pushupNorms.female["20-29"],
    pullup: pullupNorms.female,
    plank: plankNorms.female,
    balanceEc: balanceEcNorms.female,
    sitAndReach: sitAndReachNorms.female,
    vo2max: vo2maxNorms.female,
  },
};
