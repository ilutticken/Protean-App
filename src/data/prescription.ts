// The plan as actually TRAINED, derived from the verbatim PDF transcription.
//
// `seed-plan.ts` is the faithful record of reference_mat/Printable-Routines.pdf and is
// pinned tier-by-tier by seed-plan.test.ts — it must never be edited to change training
// numbers. This module is the overlay that decides what the app actually prescribes.
//
// WHY IT EXISTS: the PDF gives each chain a single high rep band (2×25/50/100 …). Applied
// across a progression that spans wall knuckle push-ups to a full planche push-up, that
// produces both nonsense at the hard end (push-03 literally prescribed 2×20 full planche
// push-ups — flagged in the seed as PENDING-Q3) and, at the easy end, rep counts far past
// the point where you should have moved to a harder variation.
//
// THE STANDARD (doc 01 §2 rule R-DYN, doc 03 §2):
//   "3 sets × 8 clean reps in one session; restart next step at 3×5"
//   — r/bodyweightfitness Recommended Routine: 3×5–8, add ~1 rep/set/session, advance at
//     3×8; if you cannot hit 3×5 on the new variation, back off 1–2 weeks.
//   — Steven Low, Overcoming Gravity: bodyweight slots as 3×5→12.
// Evidence tier is PRACTITIONER, not trial: doc 01 §5 states plainly that no controlled
// trials exist on progression criteria or step ordering. It is consensus, and labelled so.
//
// Difficulty is carried by the CHAIN STEP, not the rep count — so a converted slot has a
// single target (8) rather than three bands. The engine's R-REP rule walks you up to it and
// R-STEP advances the step after two qualifying sessions, which reproduces 3×5→3×8.
//
// Conditioning slots keep their PDF doses: a 150-step loaded carry and a 5×60 s bag round
// are not progressions with a harder variation to advance into, and 3×8 would destroy them.

import { seedPlan } from "./seed-plan";
import type { Regime, SeedPlan, Slot } from "../lib/types";

/** R-DYN: advance the progression at 3 sets × 8 clean reps in one session. */
export const RDYN_SETS = 3;
export const RDYN_TARGET = 8;

/**
 * Rep-unit chain slots that are conditioning doses rather than strength progressions.
 * Structural rules below already exclude non-`chain` types, non-rep units, and single-step
 * slots; these three are chains by shape but conditioning by intent.
 *
 * Move a slot in or out of this set to change how it is prescribed — that is the only edit
 * needed, and `prescription.test.ts` will re-check the tree agrees.
 */
export const CONDITIONING_SLOTS: ReadonlySet<string> = new Set([
  "legs-05", // Hindu Squat > Bunny Hop > Backward Jog > Backward Walk — the chain ends in
  //            locomotion counted in steps; 3×8 backward walking is meaningless.
  "full-03", // Man Maker > Devil Press > Burpee > Incline Push-Up — metabolic conditioning.
  "full-07", // Med-Ball Slam / Sledgehammer / Woodchopper — power-endurance variations,
  //            not a difficulty ladder with a harder rung to advance into.
]);

// ---------------------------------------------------------------------------
// Heavy slots — the barbell work doc 03 §14 prescribes and the PDF never had.
//
// The corpus is explicit on both counts. §14's session template gives every training
// day "1 heavy squat/hinge @85%+ (3×3–5)", and §6 states plainly that the routine's
// low-load tiers "will build size and endurance fine, but the 2× bodyweight lift goal
// requires dedicated ≥85% work that must be added explicitly". These slots are that
// work. They live here, never in seed-plan.ts, because they are not in the PDF.
//
// 3×5 (not R-DYN's 3×8): the heavy slot is a strength dose, and doc 03 §5 puts the
// strength range at 75–85% for 6–10 reps with ≥85% for the max-strength goals. Rest
// is 180 s (§7) and RIR 2–3 (§6.2) — the app surfaces those through the usual paths.

const HEAVY_SETS = 3;
const HEAVY_REPS = 5;

/** One heavy barbell slot. Chain is hardest-first: barbell, then a loadable fallback. */
function heavy(
  id: string,
  sector: Slot["sector"],
  top: { n: string; ex: string },
  fallback: { n: string; ex: string },
): Slot {
  return {
    id,
    sets: HEAVY_SETS,
    tiers: [HEAVY_REPS],
    sector,
    note: "Heavy slot — doc 03 §14: ≥85% 1RM, 3×3–5, RIR 2–3, rest ~180 s.",
    chain: [
      { n: top.n, ex: top.ex, band: 0, load: true },
      { n: fallback.n, ex: fallback.ex, band: 0, load: true },
    ],
  };
}

