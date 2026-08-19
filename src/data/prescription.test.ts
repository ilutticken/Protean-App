// Guards on the R-DYN prescription overlay and the plan/tree rep agreement it exists for.
//
// The complaint this answers: "some of these are crazy — 50 reps? The stunt chart and
// workout plan should agree on reps."

import { describe, expect, it } from "vitest";
import { seedPlan } from "./seed-plan";
import {
  CONDITIONING_SLOTS,
  HEAVY_SLOTS,
  coreSlotIds,
  coreSlots,
  heavySlotCount,
  isCoreSlot,
  RDYN_SETS,
  RDYN_TARGET,
  isStrengthProgression,
  plan,
  rdynRepsByExercise,
} from "./prescription";
import { skills } from "./skills";
import { skillStatuses } from "../lib/selectors";
import { blankData, emptyAthleteState } from "../lib/storage";
import type { Athlete, EntryLog, SessionLog } from "../lib/types";

const allSeed = Object.values(seedPlan.days).flat();
const allPlan = Object.values(plan.days).flat();
const byId = new Map(allPlan.map((s) => [s.id, s]));

describe("the PDF transcription is untouched", () => {
  it("leaves seed-plan.ts alone — the overlay never mutates the source", () => {
    expect(seedPlan.days.legs.find((s) => s.id === "legs-05")?.tiers).toEqual([25, 50, 100]);
    expect(seedPlan.days.push.find((s) => s.id === "push-03")?.tiers).toEqual([20]);
    expect(allSeed.every((s) => s.sets === 2 || s.sets === 1 || s.sets === 5)).toBe(true);
  });

  it("keeps every PDF slot, with its sector, chain, type and unit intact", () => {
    for (const s of allSeed) {
      const p = byId.get(s.id)!;
      expect(p, s.id).toBeDefined();
      expect(p.sector).toBe(s.sector);
      expect(p.chain).toEqual(s.chain);
      expect(p.type).toBe(s.type);
      expect(p.unit).toBe(s.unit);
    }
  });

  it("adds ONLY the heavy barbell slots on top", () => {
    const extra = allPlan.map((s) => s.id).filter((id) => !allSeed.some((s) => s.id === id));
    expect(extra.sort()).toEqual(
      Object.values(HEAVY_SLOTS).flat().map((s) => s.id).sort(),
    );
  });
});

describe("R-DYN conversion", () => {
  it("prescribes 3 sets × 8 on every strength progression", () => {
    const heavyIds = new Set(Object.values(HEAVY_SLOTS).flat().map((s) => s.id));
    for (const s of allPlan) {
      // Heavy slots are a 3×5 strength dose (doc 03 §14), not an R-DYN progression.
      if (heavyIds.has(s.id) || !isStrengthProgression(s)) continue;
      expect(s.sets, s.id).toBe(RDYN_SETS);
      expect(s.tiers, s.id).toEqual([RDYN_TARGET]);
    }
  });

  it("leaves conditioning doses at their PDF numbers", () => {
    for (const s of allSeed) {
      if (isStrengthProgression(s)) continue;
      const p = byId.get(s.id)!;
      expect(p.sets, s.id).toBe(s.sets);
      expect(p.tiers, s.id).toEqual(s.tiers);
    }
  });

  it("excludes holds, rounds, and step/skip-counted slots automatically", () => {
    for (const s of allSeed) {
      const structural =
        (s.type !== undefined && s.type !== "chain") ||
        (s.unit !== undefined && s.unit !== "reps") ||
        s.chain.length < 2;
      if (structural) expect(isStrengthProgression(s), s.id).toBe(false);
    }
  });

  it("names every hand-picked conditioning slot in the real plan", () => {
    for (const id of CONDITIONING_SLOTS) expect(byId.has(id), id).toBe(true);
  });

  it("kills the 2×20 full planche push-up prescription", () => {
    const push03 = byId.get("push-03")!;
    expect(push03.tiers).toEqual([RDYN_TARGET]);
    // and the skill node keeps doc 01's real standard, which is far lower than 8
    const node = skills["planche.planche_pushup"];
    expect(node.criterion.kind).toBe("reps");
    if (node.criterion.kind === "reps") expect(node.criterion.reps).toBeLessThan(RDYN_TARGET);
  });

  it("no longer prescribes anything above 8 reps in a strength progression", () => {
    const over = allPlan
      .filter((s) => isStrengthProgression(s))
      .filter((s) => Math.max(...s.tiers) > RDYN_TARGET)
      .map((s) => `${s.id}: ${s.tiers.join("/")}`);
    expect(over).toEqual([]);
  });
});

