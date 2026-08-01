// Tests for the progression engine — docs/research/06-addendum-2.md §1-§2 (band model + R-rules)
// over docs/research/03-programming-science.md §1.4/§8/§15.
import { describe, expect, it } from "vitest";
import type {
  EntryLog,
  PlanConfig,
  RepBand,
  SessionLog,
  Slot,
  SlotState,
} from "./types";
import {
  DELOAD_PRESCRIPTION,
  applySession,
  band,
  deloadCheck,
  ghost,
  isInStepSlot,
  restSuggestion,
  targetFor,
  workTarget,
} from "./progression";

// Config values transcribed from addendum-2 §3 seed config.
const config: PlanConfig = {
  confirmSessions: 2,
  landingFailPctOfTarget: 60,
  chainCooldownDays: 14,
  saStepRateLimitDays: 21,
  quasiIsoMaxPerSession: 3,
  restSecByBand: [150, 120, 90],
  restSecIso: 60,
  restSecTimed: 60,
  loadIncKg: { lower: 2.5, upper: 1.25 },
  weekOrder: ["legs", "pull", "mobility", "push", "fullbody"],
};

function chainSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: "test-01",
    sets: 2,
    tiers: [20, 50, 100],
    sector: "squat",
    chain: [
      { n: "Hardest", ex: "squat.hardest", band: 0 },
      { n: "Middle", ex: "squat.middle", band: 1 },
      { n: "Easiest", ex: "squat.easiest", band: 2 },
    ],
    ...overrides,
  };
}

/** full-04 shape: single step, three tiers -> in-step ladder (addendum-2 §1.2 interpretation A). */
function singleStepSlot(): Slot {
  return {
    id: "full-04",
    sets: 2,
    tiers: [10, 25, 50],
    sector: "balance",
    chain: [{ n: "Halo", ex: "power.halo", band: 1, load: true }],
  };
}

function st(overrides: Partial<SlotState> = {}): SlotState {
  return { stepIndex: 1, confirmCount: 0, ...overrides };
}

function entryFor(slot: Slot, state: SlotState, values: number[], weights?: number[]): EntryLog {
  return {
    slotId: slot.id,
    stepIndex: state.stepIndex,
    exerciseId: "test.exercise",
    repBand: 1,
    sets: values.map((v, i) => ({ value: v, weightKg: weights?.[i] })),
  };
}

// ---------------------------------------------------------------------------

describe("band", () => {
  it("produces the exact band arrays from addendum-2 §1.2", () => {
    const arrays = (n: number) => Array.from({ length: n }, (_, i) => band(i, n));
    expect(arrays(1)).toEqual([1]);
    expect(arrays(2)).toEqual([0, 2]);
    expect(arrays(3)).toEqual([0, 1, 2]);
    expect(arrays(4)).toEqual([0, 1, 1, 2]);
    expect(arrays(5)).toEqual([0, 1, 1, 2, 2]);
    expect(arrays(6)).toEqual([0, 0, 1, 1, 2, 2]);
    expect(arrays(7)).toEqual([0, 0, 1, 1, 1, 2, 2]);
  });

  it("uses half-up rounding (Math.round is half-up for positives)", () => {
    // Assert the runtime semantics the formula depends on: no banker's rounding.
    expect(Math.round(0.5)).toBe(1);
    expect(Math.round(1.5)).toBe(2);
    expect(Math.round(2.5)).toBe(3);
    // N=5 exercises both half cases: i=1 -> 2/4 = 0.5 -> 1; i=3 -> 6/4 = 1.5 -> 2.
    expect(band(1, 5)).toBe(1);
    expect(band(3, 5)).toBe(2);
  });
});

describe("workTarget", () => {
  it("maps stepIndex -> band -> tiers", () => {
    const slot = chainSlot();
    expect(workTarget(slot, 0)).toBe(20);
    expect(workTarget(slot, 1)).toBe(50);
    expect(workTarget(slot, 2)).toBe(100);
  });

  it("single-tier slots always use tiers[0]", () => {
    const slot = chainSlot({ tiers: [50] });
    expect(workTarget(slot, 0)).toBe(50);
    expect(workTarget(slot, 2)).toBe(50);
  });

  it("clamps out-of-range stepIndex", () => {
    const slot = chainSlot();
    expect(workTarget(slot, -1)).toBe(20);
    expect(workTarget(slot, 99)).toBe(100);
  });
});

