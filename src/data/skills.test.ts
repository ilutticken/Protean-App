// Structural + behavioral tests for the skill tree (docs 01 §6, addendum-1, addendum-2 §4).
import { describe, expect, it } from "vitest";
import { femaleBwRatioOverride, locomotionTimeBySex, skills } from "./skills";
import { computeSkillStatuses, sectorCompletion } from "../lib/skilltree";
import type { SkillTreeInput } from "../lib/skilltree";
import type { Sector } from "../lib/types";

const ALL_SECTORS: Sector[] = [
  "pushup",
  "dips_planche_hs",
  "pull_levers",
  "back_chain",
  "posterior",
  "squat",
  "core",
  "balance",
  "run_martial",
];

const ids = Object.keys(skills);

function emptyInput(overrides: Partial<SkillTreeInput> = {}): SkillTreeInput {
  return {
    skills,
    manual: {},
    bestByExercise: {},
    e1rmByLift: {},
    bodyweightKg: 80,
    sex: "male",
    ...overrides,
  };
}

describe("skill tree structure", () => {
  it("has no dangling prereq ids", () => {
    for (const id of ids) {
      for (const p of skills[id].prereqs) {
        expect(skills[p], `${id} -> missing prereq ${p}`).toBeDefined();
      }
    }
  });

  it("prereq rings are strictly smaller than dependent rings (implies DAG)", () => {
    for (const id of ids) {
      for (const p of skills[id].prereqs) {
        expect(skills[p].ring, `${p} (ring ${skills[p].ring}) must be < ${id} (ring ${skills[id].ring})`).toBeLessThan(
          skills[id].ring,
        );
      }
    }
  });

  it("prereq graph is a DAG (explicit cycle check)", () => {
    const state: Record<string, 0 | 1 | 2> = {}; // 0/undef=unvisited, 1=visiting, 2=done
    const visit = (id: string): void => {
      if (state[id] === 2) return;
      expect(state[id], `cycle through ${id}`).not.toBe(1);
      state[id] = 1;
      for (const p of skills[id].prereqs) visit(p);
      state[id] = 2;
    };
    for (const id of ids) visit(id);
  });

  it("every sector has at least 8 nodes", () => {
    const counts: Record<string, number> = {};
    for (const id of ids) counts[skills[id].sector] = (counts[skills[id].sector] ?? 0) + 1;
    for (const s of ALL_SECTORS) {
      expect(counts[s] ?? 0, `sector ${s}`).toBeGreaterThanOrEqual(8);
    }
  });

  it("every isStunt node is reachable from a ring-0 node", () => {
    const reachesRing0 = (id: string, seen: Set<string>): boolean => {
      if (skills[id].ring === 0) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return skills[id].prereqs.some((p) => reachesRing0(p, seen));
    };
    for (const id of ids) {
      if (skills[id].isStunt) {
        expect(reachesRing0(id, new Set()), `stunt ${id} unreachable from ring 0`).toBe(true);
      }
    }
  });

  it("contains the seed-mapped exercise ids from addendum-2 §4", () => {
    // The "(14 steps)" list as printed in addendum-2 §4 (15 ids as enumerated there).
    const mapped = [
      "pistol_squat.weighted_pistol",
      "pistol_squat.pistol",
      "rope_climb.weighted_climb",
      "rope_climb.lsit_rope_climb",
      "one_arm_pullup.wpu_25pct",
      "one_arm_pullup.pullup10",
      "muscle_up_bar.explosive_pullup",
      "hspu.free_hspu",
      "hspu.wall_hspu_full",
      "hspu.elevated_pike",
      "hspu.pike_pushup",
      "planche.planche_pushup",
      "one_arm_pushup.pushup",
      "one_arm_pushup.oap",
      "bridge.glute_bridge",
    ];
    for (const id of mapped) expect(skills[id], `seed-mapped id ${id} missing`).toBeDefined();
    // Flagged steps promoted to tree nodes (addendum-2 §4 criteria table).
    const flagged = [
      "planche.pseudo_planche_pushup",
      "planche.tuck_planche_pushup",
      "planche.straddle_planche_pushup",
      "front_lever.tuck_fl_kick",
      "front_lever.fl_flutter",
      "core.lsit_flutter",
      "push.oap_weighted",
      "pull.towel_pullup",
      "dip.ring_dip",
      "hinge.glute_bridge_weighted",
    ];
    for (const id of flagged) expect(skills[id], `flagged id ${id} missing`).toBeDefined();
  });

  it("acrobatics (balance sector) nodes are all attested-only", () => {
    for (const id of ids) {
      if (skills[id].sector === "balance") {
        expect(skills[id].criterion.kind, id).toBe("attested");
      }
    }
  });

  it("every time-criterion node has a per-sex threshold entry, and vice versa", () => {
    for (const id of ids) {
      if (skills[id].criterion.kind === "time") {
        expect(locomotionTimeBySex[id], `missing locomotionTimeBySex for ${id}`).toBeDefined();
      }
    }
    for (const id of Object.keys(locomotionTimeBySex)) {
      expect(skills[id], `locomotionTimeBySex id ${id} not in tree`).toBeDefined();
      expect(skills[id].criterion.kind).toBe("time");
      expect(locomotionTimeBySex[id].female).toBeGreaterThan(locomotionTimeBySex[id].male);
    }
  });

  it("every femaleBwRatioOverride id exists and has a ratio-based criterion", () => {
    for (const id of Object.keys(femaleBwRatioOverride)) {
      expect(skills[id], `override id ${id} not in tree`).toBeDefined();
      expect(["e1rm-ratio", "weighted-reps", "total-ratio"]).toContain(skills[id].criterion.kind);
    }
  });
});

