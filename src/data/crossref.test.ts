// Integration cross-reference checks across the data + algorithm layer.
// Verifies that the five independently-authored modules (seed-plan, exercises, skills,
// standards, skilltree) actually agree on ids and enums:
//  1. every exercise id the seed references (chain steps, opts, warmup, mobility) resolves
//     in the exercise catalog (addendum-2 §3 ids are canonical);
//  2. every skill prereq resolves to a skill node;
//  3. every standardsKeyByExercise value has a standards table (both sexes, non-empty rows);
//  4. every Sector enum value has at least one skill node;
//  5. the skill tree's doc-01-mapped namespaces (planche.*, one_arm_pullup.*, ...) share at
//     least one id with the seed, so logging auto-feeds the tree (addendum-2 §4 mapping);
// plus consistency checks on the per-sex override tables exported by skills.ts.

import { describe, expect, it } from "vitest";
import type { Sector, Slot } from "../lib/types";
import { seedPlan } from "./seed-plan";
import { exercises, standardsKeyByExercise } from "./exercises";
import { femaleBwRatioOverride, locomotionTimeBySex, skills } from "./skills";
import { STRENGTH_STANDARDS } from "./standards";

const allSlots: Slot[] = [
  ...seedPlan.days.legs,
  ...seedPlan.days.pull,
  ...seedPlan.days.push,
  ...seedPlan.days.fullbody,
];

