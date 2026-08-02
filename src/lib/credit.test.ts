import { describe, expect, it } from "vitest";
import { creditedNodes, nodesCreditedBy, sessionCredit } from "./credit";
import { skills } from "../data/skills";
import { seedPlan } from "../data/seed-plan";
import { exercises } from "../data/exercises";
import { skillExerciseAlias } from "../data/skill-exercise-alias";
import { skillStatuses } from "./selectors";
import { blankData, emptyAthleteState } from "./storage";
import type { Athlete, EntryLog, SessionLog, SkillProgress } from "./types";

const athlete: Athlete = {
  id: "a",
  name: "Zen",
  sex: "male",
  bodyweightKg: 78,
  unit: "kg",
  accent: "#00a4c0",
  bodyweightLog: [{ date: "2026-08-01", kg: 78 }],
};

const p = (status: SkillProgress["status"], best?: number): SkillProgress => ({ status, best });

describe("nodesCreditedBy", () => {
  it("credits a node from its own id", () => {
    expect(nodesCreditedBy("pull.curl")).toContain("pull.curl");
  });

  it("credits aliased on-ramp rungs from their source exercise", () => {
    const feeds = nodesCreditedBy("one_arm_pullup.pullup10");
    expect(feeds).toContain("one_arm_pullup.pullup10"); // direct
    expect(feeds).toContain("pull_base.pullup5"); // alias
    expect(feeds).toContain("pull_base.pullup8");
  });

  it("credits every e1RM rung on a lift from one barbell exercise", () => {
    const feeds = nodesCreditedBy("barbell.deadlift");
    expect(feeds).toContain("barbell_deadlift.1_5xbw");
    expect(feeds).toContain("barbell_deadlift.2_0xbw");
    expect(feeds).toContain("barbell_deadlift.3_0xbw");
  });

  it("returns nothing for an unknown exercise", () => {
    expect(nodesCreditedBy("not.an.exercise")).toEqual([]);
  });

  // A locomotion node may be claimed ONLY by its own id (identity), never by another
  // exercise — the cardio log is its only real producer, so a slot that advertised
  // "feeds Run 5K Continuous" would be lying. The earlier version of this test asked
  // what the node itself credits instead of who credits the node, and so passed against
  // a deliberately bogus alias.
  it("never lets any OTHER exercise claim a locomotion node", () => {
    const locomotionIds = new Set(
      Object.values(skills)
        .filter((n) => n.criterion.kind === "time" || n.criterion.kind === "distance")
        .map((n) => n.id),
    );
    const offenders: string[] = [];
    for (const exerciseId of Object.keys(exercises)) {
      for (const nodeId of nodesCreditedBy(exerciseId)) {
        if (locomotionIds.has(nodeId) && nodeId !== exerciseId) {
          offenders.push(`${exerciseId} -> ${nodeId}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("agrees with the alias map in both directions", () => {
    for (const [nodeId, exerciseId] of Object.entries(skillExerciseAlias)) {
      expect(nodesCreditedBy(exerciseId), `${exerciseId} -> ${nodeId}`).toContain(nodeId);
    }
  });
});

describe("creditedNodes ordering", () => {
  it("puts stunts first, then the deepest rungs", () => {
    const nodes = creditedNodes("barbell.deadlift");
    expect(nodes.length).toBeGreaterThan(1);
    const firstNonStunt = nodes.findIndex((n) => !n.isStunt);
    const lastStunt = nodes.map((n) => Boolean(n.isStunt)).lastIndexOf(true);
    if (firstNonStunt >= 0 && lastStunt >= 0) expect(lastStunt).toBeLessThan(firstNonStunt);
  });
});

describe("creditedNodes never advertises an unmovable node", () => {
  // Locked decision #10: attested nodes and everything in the `balance` sector never
  // auto-unlock. push-08's crawl steps map onto balance nodes, so before this filter
  // the Plan screen told a fresh athlete their default push-08 step "feeds Foot-Hand
  // Crawl" — credit that logging can never deliver.
  it("filters out attested and balance-sector nodes", () => {
    const offenders: string[] = [];
    for (const exerciseId of Object.keys(exercises)) {
      for (const n of creditedNodes(exerciseId)) {
        if (n.sector === "balance" || n.criterion.kind === "attested") {
          offenders.push(`${exerciseId} -> ${n.id}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("still lists them in the raw index, which is not user-facing", () => {
    expect(nodesCreditedBy("cond.foot_hand_crawl")).toContain("cond.foot_hand_crawl");
    expect(creditedNodes("cond.foot_hand_crawl")).toEqual([]);
  });
});

describe("every seed slot advertises something", () => {
  // Measured through creditedNodes(), not the raw index: the invariant that matters is
  // that every slot advertises something the athlete can ACTUALLY move by logging it.
  // push-08 passes on its band-0 sandbag step; its two crawl steps correctly show nothing.
  it("has at least one auto-markable node on some step of every slot", () => {
    const dead: string[] = [];
    for (const day of Object.values(seedPlan.days)) {
      for (const slot of day) {
        const ids = slot.chain.flatMap((s) => (s.ex ? [s.ex] : (s.opts ?? []).map((o) => o.ex)));
        if (!ids.some((id) => creditedNodes(id).length > 0)) dead.push(slot.id);
      }
    }
    expect(dead).toEqual([]);
  });
});

describe("sessionCredit", () => {
  it("reports nothing when nothing moved", () => {
    const before = { "pull.curl": p("available") };
    expect(sessionCredit(before, before).total).toBe(0);
  });

  it("reports a newly achieved node once, as achieved", () => {
    const c = sessionCredit({ "pull.curl": p("available") }, { "pull.curl": p("achieved") });
    expect(c.achieved.map((x) => x.nodeId)).toEqual(["pull.curl"]);
    expect(c.unlocked).toEqual([]);
    expect(c.progressed).toEqual([]);
  });

  it("reports a locked→achieved jump ONCE, not as both unlocked and achieved", () => {
    const c = sessionCredit({ "pull.curl": p("locked") }, { "pull.curl": p("achieved") });
    expect(c.total).toBe(1);
    expect(c.achieved).toHaveLength(1);
  });

  // Regression: a real session always carries a `best`, so a status change AND an
  // improved number happen together. Without the early `continue` in sessionCredit
  // the node is counted twice — once as achieved, once as progressed. The version
  // of this test that omitted `best` passed against the broken code.
  it("counts a node ONCE when its status changed AND its best improved", () => {
    const c = sessionCredit(
      { "pull.curl": p("in-progress", 8) },
      { "pull.curl": p("achieved", 12) },
    );
    expect(c.total).toBe(1);
    expect(c.achieved.map((x) => x.nodeId)).toEqual(["pull.curl"]);
    expect(c.progressed).toEqual([]);
  });

  it("counts a locked→achieved node with a best ONCE", () => {
    const c = sessionCredit({}, { "pull.curl": p("achieved", 12) });
    expect(c.total).toBe(1);
    expect(c.achieved).toHaveLength(1);
    expect(c.progressed).toEqual([]);
  });

  it("counts a locked→available node with a best ONCE", () => {
    const c = sessionCredit({}, { "pull.curl": p("available", 3) });
    expect(c.total).toBe(1);
    expect(c.unlocked).toHaveLength(1);
    expect(c.progressed).toEqual([]);
  });

  it("never lists the same node id in two buckets", () => {
    const c = sessionCredit(
      { "pull.curl": p("locked", 1), "squat.air_squat": p("in-progress", 5) },
      { "pull.curl": p("achieved", 20), "squat.air_squat": p("achieved", 25) },
    );
    const ids = [...c.achieved, ...c.unlocked, ...c.progressed].map((x) => x.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(c.total).toBe(ids.length);
  });

  it("reports locked→available as unlocked", () => {
    const c = sessionCredit({ "pull.curl": p("locked") }, { "pull.curl": p("available") });
    expect(c.unlocked.map((x) => x.nodeId)).toEqual(["pull.curl"]);
  });

  it("reports a better number at the same status as progress, with from/to", () => {
    const c = sessionCredit(
      { "pull.curl": p("in-progress", 8) },
      { "pull.curl": p("in-progress", 11) },
    );
    expect(c.progressed).toHaveLength(1);
    expect(c.progressed[0]).toMatchObject({ from: 8, to: 11 });
  });

  it("does not report a WORSE number as progress", () => {
    const c = sessionCredit(
      { "pull.curl": p("in-progress", 12) },
      { "pull.curl": p("in-progress", 9) },
    );
    expect(c.total).toBe(0);
  });

  it("treats an absent 'before' entry as locked with no best", () => {
    const c = sessionCredit({}, { "pull.curl": p("available") });
    expect(c.unlocked.map((x) => x.nodeId)).toEqual(["pull.curl"]);
  });

  it("ignores ids that are not skill nodes", () => {
    expect(sessionCredit({}, { "ghost.node": p("achieved") }).total).toBe(0);
  });

  it("sorts stunts to the front", () => {
    const c = sessionCredit(
      {},
      {
        "squat.air_squat": p("achieved"),
        "barbell_deadlift.2_0xbw": p("achieved"),
      },
    );
    expect(c.achieved[0].nodeId).toBe("barbell_deadlift.2_0xbw");
  });
});

describe("sessionCredit end-to-end against real statuses", () => {
  const entry = (slotId: string, exerciseId: string, value: number): EntryLog => ({
    slotId,
    stepIndex: 0,
    exerciseId,
    repBand: 1,
    // Three sets — criterion `sets` is enforced now (doc 01 R-DYN).
    sets: [{ value }, { value }, { value }],
  });

  it("credits the conditioning work a real Legs session logs", () => {
    const data = { ...blankData(), athlete };
    const session: SessionLog = {
      id: "s1",
      athleteId: "a",
      date: "2026-08-02",
      dayId: "legs",
      entries: [
        entry("legs-05", "squat.bunny_hop", 40),
        entry("legs-05", "cond.backward_walk", 100),
        entry("legs-09", "core.bicycle_situp", 20),
      ],
    };
    const before = skillStatuses(data, athlete, emptyAthleteState());
    const after = skillStatuses(
      { ...data, sessions: [session] },
      athlete,
      emptyAthleteState(),
    );
    const c = sessionCredit(before, after);

    const achievedIds = c.achieved.map((x) => x.nodeId);
    expect(achievedIds).toContain("squat.bunny_hop");
    expect(achievedIds).toContain("cond.backward_walk");
    expect(achievedIds).toContain("core.bicycle_situp");
    expect(c.total).toBeGreaterThanOrEqual(3);
  });

  it("a session that logs nothing new moves nothing", () => {
    const data = { ...blankData(), athlete };
    const session: SessionLog = {
      id: "s1",
      athleteId: "a",
      date: "2026-08-02",
      dayId: "legs",
      entries: [entry("legs-05", "squat.bunny_hop", 40)],
    };
    const withOne = { ...data, sessions: [session] };
    const before = skillStatuses(withOne, athlete, emptyAthleteState());
    const again: SessionLog = { ...session, id: "s2", date: "2026-08-04" };
    const after = skillStatuses(
      { ...withOne, sessions: [session, again] },
      athlete,
      emptyAthleteState(),
    );
    expect(sessionCredit(before, after).total).toBe(0);
  });
});
