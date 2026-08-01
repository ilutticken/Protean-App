// Structural tests for the seed plan transcription (docs/research/06-addendum-2.md §3)
// and the exercise catalog. Counts, band formula, sa flags, and canonical constants are all
// asserted against the addendum-2/addendum-3 source docs.

import { describe, expect, it } from "vitest";
import type { Slot } from "../lib/types";
import { authorQuestions, seedPlan } from "./seed-plan";
import { exercises, standardsKeyByExercise } from "./exercises";

const allSlots: Slot[] = [
  ...seedPlan.days.legs,
  ...seedPlan.days.pull,
  ...seedPlan.days.push,
  ...seedPlan.days.fullbody,
];

/** Band default from addendum-2 §1.2: band(i,N) = N==1 ? 1 : roundHalfUp(2i/(N-1)). */
const band = (i: number, n: number): number => (n === 1 ? 1 : Math.round((2 * i) / (n - 1)));

/** Every exercise id referenced anywhere in the seed (chain steps, opts, warmup, mobility). */
const referencedExerciseIds = (): Set<string> => {
  const ids = new Set<string>();
  for (const slot of allSlots) {
    for (const step of slot.chain) {
      if (step.ex) ids.add(step.ex);
      for (const opt of step.opts ?? []) ids.add(opt.ex);
    }
  }
  for (const item of seedPlan.warmup) if (item.ex) ids.add(item.ex);
  for (const item of seedPlan.mobility) if (item.ex) ids.add(item.ex);
  return ids;
};

describe("seedPlan structure (addendum-2 §3)", () => {
  it("has 42 slots split 13 legs (incl alt) / 9 pull / 9 push / 11 fullbody", () => {
    expect(seedPlan.days.legs).toHaveLength(13);
    expect(seedPlan.days.pull).toHaveLength(9);
    expect(seedPlan.days.push).toHaveLength(9);
    expect(seedPlan.days.fullbody).toHaveLength(11);
    expect(allSlots).toHaveLength(42);
  });

  it("has unique slot ids", () => {
    expect(new Set(allSlots.map((s) => s.id)).size).toBe(42);
  });

  it("has 12 warmup items (wu-13 lives in `iso`, not warmup[]) and 11 mobility items", () => {
    expect(seedPlan.warmup).toHaveLength(12);
    expect(seedPlan.warmup.map((w) => w.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `wu-${String(i + 1).padStart(2, "0")}`),
    );
    expect(seedPlan.mobility).toHaveLength(11);
  });

  it("carries the iso_overcoming spec from wu-13 (addendum-2 §5)", () => {
    expect(seedPlan.iso.sets).toBe(4);
    expect(seedPlan.iso.holdSec).toBe(7);
    expect(seedPlan.iso.angles).toBe(3);
    expect(seedPlan.iso.patternByDay).toEqual({
      legs: "squat",
      pull: "pullup",
      push: "dip_press",
      fullbody: "hinge",
      mobility: null,
    });
    expect(seedPlan.iso.anglePresetsDeg["squat"]).toEqual({ joint: "knee", angles: [90, 115, 140] });
    expect(seedPlan.iso.anglePresetsDeg["pullup"]).toEqual({ joint: "elbow", angles: [150, 110, 70] });
    expect(seedPlan.iso.anglePresetsDeg["dip_press"]).toEqual({ joint: "elbow", angles: [90, 120, 150] });
    expect(seedPlan.iso.anglePresetsDeg["hinge"]).toEqual({ joint: "hip", angles: [45, 90, 135] });
  });

  it("transcribes config exactly (addendum-2 §3 config)", () => {
    expect(seedPlan.config).toEqual({
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
    });
  });

  it("has 140 chain steps in total (addendum-2 §3 totals: ~140 chain-step entries)", () => {
    const steps = allSlots.reduce((acc, s) => acc + s.chain.length, 0);
    expect(steps).toBe(140);
  });
});