/** Every exercise id referenced anywhere in the seed. */
const seedExerciseIds = (): Set<string> => {
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

/** The 9 hex-map sectors — keep in sync with the Sector union in src/lib/types.ts. */
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

const namespaceOf = (id: string): string => id.slice(0, id.indexOf("."));

describe("cross-reference: seed plan -> exercise catalog", () => {
  it("resolves every ex id in chain steps, opts, warmup, and mobility", () => {
    const missing = [...seedExerciseIds()].filter((id) => !(id in exercises));
    expect(missing).toEqual([]);
  });

  it("every chain step carries an ex or a non-empty opts list (each opt with an ex)", () => {
    for (const slot of allSlots) {
      for (const step of slot.chain) {
        if (step.ex === undefined) {
          expect(step.opts, `${slot.id} step "${step.n}" has neither ex nor opts`).toBeDefined();
          expect(step.opts!.length).toBeGreaterThan(0);
        }
        for (const opt of step.opts ?? []) {
          expect(typeof opt.ex, `${slot.id} opt "${opt.n}" missing ex`).toBe("string");
        }
      }
    }
  });
});

describe("cross-reference: skill tree internal consistency", () => {
  it("resolves every prereq to an existing skill node", () => {
    const dangling: string[] = [];
    for (const id in skills) {
      for (const p of skills[id].prereqs) {
        if (!(p in skills)) dangling.push(`${id} -> ${p}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("has at least one skill node in every sector", () => {
    const bySector = new Map<Sector, number>(ALL_SECTORS.map((s) => [s, 0]));
    for (const id in skills) {
      const s = skills[id].sector;
      expect(ALL_SECTORS, `unknown sector "${s}" on ${id}`).toContain(s);
      bySector.set(s, (bySector.get(s) ?? 0) + 1);
    }
    for (const sector of ALL_SECTORS) {
      expect(bySector.get(sector), `sector ${sector} has no skill nodes`).toBeGreaterThan(0);
    }
  });

  it("keys locomotionTimeBySex by existing time-criterion nodes", () => {
    for (const id in locomotionTimeBySex) {
      expect(skills[id], `locomotionTimeBySex key ${id} is not a skill node`).toBeDefined();
      expect(skills[id].criterion.kind).toBe("time");
      // Node criterion stores the MALE threshold (skills.ts convention).
      const c = skills[id].criterion;
      if (c.kind === "time") expect(c.seconds).toBe(locomotionTimeBySex[id].male);
    }
  });

  it("keys femaleBwRatioOverride by existing ratio-criterion nodes", () => {
    for (const id in femaleBwRatioOverride) {
      expect(skills[id], `femaleBwRatioOverride key ${id} is not a skill node`).toBeDefined();
      expect(["weighted-reps", "e1rm-ratio"]).toContain(skills[id].criterion.kind);
    }
  });

  it("uses a fixed set of e1rm lift ids (the UI must supply e1rmByLift with these keys)", () => {
    const liftIds = new Set<string>();
    for (const id in skills) {
      const c = skills[id].criterion;
      if (c.kind === "e1rm-ratio") liftIds.add(c.liftId);
    }
    // Olympic lifts were REMOVED from this set 2026-08-04: rep-based e1RM formulas do
    // not apply to technique-limited singles, and no producer ever emitted those ids —
    // the nodes were dead. They are weighted-reps now, fed by the quick lift-log.
    expect([...liftIds].sort()).toEqual(["bench", "deadlift", "ohp", "squat"].sort());
  });
});

describe("cross-reference: standards keys", () => {
  it("maps every standardsKeyByExercise key to a catalog exercise", () => {
    const missing = Object.keys(standardsKeyByExercise).filter((id) => !(id in exercises));
    expect(missing).toEqual([]);
  });

  it("maps every standardsKeyByExercise value to a standards table with rows for both sexes", () => {
    for (const [exId, liftKey] of Object.entries(standardsKeyByExercise)) {
      const table = STRENGTH_STANDARDS[liftKey];
      expect(table, `${exId} -> ${liftKey} has no standards table`).toBeDefined();
      expect(table.rows.male.length, `${liftKey} male rows empty`).toBeGreaterThan(0);
      expect(table.rows.female.length, `${liftKey} female rows empty`).toBeGreaterThan(0);
    }
  });
});

describe("cross-reference: skill tree <-> seed exercise-id overlap (addendum-2 §4)", () => {
  // Namespaces where doc 01 / addendum-2 §4 map seed exercise ids onto skill node ids,
  // so a logged set auto-feeds the corresponding node. Each must actually overlap.
  const MAPPED_NAMESPACES = [
    "planche",
    "one_arm_pullup",
    "one_arm_pushup",
    "front_lever",
    "dip",
    "hspu",
    "pistol_squat",
    "rope_climb",
    "muscle_up_bar",
    "bridge",
    "core",
    "hinge",
    "pull",
    "push",
  ];

  it("has a non-empty seed/tree id intersection per mapped namespace", () => {
    const seedIds = seedExerciseIds();
    const skillIds = new Set(Object.keys(skills));
    for (const ns of MAPPED_NAMESPACES) {
      const overlap = [...seedIds].filter((id) => namespaceOf(id) === ns && skillIds.has(id));
      expect(overlap.length, `namespace "${ns}" has no seed/tree overlap`).toBeGreaterThan(0);
    }
  });

  it("every shared id agrees on sector between catalog and skill tree, or is a documented exception", () => {
    // Sector comes from the slot in the catalog (addendum-2 rule) but from the doc-01 line in
    // the tree; ids where the two legitimately differ are listed with their reason.
    const knownDifferent: Record<string, string> = {
      // Catalog follows the "exercise takes its slot's sector" rule (legs-07 is a posterior
      // slot); the tree's bridge LINE lives in back_chain per doc 04 §1.2 (as does the
      // catalog's own bridge.full_bridge, which comes from mob-10 and has no slot sector).
      "bridge.glute_bridge": "slot sector (posterior) vs doc-04 bridge line sector (back_chain)",
      // full-04 and push-08 are balance SLOTS, so the catalog files their exercises under
      // balance — but locked decision #10 makes every balance node attestation-only, since
      // that sector is acrobatics. Rotational bag/plate work and a loaded crawl are not
      // acrobatics and must credit automatically from a logged set, so the tree files them
      // by movement instead: rotation -> core, loaded locomotion -> run_martial.
      "power.halo": "slot sector (balance) vs rotational core line (core)",
      "power.kb_halo": "slot sector (balance) vs rotational core line (core)",
      "power.gama_cast": "slot sector (balance) vs rotational core line (core)",
      "power.bulgarian_bag_spin": "slot sector (balance) vs rotational core line (core)",
      "cond.sandbag_tug_crawl": "slot sector (balance) vs loaded-carry line (run_martial)",
    };
    const mismatches: string[] = [];
    for (const id in skills) {
      const ex = exercises[id];
      if (!ex) continue;
      if (ex.sector !== skills[id].sector && knownDifferent[id] === undefined) {
        mismatches.push(`${id}: catalog=${ex.sector} tree=${skills[id].sector}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