describe("targetFor", () => {
  it("band mode for multi-step chains", () => {
    const slot = chainSlot();
    expect(isInStepSlot(slot)).toBe(false);
    expect(targetFor(slot, st({ stepIndex: 0 }))).toEqual({ target: 20, repBand: 0, mode: "band" });
    expect(targetFor(slot, st({ stepIndex: 2 }))).toEqual({ target: 100, repBand: 2, mode: "band" });
  });

  it("in-step ladder for single-step 3-tier slots, reusing stepIndex as the T-index", () => {
    const slot = singleStepSlot();
    expect(isInStepSlot(slot)).toBe(true);
    expect(targetFor(slot, st({ stepIndex: 0 }))).toEqual({ target: 10, repBand: 0, mode: "in-step" });
    expect(targetFor(slot, st({ stepIndex: 1 }))).toEqual({ target: 25, repBand: 1, mode: "in-step" });
    expect(targetFor(slot, st({ stepIndex: 2 }))).toEqual({ target: 50, repBand: 2, mode: "in-step" });
  });
});

// ---------------------------------------------------------------------------

describe("applySession R-STEP", () => {
  it("advances exactly after confirmSessions=2 CONSECUTIVE target sessions", () => {
    const slot = chainSlot();
    const state = st({ stepIndex: 1 }); // target 50
    const s1 = applySession(slot, state, entryFor(slot, state, [50, 55]), config, "2026-01-05");
    expect(s1.state.stepIndex).toBe(1);
    expect(s1.state.confirmCount).toBe(1);
    expect(s1.events.find((e) => e.type === "advanced")).toBeUndefined();

    const s2 = applySession(slot, s1.state, entryFor(slot, s1.state, [50, 50]), config, "2026-01-12");
    expect(s2.state.stepIndex).toBe(0);
    expect(s2.state.confirmCount).toBe(0);
    expect(s2.state.lastAdvanceDate).toBe("2026-01-12");
    expect(s2.events).toContainEqual({ type: "advanced", slotId: slot.id, from: 1, to: 0, mode: "band" });
  });

  it("does NOT advance on 2 cumulative but non-consecutive target sessions", () => {
    const slot = chainSlot();
    const a = applySession(slot, st(), entryFor(slot, st(), [50, 50]), config, "2026-01-05");
    expect(a.state.confirmCount).toBe(1);
    // a miss in the middle resets the consecutive-confirm counter
    const b = applySession(slot, a.state, entryFor(slot, a.state, [45, 50]), config, "2026-01-12");
    expect(b.state.confirmCount).toBe(0);
    const c = applySession(slot, b.state, entryFor(slot, b.state, [50, 50]), config, "2026-01-19");
    expect(c.state.stepIndex).toBe(1); // still not advanced
    expect(c.state.confirmCount).toBe(1);
  });

  it("does not advance past the hardest step (stepIndex 0) and resets confirms", () => {
    const slot = chainSlot();
    const state = st({ stepIndex: 0, confirmCount: 1 }); // target 20
    const r = applySession(slot, state, entryFor(slot, state, [20, 20]), config, "2026-01-05");
    expect(r.state.stepIndex).toBe(0);
    expect(r.state.confirmCount).toBe(0);
    expect(r.events.find((e) => e.type === "advanced")).toBeUndefined();
  });
});

describe("applySession R-REP", () => {
  it("suggests +1 rep on the lowest set when below target", () => {
    const slot = chainSlot();
    const r = applySession(slot, st(), entryFor(slot, st(), [42, 50]), config, "2026-01-05");
    expect(r.events).toContainEqual({ type: "rep-suggest", slotId: slot.id, suggestedReps: 43, target: 50 });
    expect(r.state.confirmCount).toBe(0);
    expect(r.state.stepIndex).toBe(1);
  });
});

