// Cross-sector integrity sweep for the nine independently-authored sector extensions in
// src/data/skills-ext/*.ts, merged into the tree by buildSkills() in src/data/skills.ts.
//
// Each extension was written in isolation against a shared, mutating base, so the failure
// modes that matter are the ones no single author could see: two authors claiming the same
// node id, a prereq that resolves in one file but not after the merge, and — the subtle one —
// cross-sector prereq edges INVERTING because buildSkills normalizes rings per sector
// (subtracting each sector's minimum), so one sector's deep on-ramp silently shifts its whole
// wedge past another's. Everything here is asserted on the POST-normalization `skills` map,
// which is what the UI and the engine actually consume.

import { describe, expect, it } from "vitest";
import type { Sector, SkillNode } from "../lib/types";
import { skills } from "./skills";
import { pushupExt } from "./skills-ext/pushup";
import { dipsPlancheHsExt } from "./skills-ext/dips_planche_hs";
import { pullLeversExt } from "./skills-ext/pull_levers";
import { backChainExt } from "./skills-ext/back_chain";
import { posteriorExt } from "./skills-ext/posterior";
import { squatExt } from "./skills-ext/squat";
import { coreExt } from "./skills-ext/core";
import { balanceExt } from "./skills-ext/balance";
import { runMartialExt } from "./skills-ext/run_martial";

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

/** The sector each extension FILE was authored for — the ground truth for check (d). */
const EXT_BY_SECTOR: Record<Sector, { nodes: SkillNode[] }> = {
  pushup: pushupExt,
  dips_planche_hs: dipsPlancheHsExt,
  pull_levers: pullLeversExt,
  back_chain: backChainExt,
  posterior: posteriorExt,
  squat: squatExt,
  core: coreExt,
  balance: balanceExt,
  run_martial: runMartialExt,
};

const extEntries = ALL_SECTORS.flatMap((sector) =>
  EXT_BY_SECTOR[sector].nodes.map((node) => ({ sector, node })),
);
const extIds = new Set(extEntries.map((e) => e.node.id));
const ids = Object.keys(skills);

// ---------------------------------------------------------------------------
// (a) id uniqueness

