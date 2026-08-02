// Guards on the node-id -> exercise-id alias map (src/data/skill-exercise-alias.ts).
// The map is the only thing that lets an on-ramp rung auto-achieve, so it is also the only
// place a bad entry could unlock an elite node from beginner work.

import { describe, expect, it } from "vitest";
import { skillExerciseAlias } from "./skill-exercise-alias";
import { exercises } from "./exercises";
import { skills } from "./skills";
import { bestByExercise } from "../lib/selectors";
import { computeSkillStatuses } from "../lib/skilltree";
import type { Athlete, AthleteState, SessionLog } from "../lib/types";

const aliasEntries = Object.entries(skillExerciseAlias);

/**
 * Declared movement identity for every id the map touches. Criterion thresholds are NOT a
 * usable safety signal here — criterionMet re-measures reps/kg against the node's own
 * criterion, so any threshold is safe as long as the movement is the same one. Movement
 * identity is therefore the guard, and it has to be declared explicitly.
 */
const MOVEMENT: Record<string, string> = {
  // strict pull-up
  "pull_base.pullup1": "pullup_strict",
  "pull_base.pullup3": "pullup_strict",
  "pull_base.pullup5": "pullup_strict",
  "pull_base.pullup8": "pullup_strict",
  "one_arm_pullup.pullup10": "pullup_strict",
  // weighted pull-up
  "pull_base.wpu_10pct": "pullup_weighted",
  "pull_base.wpu_35pct": "pullup_weighted",
  "pull_base.wpu_70pct": "pullup_weighted",
  "one_arm_pullup.wpu_50pct": "pullup_weighted",
  "one_arm_pullup.wpu_25pct": "pullup_weighted",
  // full push-up
  "pushup_base.first_pushup": "pushup_full",
  "pushup_base.pushup_10": "pushup_full",
  "one_arm_pushup.pushup": "pushup_full",
  // parallel-bar dip
  "dip.dip_strict5": "dip_parallel",
  "dip.dip": "dip_parallel",
  "dip.dip_weighted_10": "dip_weighted",
  "dip.weighted_half_bw": "dip_weighted",
  "dip.dip_weighted": "dip_weighted",
  // squat family
  "squat_base.air_squat_50": "air_squat",
  "squat.air_squat": "air_squat",
  "pistol_squat.pistol_10pct": "pistol_weighted",
  "pistol_squat.pistol_half_bw": "pistol_weighted",
  "pistol_squat.weighted_pistol": "pistol_weighted",
  // hinge / posterior
  "hinge_ramp.good_morning_bw": "good_morning",
  "hinge.good_morning": "good_morning",
  "hinge_ramp.rdl_half_bw": "rdl",
  "hinge_ramp.rdl_bw": "rdl",
  "hinge.rdl": "rdl",
  "power_ramp.kb_swing": "kb_swing",
  "hinge.kb_swing": "kb_swing",
  "bridge_ramp.sl_glute_bridge": "glute_bridge_unilateral",
  "hinge.glute_bridge_unilateral": "glute_bridge_unilateral",
  "posterior_base.hip_thrust_2x": "hip_thrust",
  "barbell.hip_thrust": "hip_thrust",
  // conditioning
  "skip.skip_500": "jump_rope",
  "cond.skip": "jump_rope",
};

/** Pairs that must never appear: a harder node drawing on an easier movement's log. */
const FORBIDDEN: [node: string, exerciseId: string][] = [
  ["one_arm_pushup.oap", "one_arm_pushup.pushup"],
  ["one_arm_pushup.oap_narrow", "one_arm_pushup.pushup"],
  ["pushup_uni.oap_partial", "one_arm_pushup.pushup"],
  ["one_arm_pullup.one_arm_pullup", "one_arm_pullup.pullup10"],
  ["one_arm_pullup.one_arm_chinup", "one_arm_pullup.pullup10"],
  ["pull_base.typewriter_pullup", "one_arm_pullup.pullup10"],
  ["skip.double_under_10", "cond.skip"],
  ["skip.double_under_50", "cond.skip"],
  ["ring_base.rto45_dips", "dip.ring_dip"],
  ["ring_base.rto75_dips", "dip.ring_dip"],
  ["dip.bench_dip_feet_up", "dip.tricep_dip"],
  ["posterior_base.slr_rdl_weighted", "hinge.rdl"],
  ["posterior_base.calf_single_deficit", "squat.deficit_calf_raise"],
  ["pushup_base.clap_pushup", "push.explosive_pushup"],
  ["hspu.deficit_hspu", "hspu.wall_hspu_full"],
];