describe("computeSkillStatuses", () => {
  it("toy scenario: 12 s advanced tuck planche achieves the node and makes straddle available", () => {
    const statuses = computeSkillStatuses(
      emptyInput({ bestByExercise: { "planche.adv_tuck": { maxHoldSec: 12 } } }),
    );
    expect(statuses["planche.adv_tuck"].status).toBe("achieved");
    expect(statuses["planche.straddle"].status).toBe("available");
    expect(statuses["planche.full"].status).toBe("locked");
  });

  it("acrobatics never auto-achieve regardless of logged data", () => {
    const statuses = computeSkillStatuses(
      emptyInput({ bestByExercise: { "rolls.fwd_roll": { maxRepsPerSet: 99, maxHoldSec: 999 } } }),
    );
    expect(statuses["rolls.fwd_roll"].status).toBe("available"); // no prereqs, but not achieved
  });

  it("attestation is the only unlock path for acrobatics", () => {
    const statuses = computeSkillStatuses(
      emptyInput({
        manual: { "backflip.standing_backtuck": { status: "achieved", attestedDate: "2026-08-01" } },
      }),
    );
    expect(statuses["backflip.standing_backtuck"].status).toBe("achieved");
    expect(statuses["backflip.standing_backtuck"].attestedDate).toBe("2026-08-01");
  });

  it("locomotion time nodes use per-sex thresholds", () => {
    const best = { "run_speed.5k_t2": 2100 }; // ♂ threshold 1888, ♀ 2248
    const female = computeSkillStatuses(emptyInput({ sex: "female", locomotionBest: best }));
    const male = computeSkillStatuses(emptyInput({ sex: "male", locomotionBest: best }));
    expect(female["run_speed.5k_t2"].status).toBe("achieved");
    expect(male["run_speed.5k_t2"].status).not.toBe("achieved");
  });

  it("distance nodes achieve on completion", () => {
    const statuses = computeSkillStatuses(emptyInput({ locomotionBest: { "run_distance.5k": 5000 } }));
    expect(statuses["run_distance.5k"].status).toBe("achieved");
    expect(statuses["run_distance.10k"].status).toBe("available");
  });

  it("e1rm-ratio stunts gate on bodyweight ratio with female overrides", () => {
    // ♂ 80 kg with 155 kg squat e1RM: 1.0x and 1.5x achieved, 2.0x in-progress (needs 160).
    const male = computeSkillStatuses(emptyInput({ e1rmByLift: { squat: 155 } }));
    expect(male["barbell_squat.1_5xbw"].status).toBe("achieved");
    expect(male["barbell_squat.2_0xbw"].status).toBe("in-progress");
    // ♀ 60 kg with 90 kg squat e1RM: override 1.5×BW = 90 → achieved (doc 01 §4.1).
    const female = computeSkillStatuses(emptyInput({ sex: "female", bodyweightKg: 60, e1rmByLift: { squat: 90 } }));
    expect(female["barbell_squat.2_0xbw"].status).toBe("achieved");
  });

  it("weighted-reps criteria require both load and reps", () => {
    // pistol +25% BW at 80 kg -> 20 kg for 5 reps (sets not enforced by the engine).
    const partial = computeSkillStatuses(
      emptyInput({ bestByExercise: { "pistol_squat.weighted_pistol": { maxWeightKg: 20, maxRepsPerSet: 3 } } }),
    );
    expect(partial["pistol_squat.weighted_pistol"].status).not.toBe("achieved");
    const full = computeSkillStatuses(
      emptyInput({ bestByExercise: { "pistol_squat.weighted_pistol": { maxWeightKg: 20, maxRepsPerSet: 5 } } }),
    );
    expect(full["pistol_squat.weighted_pistol"].status).toBe("achieved");
  });

  it("manual marks achieve non-acro nodes too", () => {
    const statuses = computeSkillStatuses(
      emptyInput({ manual: { "one_arm_pullup.pullup10": { status: "achieved", achievedDate: "2026-07-01" } } }),
    );
    expect(statuses["one_arm_pullup.pullup10"].status).toBe("achieved");
    expect(statuses["front_lever.tuck"].status).toBe("available");
  });
});

describe("sectorCompletion", () => {
  it("totals cover every node and count achievements per sector", () => {
    const statuses = computeSkillStatuses(
      emptyInput({ bestByExercise: { "planche.adv_tuck": { maxHoldSec: 12 } } }),
    );
    const completion = sectorCompletion(statuses, skills);
    const total = ALL_SECTORS.reduce((sum, s) => sum + completion[s].total, 0);
    expect(total).toBe(ids.length);
    expect(completion.dips_planche_hs.achieved).toBe(1);
    expect(completion.balance.achieved).toBe(0);
    for (const s of ALL_SECTORS) expect(completion[s].total).toBeGreaterThanOrEqual(8);
  });
});
