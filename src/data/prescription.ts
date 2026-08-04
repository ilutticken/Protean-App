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
import type { SeedPlan, Slot } from "../lib/types";

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

function isCore(dayId: string, slot: Slot): boolean {
  const core = CORE_SLOTS[dayId] ?? [];
  return core.includes(slot.alternativeTo ?? slot.id);
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
 * The plan the app trains. Same structure and the same slots as the PDF; strength chains
 * re-prescribed to R-DYN, and everything outside the day's core six flagged `optional`.
 */
export const plan: SeedPlan = {
  ...seedPlan,
  days: Object.fromEntries(
    Object.entries(seedPlan.days).map(([dayId, slots]) => [
      dayId,
      slots.map((s) => {
        const out = toRdyn(s);
        return isCore(dayId, s) ? out : { ...out, optional: true };
      }),
    ]),
  ) as SeedPlan["days"],
};

/** The day's six — what the Workout screen actually prescribes. */
export function coreSlots(dayId: string): Slot[] {
  const day = (plan.days as Record<string, Slot[]>)[dayId] ?? [];
  return day.filter((s) => !s.optional);
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
  for (const day of Object.values(plan.days)) {
    for (const slot of day) {
      if (!isStrengthProgression(slot)) continue;
      for (const step of slot.chain) {
        for (const id of step.ex ? [step.ex] : (step.opts ?? []).map((o) => o.ex)) {
          out[id] = RDYN_TARGET;
        }
      }
    }
  }
  return out;
})();