describe("skillExerciseAlias: id integrity", () => {
  it("keys every entry by a real skill node id", () => {
    const bad = aliasEntries.map(([k]) => k).filter((k) => !(k in skills));
    expect(bad).toEqual([]);
  });

  it("points every entry at a real catalog exercise id", () => {
    const bad = aliasEntries.filter(([, v]) => !(v in exercises)).map(([k, v]) => `${k} -> ${v}`);
    expect(bad).toEqual([]);
  });

  it("never maps a node onto itself", () => {
    const bad = aliasEntries.filter(([k, v]) => k === v).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it("only aliases nodes that are NOT already catalog exercise ids", () => {
    // A node whose id is an exercise id already receives logs directly; aliasing it would
    // be dead code at best and would shadow real logged data at worst.
    const bad = aliasEntries.map(([k]) => k).filter((k) => k in exercises);
    expect(bad).toEqual([]);
  });
});

describe("skillExerciseAlias: criterion eligibility", () => {
  it("never aliases a criterion kind that bestByExercise cannot satisfy", () => {
    // e1rm-ratio reads e1rmByLift; time/distance read locomotionBest; attested is manual.
    const bad = aliasEntries
      .filter(([k]) => ["attested", "e1rm-ratio", "time", "distance"].includes(skills[k].criterion.kind))
      .map(([k]) => `${k} (${skills[k].criterion.kind})`);
    expect(bad).toEqual([]);
  });

  it("never aliases a balance-sector node (NO_AUTO_UNLOCK, addendum-1 §0)", () => {
    const bad = aliasEntries.map(([k]) => k).filter((k) => skills[k].sector === "balance");
    expect(bad).toEqual([]);
  });

  it("never aliases a hold node onto a reps-only source", () => {
    // A hold criterion needs maxHoldSec; a reps-logged exercise never produces one, and
    // pairing them would silently freeze the node at "in-progress".
    const holdKeys = aliasEntries.filter(([k]) => skills[k].criterion.kind === "hold");
    for (const [k, v] of holdKeys) {
      expect(skills[v]?.criterion.kind, `${k} -> ${v}`).toBe("hold");
    }
  });
});

describe("skillExerciseAlias: movement-identity safety", () => {
  it("declares a movement for every id the map touches", () => {
    const touched = new Set<string>();
    for (const [k, v] of aliasEntries) {
      touched.add(k);
      touched.add(v);
    }
    const undeclared = [...touched].filter((id) => MOVEMENT[id] === undefined);
    expect(undeclared).toEqual([]);
    const stale = Object.keys(MOVEMENT).filter((id) => !touched.has(id));
    expect(stale).toEqual([]);
  });

  it("keeps every alias inside one movement", () => {
    const crossing = aliasEntries
      .filter(([k, v]) => MOVEMENT[k] !== MOVEMENT[v])
      .map(([k, v]) => `${k} (${MOVEMENT[k]}) -> ${v} (${MOVEMENT[v]})`);
    expect(crossing).toEqual([]);
  });

  it("never draws a harder node from an easier movement", () => {
    for (const [node, exerciseId] of FORBIDDEN) {
      expect(skills[node], `${node} is not a skill node — update FORBIDDEN`).toBeDefined();
      expect(exercises[exerciseId], `${exerciseId} is not an exercise — update FORBIDDEN`).toBeDefined();
      expect(skillExerciseAlias[node], `${node} must not alias to ${exerciseId}`).not.toBe(exerciseId);
    }
  });
});

// ---------------------------------------------------------------------------
// Behavioural: the bug this map exists to fix.

const athlete: Athlete = {
  id: "a1",
  name: "Tester",
  sex: "male",
  bodyweightKg: 75,
  unit: "kg",
  accent: "#7dd3fc",
  bodyweightLog: [],
};

const emptyState: AthleteState = { skillProgress: {}, slotState: {}, slotAlternatives: {} };

function statusesFor(sessions: SessionLog[], state: AthleteState = emptyState) {
  return computeSkillStatuses({
    skills,
    manual: state.skillProgress,
    bestByExercise: bestByExercise(sessions, state, athlete.id),
    e1rmByLift: {},
    bodyweightKg: athlete.bodyweightKg,
    sex: athlete.sex,
  });
}

const pullSession = (exerciseId: string, value: number, weightKg?: number): SessionLog => ({
  id: "s1",
  athleteId: athlete.id,
  date: "2026-01-05",
  dayId: "pull",
  entries: [
    {
      slotId: "pull-05",
      stepIndex: 2,
      exerciseId,
      repBand: 1,
      sets: [{ value, ...(weightKg === undefined ? {} : { weightKg }) }],
    },
  ],
});

describe("skillExerciseAlias: logging the catalog pull-up", () => {
  const statuses = statusesFor([pullSession("one_arm_pullup.pullup10", 10)]);

  it("achieves every strict pull-up rep rung at or below the logged set", () => {
    for (const id of [
      "pull_base.pullup1",
      "pull_base.pullup3",
      "pull_base.pullup5",
      "pull_base.pullup8",
      "one_arm_pullup.pullup10",
    ]) {
      expect(statuses[id].status, id).toBe("achieved");
    }
  });

  it("leaves genuinely harder pull nodes unachieved", () => {
    for (const id of [
      "pull_base.c2b_pullup",
      "pull_base.typewriter_pullup",
      "pull_base.wpu_10pct",
      "pull_base.wpu_70pct",
      "one_arm_pullup.archer_pullup",
      "one_arm_pullup.one_arm_chinup",
      "one_arm_pullup.one_arm_pullup",
      "muscle_up_bar.bar_mu",
    ]) {
      expect(statuses[id].status, id).not.toBe("achieved");
    }
  });

  it("does not leak across movements", () => {
    for (const id of ["pushup_base.first_pushup", "dip.dip_strict5", "squat_base.air_squat_50"]) {
      expect(statuses[id].status, id).not.toBe("achieved");
    }
  });
});

describe("skillExerciseAlias: weighted rungs keep same-set pairing", () => {
  // 5 reps at 15 kg on a 75 kg athlete == 0.20xBW: clears the +10% rung only.
  const statuses = statusesFor([pullSession("one_arm_pullup.wpu_25pct", 5, 15)]);

  it("achieves the load rung the logged set actually covers", () => {
    expect(statuses["pull_base.wpu_10pct"].status).toBe("achieved");
  });

  it("leaves heavier load rungs unachieved", () => {
    for (const id of ["pull_base.wpu_35pct", "one_arm_pullup.wpu_50pct", "pull_base.wpu_70pct"]) {
      expect(statuses[id].status, id).not.toBe("achieved");
    }
  });
});