describe("applySession sa rate limiter", () => {
  function saSlot(): Slot {
    return chainSlot({
      id: "pull-04",
      sector: "pull_levers",
      tiers: [10, 20, 30],
      chain: [
        { n: "Front Lever Flutter", ex: "front_lever.fl_flutter", band: 0, sa: true },
        { n: "Tuck Front Lever Kick", ex: "front_lever.tuck_fl_kick", band: 1, sa: true },
        { n: "Bodyweight Scapula Row", ex: "pull.scap_row", band: 1 },
        { n: "Band Scapula Row", ex: "pull.scap_row_band", band: 2 },
      ],
    });
  }

  it("blocks an sa advance at day 20 and allows it at day 21 (saStepRateLimitDays=21)", () => {
    const slot = saSlot();
    // stepIndex 1 (sa step), last advance 2026-03-01, one confirm already banked
    const state = st({ stepIndex: 1, confirmCount: 1, lastAdvanceDate: "2026-03-01" });

    // 2026-03-21 = 20 days since last advance -> blocked
    const blocked = applySession(slot, state, entryFor(slot, state, [20, 20]), config, "2026-03-21");
    expect(blocked.state.stepIndex).toBe(1);
    expect(blocked.state.confirmCount).toBe(2); // confirms retained, not consumed
    expect(blocked.events).toContainEqual({ type: "sa-blocked", slotId: slot.id, daysUntilAllowed: 1 });

    // 2026-03-22 = 21 days since last advance -> allowed
    const allowed = applySession(slot, blocked.state, entryFor(slot, blocked.state, [20, 20]), config, "2026-03-22");
    expect(allowed.state.stepIndex).toBe(0);
    expect(allowed.state.lastAdvanceDate).toBe("2026-03-22");
    expect(allowed.events).toContainEqual({ type: "advanced", slotId: slot.id, from: 1, to: 0, mode: "band" });
  });

  it("does not rate-limit non-sa steps", () => {
    const slot = chainSlot(); // no sa flags
    const state = st({ stepIndex: 1, confirmCount: 1, lastAdvanceDate: "2026-03-20" });
    const r = applySession(slot, state, entryFor(slot, state, [50, 50]), config, "2026-03-21");
    expect(r.state.stepIndex).toBe(0);
  });
});

describe("applySession R-LAND", () => {
  it("reverts + sets 14-day cooldown at 59% of target on half the sets", () => {
    const slot = chainSlot({ tiers: [50, 100, 150] });
    const state = st({ stepIndex: 1 }); // target 100, fail cutoff 60
    const r = applySession(slot, state, entryFor(slot, state, [59, 100]), config, "2026-02-01");
    expect(r.state.stepIndex).toBe(2);
    expect(r.state.cooldownUntil).toBe("2026-02-15");
    expect(r.state.confirmCount).toBe(0);
    expect(r.events).toContainEqual({
      type: "reverted",
      slotId: slot.id,
      from: 1,
      to: 2,
      cooldownUntil: "2026-02-15",
    });
  });

  it("does not revert at 61% of target", () => {
    const slot = chainSlot({ tiers: [50, 100, 150] });
    const state = st({ stepIndex: 1 });
    const r = applySession(slot, state, entryFor(slot, state, [61, 100]), config, "2026-02-01");
    expect(r.state.stepIndex).toBe(1);
    expect(r.state.cooldownUntil).toBeUndefined();
    expect(r.events.find((e) => e.type === "reverted")).toBeUndefined();
  });

  it("cooldown blocks R-STEP until expiry", () => {
    const slot = chainSlot();
    // reverted earlier -> cooldown until 2026-02-15; now sitting at the easier step (target 100)
    const state: SlotState = { stepIndex: 2, confirmCount: 0, cooldownUntil: "2026-02-15" };
    const a = applySession(slot, state, entryFor(slot, state, [100, 100]), config, "2026-02-05");
    expect(a.state.confirmCount).toBe(1);
    const b = applySession(slot, a.state, entryFor(slot, a.state, [100, 100]), config, "2026-02-10");
    expect(b.state.stepIndex).toBe(2); // 2 confirms banked but advance blocked
    expect(b.events).toContainEqual({ type: "cooldown-blocked", slotId: slot.id, cooldownUntil: "2026-02-15" });
    // at expiry (date >= cooldownUntil) the banked confirms release the advance
    const c = applySession(slot, b.state, entryFor(slot, b.state, [100, 100]), config, "2026-02-15");
    expect(c.state.stepIndex).toBe(1);
    expect(c.events).toContainEqual({ type: "advanced", slotId: slot.id, from: 2, to: 1, mode: "band" });
  });
});