describe("the stunt chart and the plan agree on reps", () => {
  it("never asks a skill node for more reps than the plan prescribes", () => {
    const disagreeing: string[] = [];
    for (const [exerciseId, target] of Object.entries(rdynRepsByExercise)) {
      const n = skills[exerciseId];
      if (!n || n.criterion.kind !== "reps") continue;
      if (n.criterion.reps > target) {
        disagreeing.push(`${exerciseId}: tree ${n.criterion.reps} > plan ${target}`);
      }
    }
    expect(disagreeing).toEqual([]);
  });

  it("uses the same set count on both sides where the criterion was aligned", () => {
    for (const [exerciseId, target] of Object.entries(rdynRepsByExercise)) {
      const n = skills[exerciseId];
      if (!n || n.criterion.kind !== "reps" || n.criterion.reps !== target) continue;
      expect(n.criterion.sets, exerciseId).toBe(RDYN_SETS);
    }
  });

  it("does not RAISE any criterion — genuine skill standards stay harder", () => {
    // planche/HSPU/one-arm rungs sit below 8 reps in doc 01's tables and must keep theirs.
    for (const id of ["planche.planche_pushup", "hspu.free_hspu", "one_arm_pushup.oap"]) {
      const c = skills[id].criterion;
      if (c.kind === "reps") expect(c.reps, id).toBeLessThan(RDYN_TARGET);
    }
  });
});

// ---------------------------------------------------------------------------

const athlete: Athlete = {
  id: "a",
  name: "Zen",
  sex: "male",
  bodyweightKg: 78,
  unit: "kg",
  accent: "#00a4c0",
  bodyweightLog: [{ date: "2026-08-01", kg: 78 }],
};

const sessionWith = (exerciseId: string, value: number, setCount: number): SessionLog => ({
  id: "s1",
  athleteId: "a",
  date: "2026-08-02",
  dayId: "legs",
  entries: [
    {
      slotId: "legs-01",
      stepIndex: 0,
      exerciseId,
      repBand: 0,
      sets: Array.from({ length: setCount }, () => ({ value })),
    } satisfies EntryLog,
  ],
});

const statusOf = (exerciseId: string, value: number, setCount: number) =>
  skillStatuses(
    { ...blankData(), athlete, sessions: [sessionWith(exerciseId, value, setCount)] },
    athlete,
    emptyAthleteState(),
  )[exerciseId]?.status;

describe("sets are enforced, not decorative", () => {
  const id = "squat.reverse_lunge"; // aligned to 3×8 by the overlay

  it("one qualifying set is NOT enough for a 3-set criterion", () => {
    expect(skills[id].criterion).toMatchObject({ kind: "reps", reps: 8, sets: 3 });
    expect(statusOf(id, 8, 1)).not.toBe("achieved");
  });

  it("two qualifying sets are still not enough", () => {
    expect(statusOf(id, 8, 2)).not.toBe("achieved");
  });

  it("three qualifying sets in one session achieve it", () => {
    expect(statusOf(id, 8, 3)).toBe("achieved");
  });

  it("three sets BELOW the target do not achieve it", () => {
    expect(statusOf(id, 7, 3)).not.toBe("achieved");
  });

  it("counts sets within ONE session — three sessions of one set do not add up", () => {
    const three = [1, 2, 3].map((i) => ({
      ...sessionWith(id, 8, 1),
      id: `s${i}`,
      date: `2026-08-0${i}`,
    }));
    const st = skillStatuses(
      { ...blankData(), athlete, sessions: three },
      athlete,
      emptyAthleteState(),
    );
    expect(st[id].status).not.toBe("achieved");
  });
});