describe("band materialization (addendum-2 §1.2)", () => {
  it("matches band(i,N) everywhere; the derived hand-override exception list is empty", () => {
    // Derived by comparing every materialized band in §3 against the §1.2 formula: the seed
    // contains NO hand-overridden bands — the same-band runs (e.g. push-01/push-03 [0,0,1,1,1,2,2])
    // are exactly what the formula yields for their chain lengths.
    const documentedExceptions: string[] = [];
    const mismatches: string[] = [];
    for (const slot of allSlots) {
      const n = slot.chain.length;
      slot.chain.forEach((step, i) => {
        if (step.band !== band(i, n)) {
          mismatches.push(`${slot.id}[${i}] band=${step.band} formula=${band(i, n)}`);
        }
      });
    }
    expect(mismatches).toEqual(documentedExceptions);
  });

  it("reproduces the §1.2 band arrays for each chain length", () => {
    const arr = (n: number) => Array.from({ length: n }, (_, i) => band(i, n));
    expect(arr(1)).toEqual([1]);
    expect(arr(2)).toEqual([0, 2]);
    expect(arr(3)).toEqual([0, 1, 2]);
    expect(arr(4)).toEqual([0, 1, 1, 2]);
    expect(arr(5)).toEqual([0, 1, 1, 2, 2]);
    expect(arr(6)).toEqual([0, 0, 1, 1, 2, 2]);
    expect(arr(7)).toEqual([0, 0, 1, 1, 1, 2, 2]);
  });
});

describe("tiers (addendum-2 §1.2/§2)", () => {
  it("every slot's tiers array has length 3 or 1", () => {
    for (const slot of allSlots) {
      expect([1, 3], `${slot.id} tiers length`).toContain(slot.tiers.length);
    }
  });

  it("single-number tiers appear exactly where documented", () => {
    // legs-04-alt ("2 x 50") and push-03 ("2 x 20") per the PDF; the four hold slots and the
    // rounds slot carry [60] only because Slot.tiers is required (60 s hold/work target).
    const singles = allSlots.filter((s) => s.tiers.length === 1).map((s) => s.id).sort();
    expect(singles).toEqual(
      ["legs-04-alt", "legs-12", "pull-08", "pull-09", "push-03", "push-09", "full-11"].sort(),
    );
  });

  it("spot-checks tier transcription against the PDF numbers", () => {
    const byId = new Map(allSlots.map((s) => [s.id, s]));
    expect(byId.get("legs-02")?.tiers).toEqual([15, 20, 35]);
    expect(byId.get("legs-05")?.tiers).toEqual([25, 50, 100]);
    expect(byId.get("legs-04-alt")?.tiers).toEqual([50]);
    expect(byId.get("push-03")?.tiers).toEqual([20]);
    expect(byId.get("pull-02")?.tiers).toEqual([20, 50, 75]);
    expect(byId.get("full-09")?.tiers).toEqual([50, 150, 200]);
  });
});

describe("slot flags and special slot types (addendum-2 §2-3)", () => {
  it("marks units and perSide exactly where the source does", () => {
    const withUnit = allSlots
      .filter((s) => s.unit !== undefined)
      .map((s) => `${s.id}:${s.unit}`)
      .sort();
    expect(withUnit).toEqual(["full-09:steps", "full-10:skips", "legs-11:steps", "push-08:steps"]);
    const perSide = allSlots.filter((s) => s.perSide).map((s) => s.id).sort();
    expect(perSide).toEqual(["full-09", "full-10"]);
  });

  it("marks slot types exactly where the source does", () => {
    const typed = allSlots
      .filter((s) => s.type !== undefined)
      .map((s) => `${s.id}:${s.type}`)
      .sort();
    expect(typed).toEqual([
      "full-11:rounds",
      "legs-12:quasi_iso",
      "pull-08:timed_hold",
      "pull-09:quasi_iso",
      "push-09:quasi_iso",
    ]);
  });

  it("keeps the legs-04-alt alternative link and the full-11 round timing", () => {
    const alt = allSlots.find((s) => s.id === "legs-04-alt");
    expect(alt?.alternativeTo).toBe("legs-04");
    const rounds = allSlots.find((s) => s.id === "full-11");
    expect(rounds?.sets).toBe(5);
    expect(rounds?.workSec).toBe(60);
    expect(rounds?.restSec).toBe(30);
  });
});