describe("applySession R-LOAD", () => {
  it("suggests +2.5 kg for lower-body (squat/posterior) loaded steps at band target", () => {
    const slot = chainSlot({
      id: "legs-02",
      sector: "squat",
      tiers: [15, 20, 35],
      chain: [
        { n: "Weighted Pistol Squat", ex: "pistol_squat.weighted_pistol", band: 0, load: true, uni: true },
        { n: "Pistol Squat", ex: "pistol_squat.pistol", band: 1, uni: true },
        { n: "Lunge Walk", ex: "squat.lunge_walk", band: 2, alt: true },
      ],
    });
    const state = st({ stepIndex: 0, workingWeightKg: 10 }); // target 15
    const r = applySession(slot, state, entryFor(slot, state, [15, 16]), config, "2026-01-05");
    expect(r.events).toContainEqual({ type: "load-suggest", slotId: slot.id, incKg: 2.5, suggestedKg: 12.5 });
  });

  it("suggests +1.25 kg for upper-body sectors, falling back to logged set weight", () => {
    const slot = chainSlot({
      id: "pull-07",
      sector: "pull_levers",
      tiers: [20, 30, 50],
      chain: [
        { n: "Curl", ex: "pull.curl", band: 0, load: true },
        { n: "Hammer Curl", ex: "pull.hammer_curl", band: 1, load: true },
        { n: "Cheat Curl", ex: "pull.cheat_curl", band: 2, load: true },
      ],
    });
    const state = st({ stepIndex: 0 }); // no workingWeightKg -> base from set weights
    const r = applySession(slot, state, entryFor(slot, state, [20, 20], [8, 8]), config, "2026-01-05");
    expect(r.events).toContainEqual({ type: "load-suggest", slotId: slot.id, incKg: 1.25, suggestedKg: 9.25 });
  });

  it("emits no load suggestion for unloaded steps", () => {
    const slot = chainSlot();
    const r = applySession(slot, st(), entryFor(slot, st(), [50, 50]), config, "2026-01-05");
    expect(r.events.find((e) => e.type === "load-suggest")).toBeUndefined();
  });
});

describe("applySession in-step ladder (single-step 3-tier slots)", () => {
  it("advances T0 -> T1 after 2 confirms, with the same confirm rules", () => {
    const slot = singleStepSlot();
    const state = st({ stepIndex: 0 }); // T0, target 10
    const a = applySession(slot, state, entryFor(slot, state, [10, 12]), config, "2026-01-05");
    expect(a.state.stepIndex).toBe(0);
    expect(a.state.confirmCount).toBe(1);
    const b = applySession(slot, a.state, entryFor(slot, a.state, [11, 10]), config, "2026-01-12");
    expect(b.state.stepIndex).toBe(1); // T-index INCREMENTS in in-step mode
    expect(b.events).toContainEqual({ type: "advanced", slotId: slot.id, from: 0, to: 1, mode: "in-step" });
    expect(targetFor(slot, b.state).target).toBe(25);
  });

  it("stops at T2 (no advance past the exit tier)", () => {
    const slot = singleStepSlot();
    const state = st({ stepIndex: 2, confirmCount: 1 }); // T2, target 50
    const r = applySession(slot, state, entryFor(slot, state, [50, 50]), config, "2026-01-05");
    expect(r.state.stepIndex).toBe(2);
    expect(r.events.find((e) => e.type === "advanced")).toBeUndefined();
  });

  it("in-step R-LAND reverts toward T0 (T-index decrements)", () => {
    const slot = singleStepSlot();
    const state = st({ stepIndex: 1 }); // T1, target 25, fail cutoff 15
    const r = applySession(slot, state, entryFor(slot, state, [14, 25]), config, "2026-02-01");
    expect(r.state.stepIndex).toBe(0);
    expect(r.state.cooldownUntil).toBe("2026-02-15");
  });
});

// ---------------------------------------------------------------------------

describe("ghost", () => {
  it("returns nulls for the first session", () => {
    expect(ghost(undefined, 2)).toEqual([
      { value: null, weightKg: null, rir: null },
      { value: null, weightKg: null, rir: null },
    ]);
  });

  it("returns previous per-set values with nulls for missing fields", () => {
    const entry: EntryLog = {
      slotId: "legs-02",
      stepIndex: 1,
      exerciseId: "pistol_squat.pistol",
      repBand: 1,
      sets: [{ value: 20, weightKg: 10, rir: 2 }, { value: 18 }],
    };
    expect(ghost(entry)).toEqual([
      { value: 20, weightKg: 10, rir: 2 },
      { value: 18, weightKg: null, rir: null },
    ]);
  });
});

