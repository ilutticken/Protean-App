// Goal mode (PLAN-GENERATOR.md Phase 3): closure, frontier, slot relevance, set rate.

import { describe, expect, it } from "vitest";
import { goalPath, goalRelevantIds, goalRelevantSetRate, prereqClosure, slotFeedsGoal } from "./goal";
import { skills } from "../data/skills";
import { plan } from "../data/prescription";
import { skillStatuses } from "./selectors";
import { blankData, emptyAthleteState } from "./storage";
import type { Athlete, SessionLog, SkillEntry, Slot } from "./types";

const athlete: Athlete = {
  id: "a",
  name: "Zen",
  sex: "male",
  bodyweightKg: 80,
  unit: "kg",
  accent: "#00a4c0",
  bodyweightLog: [{ date: "2026-08-01", kg: 80 }],
};

const allSlots: Slot[] = Object.values(plan.days).flat();
const slot = (id: string): Slot => allSlots.find((s) => s.id === id)!;

describe("prereqClosure", () => {
  it("contains the goal and every transitive prerequisite", () => {
    const c = prereqClosure("front_lever.full");
    expect(c.has("front_lever.full")).toBe(true);
    expect(c.has("front_lever.straddle")).toBe(true); // direct
    expect(c.has("front_lever.tuck")).toBe(true); // transitive
    expect(c.has("pull.dead_hang")).toBe(true); // deep root
  });

  it("only ever contains real node ids", () => {
    for (const id of prereqClosure("maltese.full")) expect(skills[id], id).toBeDefined();
  });

  it("stays inside the ancestry — an unrelated stunt's line is excluded", () => {
    const c = prereqClosure("front_lever.full");
    expect(c.has("pistol_squat.pistol")).toBe(false);
    expect(c.has("barbell_bench.1_5xbw")).toBe(false);
  });

  it("is empty for an unknown id", () => {
    expect(prereqClosure("ghost.node").size).toBe(0);
  });
});

describe("goalPath", () => {
  const fresh = skillStatuses({ ...blankData(), athlete }, athlete, emptyAthleteState());

  it("counts achieved vs remaining and lists a non-empty frontier on a fresh athlete", () => {
    const p = goalPath("front_lever.full", fresh)!;
    expect(p.total).toBe(p.closure.size);
    expect(p.achieved + p.remaining).toBe(p.total);
    // A fresh athlete has achieved nothing, but the roots are available -> frontier exists.
    expect(p.achieved).toBe(0);
    expect(p.nextUp.length).toBeGreaterThan(0);
    // Frontier nodes are startable: every prereq achieved (trivially, roots have none).
    for (const n of p.nextUp) {
      expect(["available", "in-progress"]).toContain(fresh[n.id].status);
    }
  });

  it("sorts the frontier shallowest-ring first — the honest next step", () => {
    const p = goalPath("front_lever.full", fresh)!;
    const rings = p.nextUp.map((n) => n.ring);
    expect([...rings].sort((a, b) => a - b)).toEqual(rings);
  });

  it("moves nodes off the frontier as they are achieved", () => {
    const log: SkillEntry[] = [1, 2, 3].map(() => ({
      date: "2026-08-04",
      nodeId: "pull.dead_hang",
      value: 60,
    }));
    const st = skillStatuses({ ...blankData(), athlete }, athlete, {
      ...emptyAthleteState(),
      skillLog: log,
    });
    const p = goalPath("front_lever.full", st)!;
    expect(p.achieved).toBeGreaterThan(0);
    expect(p.nextUp.some((n) => n.id === "pull.dead_hang")).toBe(false);
  });

  it("returns null for an unknown goal", () => {
    expect(goalPath("ghost.node", fresh)).toBeNull();
  });
});

describe("slotFeedsGoal", () => {
  const fl = goalRelevantIds("front_lever.full");

  it("pull-04 (front lever chain) feeds the front lever goal", () => {
    // Its drills (FL Flutter, Tuck FL Kick) are same-LINE siblings, not prerequisites —
    // goalRelevantIds exists precisely so this slot badges. Strict closure misses it.
    expect(slotFeedsGoal(slot("pull-04"), prereqClosure("front_lever.full"))).toBe(false);
    expect(slotFeedsGoal(slot("pull-04"), fl)).toBe(true);
  });

  it("legs-02 (pistols) does not feed the front lever goal", () => {
    expect(slotFeedsGoal(slot("legs-02"), fl)).toBe(false);
  });

  it("relevant set = closure plus the goal's own line, nothing else", () => {
    const rel = goalRelevantIds("front_lever.full");
    expect(rel.has("front_lever.fl_flutter")).toBe(true); // same line, not a prereq
    expect(rel.has("pull.dead_hang")).toBe(true); // closure
    expect(rel.has("back_lever.full")).toBe(false); // different line, not a prereq
  });

  it("never lights a slot for an acrobatic goal it cannot move", () => {
    // Standing back tuck: every relevant node is attested/balance. No slot may claim
    // to feed it — logging cannot move any of its nodes.
    const acro = goalRelevantIds("backflip.standing_backtuck");
    for (const s of allSlots) {
      expect(slotFeedsGoal(s, acro), s.id).toBe(false);
    }
  });
});

describe("goalRelevantSetRate", () => {
  const closure = prereqClosure("front_lever.full");
  const session = (id: string, date: string, exerciseId: string, sets: number): SessionLog => ({
    id,
    athleteId: "a",
    date,
    dayId: "pull",
    entries: [
      {
        slotId: "pull-04",
        stepIndex: 0,
        exerciseId,
        repBand: 1,
        sets: Array.from({ length: sets }, () => ({ value: 8 })),
      },
    ],
  });

  it("counts sets whose exercise credits the closure", () => {
    const sessions = [
      session("s1", "2026-08-03", "front_lever.tuck", 3), // on path
      session("s2", "2026-08-03", "squat.air_squat", 3), // off path
    ];
    const r = goalRelevantSetRate(sessions, undefined, "a", closure, "2026-08-01");
    expect(r).toEqual({ relevant: 3, total: 6, rate: 0.5 });
  });

  it("counts skill-log practice on the path", () => {
    const log: SkillEntry[] = [{ date: "2026-08-03", nodeId: "front_lever.tuck", value: 10 }];
    const r = goalRelevantSetRate([], log, "a", closure, "2026-08-01");
    expect(r).toEqual({ relevant: 1, total: 1, rate: 1 });
  });

  it("respects the window and the athlete id", () => {
    const sessions = [
      session("s1", "2026-07-01", "front_lever.tuck", 3), // too old
      { ...session("s2", "2026-08-03", "front_lever.tuck", 3), athleteId: "someone-else" },
    ];
    const r = goalRelevantSetRate(sessions, undefined, "a", closure, "2026-08-01");
    expect(r.total).toBe(0);
    expect(r.rate).toBeNull();
  });
});