/** The barbell slots, keyed by the day they belong to. */
export const HEAVY_SLOTS: Record<string, Slot[]> = {
  legs: [
    heavy("heavy-squat", "squat", { n: "Barbell Back Squat", ex: "barbell.back_squat" }, { n: "Goblet Squat", ex: "squat.dumbbell_squat" }),
    heavy("heavy-deadlift", "posterior", { n: "Barbell Deadlift", ex: "barbell.deadlift" }, { n: "Romanian Deadlift", ex: "hinge.rdl" }),
  ],
  pull: [
    heavy("heavy-row", "back_chain", { n: "Barbell Row", ex: "barbell.row" }, { n: "Bent Dumbbell Row", ex: "pull.bent_db_row" }),
  ],
  push: [
    heavy("heavy-bench", "pushup", { n: "Barbell Bench Press", ex: "barbell.bench_press" }, { n: "Weighted Dip", ex: "dip.dip_weighted" }),
    heavy("heavy-ohp", "dips_planche_hs", { n: "Barbell Overhead Press", ex: "barbell.ohp" }, { n: "Shoulder Press", ex: "push.shoulder_press" }),
  ],
  fullbody: [
    heavy("heavy-clean", "back_chain", { n: "Power Clean", ex: "barbell.power_clean" }, { n: "Kettlebell Swing", ex: "hinge.kb_swing" }),
  ],
};

/**
 * Which chain slot each heavy slot REPLACES, per regime. Always same-pattern, so the
 * day keeps every movement it owned and the exercise count stays at six:
 *   heavy-squat    <- legs-04 (bilateral squat)
 *   heavy-deadlift <- legs-03 (hinge)
 *   heavy-row      <- pull-07 (curls; the row pattern is upgraded, biceps stay in it)
 *   heavy-bench    <- push-05 (horizontal push volume)
 *   heavy-ohp      <- push-02 (vertical push)
 *   heavy-clean    <- full-02 (sandbag snatch — the power slot)
 *
 * calisthenic swaps nothing: doc 03 §14's heavy slot is already covered by the weighted
 * chains the PDF has (weighted pistol on legs, weighted pull-up on pull, weighted dip
 * on push).
 */
const SWAPS: Record<Regime, Record<string, Record<string, string>>> = {
  calisthenic: { legs: {}, pull: {}, push: {}, fullbody: {} },
  balanced: {
    legs: { "legs-04": "heavy-squat" },
    pull: { "pull-07": "heavy-row" },
    push: { "push-05": "heavy-bench" },
    fullbody: { "full-02": "heavy-clean" },
  },
  powerlifting: {
    legs: { "legs-04": "heavy-squat", "legs-03": "heavy-deadlift" },
    pull: { "pull-07": "heavy-row" },
    push: { "push-05": "heavy-bench", "push-02": "heavy-ohp" },
    fullbody: { "full-02": "heavy-clean" },
  },
};

export const REGIME_LABEL: Record<Regime, string> = {
  calisthenic: "Calisthenic",
  balanced: "Balanced",
  powerlifting: "Powerlifting",
};

export const REGIME_BLURB: Record<Regime, string> = {
  calisthenic: "The PDF routine as written. Heavy work is weighted calisthenics — weighted pull-ups, dips and pistols.",
  balanced: "One barbell lift a day: squat, row, bench, clean. Everything else stays bodyweight.",
  powerlifting: "Six barbell sessions a week — squat, deadlift, row, bench, overhead press, clean — around the same calisthenics chains.",
};

/** Barbell slots this regime puts in the week. */
export function heavySlotCount(regime: Regime): number {
  return Object.values(SWAPS[regime]).reduce((n, m) => n + Object.keys(m).length, 0);
}

/**
 * The six exercises each day actually prescribes.
 *
 * The PDF runs 9-13 slots a day, which is a long session and spreads the week's effort
 * thin. These six per day were chosen to keep every movement pattern the day owns while
 * dropping duplicates and accessories; everything else is marked `optional` and still
 * shown on the Plan screen, so nothing is lost and one edit here changes the workout.
 *
 * A slot that is an ALTERNATIVE to a core slot (legs-04-alt) is core too — it replaces
 * its base rather than adding to the count.
 */
