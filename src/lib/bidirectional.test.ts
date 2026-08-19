// Two guarantees the athlete asked for:
//   1. a workout is SIX exercises,
//   2. completion is bi-directional — finishing an exercise in a workout or on the stunt
//      tracker completes it in both places.
//
// Direction A (workout -> tree) is bestByExercise and is covered by credit.test.ts.
// Direction B (tree -> workout) is effectiveStepIndex, tested here.

import { describe, expect, it } from "vitest";
import { effectiveStepIndex, skillFrontierIndex } from "./selectors";
import { CORE_SLOTS, CORE_SLOT_COUNT, coreSlots, isCoreSlot, plan } from "../data/prescription";
import { seedPlan } from "../data/seed-plan";
import type { SkillProgress, Slot } from "./types";

const achieved = (...ids: string[]): Record<string, SkillProgress> =>
  Object.fromEntries(ids.map((id) => [id, { status: "achieved" as const }]));

/** Hardest-first chain: index 0 hardest, index 2 easiest. */
const chainSlot = (): Slot => ({
  id: "legs-03",
  sets: 3,
  tiers: [8],
  sector: "posterior",
  chain: [
    { n: "Romanian Deadlift", ex: "hinge.rdl", band: 0 },
    { n: "Weighted Good Morning", ex: "hinge.good_morning_weighted", band: 1 },
    { n: "Bodyweight Good Morning", ex: "hinge.good_morning", band: 2 },
  ],
});

const inStepSlot = (): Slot => ({
  id: "full-04",
  sets: 3,
  tiers: [5, 10, 15],
  sector: "core",
  chain: [{ n: "Hanging Leg Raise", ex: "core.hanging_leg_raise", band: 1 }],
});

describe("a workout is six exercises", () => {
  it("prescribes exactly 6 non-alternative slots on every training day", () => {
    for (const dayId of Object.keys(plan.days)) {
      const core = coreSlots(dayId).filter((s) => !s.alternativeTo);
      expect(core.length, dayId).toBe(CORE_SLOT_COUNT);
    }
  });

  // `optional` is no longer baked into the slot: which six are prescribed depends on
  // the athlete's regime, so it is computed at render time by isCoreSlot(). What must
  // still hold is that nothing from the PDF is ever DROPPED.
  it("keeps every PDF slot in the plan — never deletes one", () => {
    for (const [dayId, slots] of Object.entries(plan.days)) {
      const seed = (seedPlan.days as Record<string, Slot[]>)[dayId];
      const ids = slots.map((s) => s.id);
      for (const s of seed) expect(ids, `${dayId}/${s.id}`).toContain(s.id);
    }
  });

  it("marks exactly the non-core slots optional, per regime", () => {
    for (const regime of ["calisthenic", "balanced", "powerlifting"] as const) {
      for (const [dayId, slots] of Object.entries(plan.days)) {
        const core = new Set(coreSlots(dayId, regime).map((s) => s.id));
        for (const s of slots) {
          expect(isCoreSlot(dayId, s, regime), `${regime}/${dayId}/${s.id}`).toBe(core.has(s.id));
        }
      }
    }
  });

  it("treats an alternative to a core slot as core, so it replaces rather than adds", () => {
    const legs = (plan.days as Record<string, Slot[]>).legs;
    const alt = legs.find((s) => s.id === "legs-04-alt")!;
    expect(alt.alternativeTo).toBe("legs-04");
    expect(isCoreSlot("legs", alt, "calisthenic")).toBe(true);
  });

  it("names only real slot ids in CORE_SLOTS", () => {
    const all = new Set(Object.values(plan.days).flat().map((s) => s.id));
    for (const [dayId, ids] of Object.entries(CORE_SLOTS)) {
      for (const id of ids) expect(all.has(id), `${dayId}/${id}`).toBe(true);
    }
  });
});

describe("skillFrontierIndex — tree completion feeds back into the chain", () => {
  it("starts at the easiest step when nothing is achieved", () => {
    expect(skillFrontierIndex(chainSlot(), {})).toBe(2);
  });

  it("skips a step whose skill is already achieved", () => {
    expect(skillFrontierIndex(chainSlot(), achieved("hinge.good_morning"))).toBe(1);
  });

  it("skips a run of achieved steps", () => {
    const st = achieved("hinge.good_morning", "hinge.good_morning_weighted");
    expect(skillFrontierIndex(chainSlot(), st)).toBe(0);
  });

  it("never walks past the hardest step, even when the whole chain is achieved", () => {
    const st = achieved("hinge.good_morning", "hinge.good_morning_weighted", "hinge.rdl");
    expect(skillFrontierIndex(chainSlot(), st)).toBe(0);
  });

  it("does not skip on a gap — an unachieved easy step still blocks", () => {
    // middle achieved but easiest not: you still start at the easiest.
    expect(skillFrontierIndex(chainSlot(), achieved("hinge.good_morning_weighted"))).toBe(2);
  });

  it("requires EVERY option of a step to be achieved before skipping it", () => {
    const slot = chainSlot();
    slot.chain[2] = {
      n: "Good Morning",
      band: 2,
      opts: [
        { n: "Barbell", ex: "hinge.good_morning" },
        { n: "Band", ex: "hinge.good_morning_band" },
      ],
    };
    expect(skillFrontierIndex(slot, achieved("hinge.good_morning"))).toBe(2);
    expect(
      skillFrontierIndex(slot, achieved("hinge.good_morning", "hinge.good_morning_band")),
    ).toBe(1);
  });

  it("is undefined for in-step slots, where stepIndex is a T-index", () => {
    expect(skillFrontierIndex(inStepSlot(), achieved("core.hanging_leg_raise"))).toBeUndefined();
  });
});

describe("effectiveStepIndex — the two directions combined", () => {
  it("uses the stored progression when it is already harder than the tree says", () => {
    // stored 0 (hardest) beats a frontier of 2
    expect(effectiveStepIndex(chainSlot(), 0, {})).toBe(0);
  });

  it("overrides a stored easy position when the tree says it is already done", () => {
    const st = achieved("hinge.good_morning", "hinge.good_morning_weighted");
    expect(effectiveStepIndex(chainSlot(), 2, st)).toBe(0);
  });

  it("falls back to the easiest step with no stored state and nothing achieved", () => {
    expect(effectiveStepIndex(chainSlot(), undefined, {})).toBe(2);
  });

  it("never regresses the athlete to something they have proven", () => {
    const st = achieved("hinge.good_morning");
    for (const stored of [undefined, 0, 1, 2]) {
      expect(effectiveStepIndex(chainSlot(), stored, st)).toBeLessThanOrEqual(1);
    }
  });

  it("leaves in-step slots on their stored T-index", () => {
    expect(effectiveStepIndex(inStepSlot(), 2, achieved("core.hanging_leg_raise"))).toBe(2);
  });
});