describe("skills-ext: node id uniqueness", () => {
  it("no id is claimed by two sector extensions", () => {
    // buildSkills() throws on a collision, so a clash between an extension and a
    // skills.ts core node aborts module import before this file runs. This test names
    // the offender instead of leaving a bare "duplicate skill id" at import time.
    const seen = new Map<string, Sector>();
    const clashes: string[] = [];
    for (const { sector, node } of extEntries) {
      const prev = seen.get(node.id);
      if (prev !== undefined) clashes.push(`${node.id}: ${prev} + ${sector}`);
      else seen.set(node.id, sector);
    }
    expect(clashes).toEqual([]);
  });

  it("every extension node survived the merge into the tree", () => {
    const missing = [...extIds].filter((id) => !(id in skills));
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (b) + (c) prereq resolution and ring ordering, AFTER normalization

describe("skills-ext: prereq graph after ring normalization", () => {
  it("every prereq id resolves to a node in the merged tree", () => {
    const dangling: string[] = [];
    for (const id of ids) {
      for (const p of skills[id].prereqs) if (!(p in skills)) dangling.push(`${id} -> ${p}`);
    }
    expect(dangling).toEqual([]);
  });

  it("every prereq sits on a strictly smaller ring than its dependent", () => {
    // buildSkills subtracts each sector's minimum ring, so a sector that adds a deeper
    // on-ramp shifts its whole wedge outward. Cross-sector edges are the ones that break.
    const violations: string[] = [];
    for (const id of ids) {
      const dep = skills[id];
      for (const p of dep.prereqs) {
        const pre = skills[p];
        if (!pre || pre.ring < dep.ring) continue;
        const kind = pre.sector === dep.sector ? "same-sector" : "CROSS-SECTOR";
        violations.push(
          `${kind}: ${p} (${pre.sector} ring ${pre.ring}) must be < ${id} (${dep.sector} ring ${dep.ring})`,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (d) sector field matches the authoring file

describe("skills-ext: sector attribution", () => {
  it("every node's sector field matches the file it was authored in", () => {
    const mismatches = extEntries
      .filter(({ sector, node }) => node.sector !== sector)
      .map(({ sector, node }) => `${node.id}: authored in ${sector}.ts but sector="${node.sector}"`);
    expect(mismatches).toEqual([]);
  });

  it("the merge did not move any node between sectors", () => {
    const moved = extEntries
      .filter(({ node }) => skills[node.id] && skills[node.id].sector !== node.sector)
      .map(({ node }) => `${node.id}: authored ${node.sector}, merged ${skills[node.id].sector}`);
    expect(moved).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (e) balance sector is attested-only

describe("skills-ext: balance sector criteria", () => {
  it("every balance node uses an attested criterion", () => {
    // addendum-1 §0 NO_AUTO_UNLOCK: the app cannot verify a coach, spotter or surface,
    // so acrobatics must never auto-achieve from logged sets.
    const wrong = ids
      .filter((id) => skills[id].sector === "balance" && skills[id].criterion.kind !== "attested")
      .map((id) => `${id}: ${skills[id].criterion.kind}`);
    expect(wrong).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (f) every sector has a real entry point

describe("skills-ext: sector entry points", () => {
  it("every sector has at least one node at normalized ring 0", () => {
    const bySector = new Map<Sector, number>(ALL_SECTORS.map((s) => [s, 0]));
    for (const id of ids) {
      if (skills[id].ring === 0) bySector.set(skills[id].sector, (bySector.get(skills[id].sector) ?? 0) + 1);
    }
    for (const s of ALL_SECTORS) {
      expect(bySector.get(s), `sector ${s} has no ring-0 entry point`).toBeGreaterThan(0);
    }
  });

  it("every ring-0 node is genuinely startable (no prereqs)", () => {
    // Normalization makes the lowest ring 0, so a ring-0 node with prereqs would mean a
    // prereq on a NEGATIVE ring — impossible — or a cross-sector prereq the user cannot
    // reach without leaving the sector. Either way it is not an entry point.
    const gated = ids
      .filter((id) => skills[id].ring === 0 && skills[id].prereqs.length > 0)
      .map((id) => `${id} (${skills[id].sector}) -> ${skills[id].prereqs.join(", ")}`);
    expect(gated).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (g) names must fit the hex map

/**
 * Replica of labelLines() in src/ui/components/StuntMap.tsx: names are packed into at most
 * TWO lines of 15 characters. Anything that does not fit is DROPPED WITHOUT an ellipsis,
 * so an over-long name is not merely ugly — it silently renames the node on the map.
 */
const MAX_LINE = 15;
const MAX_NAME = 26;

function labelLines(name: string): string[] {
  if (name.length <= MAX_LINE) return [name];
  const words = name.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= MAX_LINE) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
    if (lines.length === 2) break;
  }
  if (lines.length < 2 && cur) lines.push(cur);
  return lines.slice(0, 2);
}

const rendersFully = (name: string): boolean => labelLines(name).join(" ") === name;

/**
 * Pre-existing over-long names in skills.ts, which the sector authors could not edit.
 * The assertions below are SUBSET checks, so shortening any of these is always allowed —
 * only ADDING a new offender fails. Do not extend this list to excuse a new node.
 */
const LEGACY_LONG_NAMES = new Set([
  "one_arm_pushup.elevated_archer", "one_arm_pushup.oap_narrow", "handstand.wall_hs",
  "handstand.wall_60s", "handstand.weight_shift", "handstand.free_3s", "handstand.free_30s",
  "handstand.free_60s", "dip.ring_mu_support", "maltese.band", "one_arm_pullup.uneven_pullup",
  "front_lever.fl_pullup", "muscle_up_bar.explosive_pullup", "muscle_up_bar.assisted_mu",
  "iron_cross.box_pullouts", "iron_cross.band_pullouts", "bridge.short_bridge",
  "bridge.gecko_bridge", "bridge.assisted_stand2stand", "nordic_curl.bridge_slr",
  "pistol_squat.split_squat", "pistol_squat.assisted_pistol", "l_sit_manna.one_leg_l",
  "back_handspring.bhs_spotted", "backflip.elevated_jumpback", "backflip.tramp_backtuck",
  "backflip.raised_to_pit", "backflip.pit_backtuck", "backflip.floor_spotted",
  "frontflip.dive_roll_block", "frontflip.punch_to_resi_seated", "frontflip.resi_spotted",
  "frontflip.floor_fronttuck", "run_speed.half_t2", "run_speed.half_t3", "run_speed.half_t4",
  "run_speed.half_t5", "swim.competence_100m", "swim.400m", "swim.750m", "swim.3800m",
]);

describe("skills-ext: node names fit the hex map", () => {
  it("every extension node name is <= 26 characters", () => {
    const tooLong = extEntries
      .filter(({ node }) => node.name.length > MAX_NAME)
      .map(({ node }) => `${node.id}: ${node.name.length} chars — "${node.name}"`);
    expect(tooLong).toEqual([]);
  });

  it("every extension node name renders on the map without losing words", () => {
    // <=26 chars is necessary but not sufficient: "Pike Compression Lift" is 21 chars and
    // still packs as "Pike" / "Compression", dropping "Lift" with no ellipsis.
    const clipped = extEntries
      .filter(({ node }) => !rendersFully(node.name))
      .map(({ node }) => `${node.id}: "${node.name}" renders as "${labelLines(node.name).join(" ")}"`);
    expect(clipped).toEqual([]);
  });

  it("does not add new over-long names outside the pinned skills.ts legacy set", () => {
    const offenders = ids.filter(
      (id) => !extIds.has(id) && (skills[id].name.length > MAX_NAME || !rendersFully(skills[id].name)),
    );
    expect(offenders.filter((id) => !LEGACY_LONG_NAMES.has(id))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Balance / layout budget — the hex map lays each sector's ring out along an arc.

describe("skills-ext: sector balance", () => {
  it("no (sector, ring) bucket is cramped (> 10 nodes on one arc)", () => {
    const buckets = new Map<string, number>();
    for (const id of ids) {
      const k = `${skills[id].sector} ring ${skills[id].ring}`;
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const over = [...buckets.entries()].filter(([, n]) => n > 10).map(([k, n]) => `${k}: ${n} nodes`);
    expect(over).toEqual([]);
  });

  it("every sector carries a substantial progression (>= 25 nodes)", () => {
    const counts = new Map<Sector, number>(ALL_SECTORS.map((s) => [s, 0]));
    for (const id of ids) counts.set(skills[id].sector, (counts.get(skills[id].sector) ?? 0) + 1);
    const thin = ALL_SECTORS.filter((s) => (counts.get(s) ?? 0) < 25).map((s) => `${s}: ${counts.get(s)}`);
    expect(thin).toEqual([]);
  });
});