describe("straight-arm (sa) flags (addendum-2 §4)", () => {
  it("sets sa exactly on the documented straight-arm steps", () => {
    // 4 planche-chain + 2 front-lever + 4 LaLanne/roll-out. Addendum-2 §4's parenthetical counts
    // an 11th candidate (core.lsit_flutter) but marks it "borderline-false": the authoritative §3
    // JSON carries NO sa flag on it, so the seed has exactly these 10.
    const expected = [
      "pull-04/front_lever.fl_flutter",
      "pull-04/front_lever.tuck_fl_kick",
      "push-03/planche.planche_pushup",
      "push-03/planche.straddle_planche_pushup",
      "push-03/planche.tuck_planche_pushup",
      "push-03/planche.pseudo_planche_pushup",
      "push-04/core.lalanne_pushup_one_arm",
      "push-04/core.lalanne_pushup",
      "push-04/core.ab_rollout",
      "push-04/core.ab_rollout_knees",
    ].sort();
    const actual = allSlots
      .flatMap((slot) => slot.chain.filter((step) => step.sa).map((step) => `${slot.id}/${step.ex}`))
      .sort();
    expect(actual).toEqual(expected);
  });
});

describe("exercise catalog coverage (addendum-2 §3 + exercises.ts)", () => {
  it("resolves every ex id referenced by the seed (chain steps, opts, warmup, mobility)", () => {
    const missing = [...referencedExerciseIds()].filter((id) => !(id in exercises));
    expect(missing).toEqual([]);
  });

  it("references 144 distinct exercise ids (transcription guard)", () => {
    expect(referencedExerciseIds().size).toBe(144);
  });

  it("stores each exercise under its own id and includes the barbell standards namespace", () => {
    for (const [key, ex] of Object.entries(exercises)) expect(ex.id).toBe(key);
    for (const id of [
      "barbell.back_squat",
      "barbell.bench_press",
      "barbell.deadlift",
      "barbell.ohp",
      "barbell.row",
      "barbell.curl",
      "barbell.hip_thrust",
      "pull.weighted_pullup",
      "dip.weighted_dip",
    ]) {
      expect(exercises[id], id).toBeDefined();
    }
  });

  it("uses the addendum-3 §6 canonical bw_load_fraction constants", () => {
    expect(exercises["one_arm_pushup.pushup"]?.bwLoadFactor).toBe(0.75);
    expect(exercises["push.pushup_knees"]?.bwLoadFactor).toBe(0.618);
    expect(exercises["one_arm_pullup.pullup10"]?.bwLoadFactor).toBe(0.956);
    expect(exercises["dip.dip"]?.bwLoadFactor).toBe(0.956);
    expect(exercises["pistol_squat.pistol"]?.bwLoadFactor).toBe(0.839);
    expect(exercises["squat.air_squat"]?.bwLoadFactor).toBe(0.878);
    expect(exercises["pull.row_bodyweight"]?.bwLoadFactor).toBe(0.72);
  });

  it("maps standards keys only onto exercises that exist, with valid lift keys", () => {
    const validKeys = new Set([
      "back_squat",
      "bench_press",
      "deadlift",
      "ohp",
      "barbell_row",
      "curl",
      "hip_thrust",
      "weighted_pullup",
      "weighted_dip",
    ]);
    for (const [exId, liftKey] of Object.entries(standardsKeyByExercise)) {
      expect(exercises[exId], `standards key on unknown exercise ${exId}`).toBeDefined();
      expect(validKeys.has(liftKey), `${exId} -> ${liftKey}`).toBe(true);
    }
    // The deliberate mappings (task spec + addendum-3 §4.1); RDL et al. are intentionally absent.
    expect(standardsKeyByExercise["one_arm_pullup.wpu_25pct"]).toBe("weighted_pullup");
    expect(standardsKeyByExercise["dip.dip_weighted"]).toBe("weighted_dip");
    expect(standardsKeyByExercise["push.shoulder_press"]).toBe("ohp");
    expect(standardsKeyByExercise["pull.curl"]).toBe("curl");
    expect(standardsKeyByExercise["barbell.row"]).toBe("barbell_row");
    expect(standardsKeyByExercise["hinge.rdl"]).toBeUndefined();
  });
});

describe("author questions (addendum-2 §7)", () => {
  it("carries Q1-Q8 with seed defaults", () => {
    expect(authorQuestions.map((q) => q.id)).toEqual([
      "Q1",
      "Q2",
      "Q3",
      "Q4",
      "Q5",
      "Q6",
      "Q7",
      "Q8",
    ]);
    for (const q of authorQuestions) {
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.seedDefault.length).toBeGreaterThan(0);
    }
  });
});