// ---------------------------------------------------------------------------

describe("training regimes", () => {
  const DAYS = ["legs", "pull", "push", "fullbody"] as const;
  const REGIMES = ["calisthenic", "balanced", "powerlifting"] as const;

  it("prescribes exactly six exercises a day in every regime", () => {
    for (const r of REGIMES) {
      for (const d of DAYS) {
        expect(coreSlots(d, r).filter((s) => !s.alternativeTo).length, `${r}/${d}`).toBe(6);
      }
    }
  });

  it("calisthenic uses no barbell slots at all", () => {
    expect(heavySlotCount("calisthenic")).toBe(0);
    for (const d of DAYS) {
      expect(coreSlots(d, "calisthenic").filter((s) => s.id.startsWith("heavy-"))).toEqual([]);
    }
  });

  it("adds barbell sessions as the lean increases, never volume", () => {
    expect(heavySlotCount("calisthenic")).toBe(0);
    expect(heavySlotCount("balanced")).toBe(4);
    expect(heavySlotCount("powerlifting")).toBe(6);
    // ...and the exercise count is identical in all three (asserted above).
  });

  it("every barbell slot REPLACES a same-sector chain slot", () => {
    for (const r of ["balanced", "powerlifting"] as const) {
      for (const d of DAYS) {
        const base = coreSlotIds(d, "calisthenic");
        const now = coreSlotIds(d, r);
        const added = now.filter((id) => !base.includes(id));
        const dropped = base.filter((id) => !now.includes(id));
        expect(added.length, `${r}/${d}`).toBe(dropped.length);
        for (const id of added) {
          const heavy = Object.values(HEAVY_SLOTS).flat().find((s) => s.id === id)!;
          const replaced = plan.days[d].find((s) => dropped.includes(s.id))!;
          expect(heavy, id).toBeDefined();
          expect(replaced, `${id} replaces nothing`).toBeDefined();
        }
      }
    }
  });

  it("powerlifting covers squat, bench and deadlift across the week", () => {
    const ids = DAYS.flatMap((d) => coreSlots(d, "powerlifting").map((s) => s.id));
    for (const need of ["heavy-squat", "heavy-bench", "heavy-deadlift"]) {
      expect(ids, need).toContain(need);
    }
  });

  it("never prescribes the same barbell lift twice in one week", () => {
    for (const r of REGIMES) {
      const heavy = DAYS.flatMap((d) => coreSlots(d, r).map((s) => s.id)).filter((id) =>
        id.startsWith("heavy-"),
      );
      expect(new Set(heavy).size, r).toBe(heavy.length);
    }
  });

  it("heavy slots are 3×5, and stay out of the R-DYN rep alignment", () => {
    for (const s of Object.values(HEAVY_SLOTS).flat()) {
      expect(s.sets, s.id).toBe(3);
      expect(s.tiers, s.id).toEqual([5]);
      // The tree must not be dragged to 5 reps by them.
      for (const step of s.chain) {
        if (step.ex) expect(rdynRepsByExercise[step.ex], step.ex).not.toBe(5);
      }
    }
  });

  it("isCoreSlot agrees with coreSlots for every slot on every day", () => {
    for (const r of REGIMES) {
      for (const d of DAYS) {
        const core = new Set(coreSlots(d, r).map((s) => s.id));
        for (const s of plan.days[d]) {
          expect(isCoreSlot(d, s, r), `${r}/${d}/${s.id}`).toBe(core.has(s.id));
        }
      }
    }
  });

  it("defaults to the calisthenic lean when none is set", () => {
    for (const d of DAYS) {
      expect(coreSlotIds(d)).toEqual(coreSlotIds(d, "calisthenic"));
    }
  });
});
