import { describe, expect, it } from "vitest";
import type { Slot, SlotState } from "./types";
import { resolveSlotState, stampAllSlotStates, stampSlotState, stepKeyOf } from "./slot-identity";

/** A three-rung chain, hardest-first — the ordinary slot shape. */
function chainSlot(): Slot {
  return {
    id: "legs-03",
    sets: 2,
    tiers: [10, 20, 25],
    sector: "posterior",
    chain: [
      { n: "Romanian Deadlift", ex: "hinge.rdl", band: 0, load: true },
      { n: "Weighted Good Morning", ex: "hinge.good_morning_weighted", band: 1, load: true },
      { n: "Bodyweight Good Morning", ex: "hinge.good_morning", band: 2 },
    ],
  };
}

/** The same slot after a new beginner rung is authored onto the easy end. */
function chainSlotWithNewRung(): Slot {
  const s = chainSlot();
  s.chain = [
    ...s.chain,
    { n: "Hip Hinge to Wall", ex: "hinge.wall_hinge", band: 2 },
  ];
  return s;
}

/** Single step + three tiers: stepIndex is a T-index, not a chain position. */
function inStepSlot(): Slot {
  return {
    id: "full-04",
    sets: 3,
    tiers: [5, 10, 15],
    sector: "core",
    chain: [{ n: "Hanging Leg Raise", ex: "core.hanging_leg_raise", band: 1 }],
  };
}

const base = (over: Partial<SlotState> = {}): SlotState => ({
  stepIndex: 0,
  confirmCount: 0,
  ...over,
});

describe("stepKeyOf", () => {
  it("uses the canonical exercise id", () => {
    expect(stepKeyOf({ n: "Romanian Deadlift", ex: "hinge.rdl", band: 0 })).toBe("hinge.rdl");
  });

  it("falls back to the display name when the step carries no ex of its own", () => {
    expect(stepKeyOf({ n: "Row or Pull-Up", band: 1, opts: [] })).toBe("n:Row or Pull-Up");
  });

  it("is undefined for a missing step", () => {
    expect(stepKeyOf(undefined)).toBeUndefined();
  });
});

describe("stampSlotState", () => {
  it("records the key of the step the index points at", () => {
    const st = stampSlotState(chainSlot(), base({ stepIndex: 2 }));
    expect(st.stepKey).toBe("hinge.good_morning");
  });

  it("records the chosen equipment option", () => {
    const slot = chainSlot();
    slot.chain[0] = {
      n: "Hinge",
      band: 0,
      opts: [
        { n: "Barbell RDL", ex: "hinge.rdl" },
        { n: "KB RDL", ex: "hinge.rdl_kb" },
      ],
    };
    const st = stampSlotState(slot, base({ stepIndex: 0, optIndex: 1 }));
    expect(st.optKey).toBe("hinge.rdl_kb");
  });

  it("never stamps in-step slots, whose stepIndex is a T-index", () => {
    const st = stampSlotState(inStepSlot(), base({ stepIndex: 2 }));
    expect(st.stepKey).toBeUndefined();
    expect(st.stepIndex).toBe(2);
  });
});

describe("resolveSlotState — the durability guarantee", () => {
  it("keeps the athlete on the SAME exercise after a new rung is authored", () => {
    // Athlete is working the easiest rung of the old chain (index 2).
    const stored = stampSlotState(chainSlot(), base({ stepIndex: 2, confirmCount: 1 }));
    expect(stored.stepIndex).toBe(2);

    // A new, easier rung is appended. Index 2 still exists but now names a
    // DIFFERENT exercise in a chain of 4 — this is the regression being guarded.
    const grown = chainSlotWithNewRung();
    const resolved = resolveSlotState(grown, stored)!;

    expect(grown.chain[resolved.stepIndex].ex).toBe("hinge.good_morning");
    expect(resolved.confirmCount).toBe(1);
  });

  it("survives a rung inserted in the MIDDLE of the chain", () => {
    const stored = stampSlotState(chainSlot(), base({ stepIndex: 2 }));
    const slot = chainSlot();
    slot.chain.splice(1, 0, { n: "Single-Leg RDL", ex: "hinge.sl_rdl", band: 1 });

    const resolved = resolveSlotState(slot, stored)!;
    expect(resolved.stepIndex).toBe(3);
    expect(slot.chain[resolved.stepIndex].ex).toBe("hinge.good_morning");
  });

  it("re-points the equipment option when opts are reordered", () => {
    const slot = chainSlot();
    slot.chain[0] = {
      n: "Hinge",
      band: 0,
      opts: [
        { n: "Barbell RDL", ex: "hinge.rdl" },
        { n: "KB RDL", ex: "hinge.rdl_kb" },
      ],
    };
    const stored = stampSlotState(slot, base({ stepIndex: 0, optIndex: 1 }));

    const reordered = chainSlot();
    reordered.chain[0] = {
      n: "Hinge",
      band: 0,
      opts: [
        { n: "KB RDL", ex: "hinge.rdl_kb" },
        { n: "Barbell RDL", ex: "hinge.rdl" },
      ],
    };
    expect(resolveSlotState(reordered, stored)!.optIndex).toBe(0);
  });

  it("falls back to the stored index when the step is genuinely gone", () => {
    const stored = stampSlotState(chainSlot(), base({ stepIndex: 1 }));
    const slot = chainSlot();
    slot.chain[1] = { n: "Something Else", ex: "hinge.replacement", band: 1 };
    expect(resolveSlotState(slot, stored)!.stepIndex).toBe(1);
  });

  it("clamps an out-of-range index from a shortened chain", () => {
    const stored = base({ stepIndex: 9 });
    expect(resolveSlotState(chainSlot(), stored)!.stepIndex).toBe(2);
  });

  it("leaves in-step slots alone — the T-index is not a position", () => {
    const stored = base({ stepIndex: 2 });
    expect(resolveSlotState(inStepSlot(), stored)).toBe(stored);
  });

  it("returns the input unchanged when nothing moved (referential stability)", () => {
    const stored = stampSlotState(chainSlot(), base({ stepIndex: 1 }));
    expect(resolveSlotState(chainSlot(), stored)).toBe(stored);
  });

  it("is a no-op on undefined", () => {
    expect(resolveSlotState(chainSlot(), undefined)).toBeUndefined();
  });
});

describe("stampAllSlotStates", () => {
  it("stamps known slots and passes unknown slot ids through untouched", () => {
    const orphan = base({ stepIndex: 1 });
    const out = stampAllSlotStates(
      { "legs-03": chainSlot() },
      { "legs-03": base({ stepIndex: 0 }), "retired-99": orphan },
    );
    expect(out["legs-03"].stepKey).toBe("hinge.rdl");
    expect(out["retired-99"]).toBe(orphan);
  });
});
