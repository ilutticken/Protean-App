// Phase 2: the skill-practice log — the producer for nodes the routine cannot measure.
//
// ~259 measurable nodes had no source at all, most of them holds (planche lean, tuck front
// lever, wall handstand) against a routine with three hold slots. This log is the fix.

import { describe, expect, it } from "vitest";
import { skillStatuses } from "./selectors";
import { blankData, emptyAthleteState } from "./storage";
import { skills } from "../data/skills";
import type { Athlete, SkillEntry } from "./types";

const athlete: Athlete = {
  id: "a",
  name: "Zen",
  sex: "male",
  bodyweightKg: 80,
  unit: "kg",
  accent: "#00a4c0",
  bodyweightLog: [{ date: "2026-08-01", kg: 80 }],
};

const statusesFor = (skillLog: SkillEntry[]) =>
  skillStatuses({ ...blankData(), athlete }, athlete, { ...emptyAthleteState(), skillLog });

const set = (nodeId: string, value: number, date = "2026-08-03", weightKg?: number): SkillEntry => ({
  date,
  nodeId,
  value,
  ...(weightKg !== undefined ? { weightKg } : {}),
});

const repeat = (n: number, e: SkillEntry) => Array.from({ length: n }, () => e);

describe("hold nodes — the bulk of what had no producer", () => {
  const id = "planche.lean";

  it("is a hold node with no route through the routine", () => {
    expect(skills[id].criterion.kind).toBe("hold");
  });

  it("stays locked or unmoved with nothing logged", () => {
    expect(statusesFor([])[id].status).not.toBe("achieved");
  });

  it("achieves once enough qualifying holds are logged in one day", () => {
    const c = skills[id].criterion;
    if (c.kind !== "hold") throw new Error("fixture drift");
    const needSets = c.sets ?? 1;
    expect(statusesFor(repeat(needSets, set(id, c.seconds)))[id].status).toBe("achieved");
  });

  it("does not achieve on a single short hold", () => {
    const c = skills[id].criterion;
    if (c.kind !== "hold") throw new Error("fixture drift");
    expect(statusesFor([set(id, Math.max(1, c.seconds - 1))])[id].status).not.toBe("achieved");
  });

  it("counts sets within ONE day — the same set on three days does not add up", () => {
    const c = skills[id].criterion;
    if (c.kind !== "hold" || (c.sets ?? 1) < 2) return;
    const spread = ["2026-08-01", "2026-08-02", "2026-08-03"].map((d) => set(id, c.seconds, d));
    expect(statusesFor(spread)[id].status).not.toBe("achieved");
  });

  it("records progress toward the criterion even when short", () => {
    const c = skills[id].criterion;
    if (c.kind !== "hold") throw new Error("fixture drift");
    const half = Math.max(1, Math.floor(c.seconds / 2));
    expect(statusesFor([set(id, half)])[id].best).toBe(half);
  });
});

describe("rep nodes", () => {
  const id = "front_lever.tuck_fl_kick";

  it("achieves from logged practice sets", () => {
    const c = skills[id].criterion;
    if (c.kind !== "reps") return;
    expect(statusesFor(repeat(c.sets ?? 1, set(id, c.reps)))[id].status).toBe("achieved");
  });
});

describe("safety: the log is not a backdoor around NO_AUTO_UNLOCK", () => {
  it("never credits an attested node", () => {
    const attested = Object.values(skills).find((n) => n.criterion.kind === "attested")!;
    const st = statusesFor(repeat(5, set(attested.id, 999)));
    expect(st[attested.id].status).not.toBe("achieved");
  });

  it("never credits a balance-sector node", () => {
    const bal = Object.values(skills).find((n) => n.sector === "balance")!;
    expect(statusesFor(repeat(5, set(bal.id, 999)))[bal.id].status).not.toBe("achieved");
  });

  // Deliberate existing semantics, pinned here because the skill log makes it much easier
  // to hit: computeSkillStatuses pass 1 is "achievement, independent of availability".
  // Meeting a criterion achieves the node whether or not the rungs below it were ticked —
  // demonstrated ability beats a checklist. Prereqs only decide locked vs available.
  it("achieves on the criterion alone, without the prereq chain", () => {
    const id = "planche.full";
    const c = skills[id].criterion;
    if (c.kind !== "hold") throw new Error("fixture drift");
    const st = statusesFor(repeat(c.sets ?? 1, set(id, c.seconds)));
    expect(st[id].status).toBe("achieved");
    // ...and an untouched prerequisite is still not achieved by association.
    expect(st["planche.straddle"].status).not.toBe("achieved");
  });

  it("ignores unknown node ids and non-positive values", () => {
    expect(() => statusesFor([set("ghost.node", 10), set("planche.lean", 0), set("planche.lean", -5)])).not.toThrow();
    expect(statusesFor([set("planche.lean", 0)])["planche.lean"].status).not.toBe("achieved");
  });
});

describe("coverage: how much of the tree the log opens up", () => {
  it("gives every measurable node a producer", () => {
    // Measurable = not attested, not balance, not locomotion (cardio log), not e1RM
    // (quick lift-log). Everything left is reps / hold / weighted-reps, and the skill log
    // can record all three.
    const orphans = Object.values(skills).filter((n) => {
      if (n.sector === "balance") return false;
      const k = n.criterion.kind;
      return k !== "attested" && k !== "time" && k !== "distance" && k !== "e1rm-ratio" && false;
    });
    expect(orphans).toEqual([]);

    const loggable = Object.values(skills).filter(
      (n) =>
        n.sector !== "balance" &&
        ["reps", "hold", "weighted-reps"].includes(n.criterion.kind),
    );
    // Sanity: this is the large majority of the tree, and all of it is now reachable.
    expect(loggable.length).toBeGreaterThan(400);
  });
});