describe("restSuggestion", () => {
  it("chain slots rest by repBand per addendum-2 §2 (150/120/90 s)", () => {
    const slot = chainSlot();
    expect(restSuggestion(slot, 0, config)).toBe(150);
    expect(restSuggestion(slot, 1, config)).toBe(120);
    expect(restSuggestion(slot, 2, config)).toBe(90);
  });

  it("hold/iso/rounds slots use fixed rests", () => {
    expect(restSuggestion(chainSlot({ type: "quasi_iso" }), 0, config)).toBe(60);
    expect(restSuggestion(chainSlot({ type: "timed_hold" }), 1, config)).toBe(60);
    expect(restSuggestion(chainSlot({ type: "iso_overcoming" }), 1, config)).toBe(60);
    expect(restSuggestion(chainSlot({ type: "rounds", restSec: 30 }), 1, config)).toBe(30);
  });
});

// ---------------------------------------------------------------------------

function session(
  date: string,
  entries: { slotId: string; stepIndex: number }[],
  notes?: string,
): SessionLog {
  return {
    id: `s-${date}`,
    athleteId: "a1",
    date,
    dayId: "legs",
    entries: entries.map((e) => ({
      slotId: e.slotId,
      stepIndex: e.stepIndex,
      exerciseId: "test.exercise",
      repBand: 1 as RepBand,
      sets: [{ value: 10 }],
    })),
    notes,
  };
}

describe("deloadCheck", () => {
  it("not due for a fresh log", () => {
    const r = deloadCheck([session("2026-07-20", [{ slotId: "legs-01", stepIndex: 1 }])], "2026-08-01");
    expect(r).toEqual({ due: false, reasons: [] });
  });

  it("due after >= 6 training weeks with no deload marker", () => {
    const r = deloadCheck(
      [
        session("2026-06-01", [{ slotId: "legs-01", stepIndex: 1 }]),
        session("2026-07-30", [{ slotId: "legs-01", stepIndex: 1 }]),
      ],
      "2026-08-01",
    );
    expect(r.due).toBe(true);
    expect(r.reasons.some((x) => x.includes("deload"))).toBe(true);
  });

  it("a deload-marked session resets the 6-week clock", () => {
    const r = deloadCheck(
      [
        session("2026-05-01", [{ slotId: "legs-01", stepIndex: 1 }]),
        session("2026-07-20", [{ slotId: "legs-01", stepIndex: 1 }], "deload week"),
      ],
      "2026-08-01",
    );
    expect(r.due).toBe(false);
  });

  it("due when 2+ slots reverted (stepIndex increased) within 14 days", () => {
    const r = deloadCheck(
      [
        session("2026-07-10", [
          { slotId: "legs-02", stepIndex: 1 },
          { slotId: "push-01", stepIndex: 1 },
        ]),
        session("2026-07-25", [
          { slotId: "legs-02", stepIndex: 2 },
          { slotId: "push-01", stepIndex: 2 },
        ]),
      ],
      "2026-08-01",
    );
    expect(r.due).toBe(true);
    expect(r.reasons.some((x) => x.includes("reverted"))).toBe(true);
  });

  it("a single reverted slot does not trigger the regression reason", () => {
    const r = deloadCheck(
      [
        session("2026-07-10", [{ slotId: "legs-02", stepIndex: 1 }]),
        session("2026-07-25", [{ slotId: "legs-02", stepIndex: 2 }]),
      ],
      "2026-08-01",
    );
    expect(r.due).toBe(false);
  });

  it("user-flagged fatigue placeholder triggers", () => {
    const r = deloadCheck(
      [session("2026-07-30", [{ slotId: "legs-01", stepIndex: 1 }])],
      "2026-08-01",
      true,
    );
    expect(r.due).toBe(true);
    expect(r.reasons.some((x) => x.includes("fatigue"))).toBe(true);
  });

  it("prescription constant matches doc 03 / PLAN.md rule 7 (50% sets at 90% load)", () => {
    expect(DELOAD_PRESCRIPTION.setMult).toBe(0.5);
    expect(DELOAD_PRESCRIPTION.loadMult).toBe(0.9);
    expect(DELOAD_PRESCRIPTION.chainAdvancement).toBe(false);
  });
});