export const CORE_SLOTS: Record<string, readonly string[]> = {
  // pistol (unilateral knee) · RDL (hinge) · goblet squat (bilateral + power) ·
  // cossack/side lunge (the ONLY frontal-plane leg work) · X-Up (core) · carry (loaded gait)
  legs: ["legs-02", "legs-03", "legs-04", "legs-06", "legs-09", "legs-11"],
  // row (horizontal) · front lever (straight-arm, a goal stunt) · pull-up chain ·
  // hanging core · curls (feeds the 1/2-BW curl stunt) · dead hang (grip)
  pull: ["pull-02", "pull-04", "pull-05", "pull-06", "pull-07", "pull-08"],
  // dips · HSPU (goal stunt) · planche · LaLanne (straight-arm core) ·
  // push-up volume chain · one-arm push-up (goal stunt)
  push: ["push-01", "push-02", "push-03", "push-04", "push-05", "push-07"],
  // KB clean & press · sandbag snatch (power) · man makers (metcon) ·
  // face pulls (posterior shoulder balance) · farmer carry · skipping (double-under stunt)
  fullbody: ["full-01", "full-02", "full-03", "full-08", "full-09", "full-10"],
};

/** Slots per day after trimming — the answer to "how many exercises is this workout?". */
export const CORE_SLOT_COUNT = 6;

/** The day's six slot ids under this regime, in plan order. */
export function coreSlotIds(dayId: string, regime: Regime = "calisthenic"): string[] {
  const swaps = SWAPS[regime]?.[dayId] ?? {};
  return (CORE_SLOTS[dayId] ?? []).map((id) => swaps[id] ?? id);
}

/** Is this slot one of the day's six under this regime? */
export function isCoreSlot(dayId: string, slot: Slot, regime: Regime = "calisthenic"): boolean {
  return coreSlotIds(dayId, regime).includes(slot.alternativeTo ?? slot.id);
}

/** True when a slot is a progression the athlete advances ALONG, so R-DYN applies. */
export function isStrengthProgression(slot: Slot): boolean {
  if (CONDITIONING_SLOTS.has(slot.id)) return false;
  if (slot.type !== undefined && slot.type !== "chain") return false; // quasi_iso, holds, rounds
  if (slot.unit !== undefined && slot.unit !== "reps") return false; // steps, skips, seconds
  return slot.chain.length >= 2; // nothing to advance into otherwise
}

/** The PDF slot, re-prescribed to R-DYN when it is a strength progression. */
export function toRdyn(slot: Slot): Slot {
  if (!isStrengthProgression(slot)) return slot;
  return { ...slot, sets: RDYN_SETS, tiers: [RDYN_TARGET] };
}

/**
 * Every slot the app knows about: the PDF's (R-DYN re-prescribed) plus the heavy barbell
 * slots. ALL of them, in every regime — `slotById` and the stored-progress map are built
 * from this, so a slot logged under one regime still resolves after switching to another.
 * Which six are prescribed today is a separate question, answered by coreSlots().
 */
export const plan: SeedPlan = {
  ...seedPlan,
  days: Object.fromEntries(
    Object.entries(seedPlan.days).map(([dayId, slots]) => [
      dayId,
      [...slots.map(toRdyn), ...(HEAVY_SLOTS[dayId] ?? [])],
    ]),
  ) as SeedPlan["days"],
};

/** The day's six — what the Workout screen actually prescribes, in plan order. */
export function coreSlots(dayId: string, regime: Regime = "calisthenic"): Slot[] {
  const day = (plan.days as Record<string, Slot[]>)[dayId] ?? [];
  const ids = coreSlotIds(dayId, regime);
  return day.filter((s) => ids.includes(s.alternativeTo ?? s.id));
}

/**
 * exerciseId -> the rep target the plan now prescribes for it, for every exercise inside a
 * converted slot. `skills.ts` uses this to bring each skill node's criterion into agreement,
 * so the Plan screen and the stunt card never show two different numbers for one exercise.
 *
 * Derived, never hand-maintained: move a slot into CONDITIONING_SLOTS and this follows.
 */
export const rdynRepsByExercise: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  const heavyIds = new Set(Object.values(HEAVY_SLOTS).flat().map((s) => s.id));
  for (const day of Object.values(plan.days)) {
    for (const slot of day) {
      // Heavy slots are a 3x5 strength dose, not an R-DYN progression: they must not
      // drag the tree's rep criteria down to 5.
      if (heavyIds.has(slot.id) || !isStrengthProgression(slot)) continue;
      for (const step of slot.chain) {
        for (const id of step.ex ? [step.ex] : (step.opts ?? []).map((o) => o.ex)) {
          out[id] = RDYN_TARGET;
        }
      }
    }
  }
  return out;
})();
