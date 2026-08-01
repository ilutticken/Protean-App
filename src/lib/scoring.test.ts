// Tests for src/lib/scoring.ts + data integrity of src/data/norms.ts.
// Expected values transcribed from docs/research/04-assessment-domains.md,
// 06-addendum-1.md §3.2 and 06-addendum-3.md §4.

import { describe, expect, it } from "vitest";
import {
  AXIS_ORDER,
  LIFT_TIER_SCORES,
  legerSpeedForLevel,
  piecewiseScore,
  radar,
  scoreAgainst,
  symmetryFlags,
  vo2Cooper,
  vo2Leger,
} from "./scoring";
import type { AnchorSet, RadarAxis, SymmetryFlag } from "./scoring";
import {
  balanceEcNorms,
  broadJumpNorms,
  cooperDistanceNorms,
  deadHangNorms,
  gripNorms,
  plankNorms,
  pullupNorms,
  pushupNorms,
  radarAnchorsBySex,
  refMaxStrengthAnchorsKg,
  relStrengthAnchorsXbw,
  runTimeNorms,
  sitAndReachNorms,
  tests,
  verticalJumpNorms,
  vo2maxNorms,
  wallSitNorms,
} from "../data/norms";

const axisById = (axes: RadarAxis[], id: string): RadarAxis => {
  const axis = axes.find((a) => a.id === id);
  if (!axis) throw new Error(`axis ${id} missing`);
  return axis;
};

const flagById = (flags: SymmetryFlag[], id: string): SymmetryFlag => {
  const f = flags.find((x) => x.id === id);
  if (!f) throw new Error(`flag ${id} missing`);
  return f;
};

// ---------------------------------------------------------------------------

describe("piecewiseScore (doc 04 §4.2)", () => {
  // Push-up male 20-29 anchors: 16→10, 17→25, 22→60, 29→92, 36→100.
  const raw = [16, 17, 22, 29, 36];
  const scores = [10, 25, 60, 92, 100];

  it("returns anchor scores exactly at anchor raws (endpoints)", () => {
    for (let i = 0; i < raw.length; i++) {
      expect(piecewiseScore(raw, scores, raw[i], "higher")).toBe(scores[i]);
    }
  });

  it("interpolates midpoints exactly", () => {
    expect(piecewiseScore(raw, scores, 19.5, "higher")).toBeCloseTo(42.5, 10); // (25+60)/2
    expect(piecewiseScore(raw, scores, 32.5, "higher")).toBeCloseTo(96, 10); // (92+100)/2
    expect(piecewiseScore([0, 10], [0, 100], 5, "higher")).toBeCloseTo(50, 10);
  });

  it("clamps outside the anchor range", () => {
    expect(piecewiseScore(raw, scores, 0, "higher")).toBe(10);
    expect(piecewiseScore(raw, scores, 999, "higher")).toBe(100);
  });

  it('scores direction "lower" (times) correctly', () => {
    // 5K male finisher tiers (addendum-1 §3.2): 1888s→50, 1678s→70, 1406s→90, 1050s→99.
    const t = runTimeNorms.run_5k.male;
    expect(piecewiseScore(t.raw, t.scores, 1888, "lower")).toBe(50);
    expect(piecewiseScore(t.raw, t.scores, 1050, "lower")).toBe(99);
    expect(piecewiseScore(t.raw, t.scores, 2400, "lower")).toBe(50); // slower than median clamps down
    expect(piecewiseScore(t.raw, t.scores, 900, "lower")).toBe(99); // faster than top 1% clamps up
    expect(piecewiseScore(t.raw, t.scores, 1783, "lower")).toBeCloseTo(60, 10); // midpoint 50↔70
  });

  it("rejects malformed anchors", () => {
    expect(() => piecewiseScore([1, 2], [10], 1, "higher")).toThrow();
    expect(() => piecewiseScore([], [], 1, "higher")).toThrow();
    expect(() => piecewiseScore([1, 1, 2], [10, 20, 30], 1, "higher")).toThrow();
    expect(() => piecewiseScore([3, 2, 1], [10, 20, 30], 1, "higher")).toThrow(); // descending but marked higher
    expect(() => piecewiseScore([1, 2, 3], [10, 20, 30], 1, "lower")).toThrow(); // ascending but marked lower
  });
});

// ---------------------------------------------------------------------------

describe("VO2 helpers (doc 04 §3.10)", () => {
  it("vo2Cooper(2400) = (2400 − 504.9) / 44.73", () => {
    expect(vo2Cooper(2400)).toBe((2400 - 504.9) / 44.73);
    expect(vo2Cooper(2400)).toBeCloseTo(42.3675, 3);
  });

  it("vo2Cooper is zero at the intercept distance", () => {
    expect(vo2Cooper(504.9)).toBeCloseTo(0, 10);
  });

  it("vo2Leger follows 5.857 × speed − 19.458, with level 1 = 8.5 km/h", () => {
    expect(legerSpeedForLevel(1)).toBe(8.5);
    expect(vo2Leger(8.5)).toBe(5.857 * 8.5 - 19.458);
    expect(vo2Leger(legerSpeedForLevel(1))).toBeCloseTo(30.3265, 4);
  });
});

// ---------------------------------------------------------------------------

describe("radar (doc 04 §2, §4.7)", () => {
  const anchorsM = radarAnchorsBySex.male;
  const anchorsF = radarAnchorsBySex.female;

  it("yields all 7 axes with score null when nothing is logged (never fake zeros)", () => {
    const { axes } = radar({ anchors: anchorsM });
    expect(axes.map((a) => a.id)).toEqual(AXIS_ORDER);
    expect(axes).toHaveLength(7);
    for (const axis of axes) {
      expect(axis.score).toBeNull();
      expect(axis.detail).toBe("no data");
    }
  });

  it("scores only the axes that have inputs, leaving the rest null", () => {
    const { axes } = radar({ anchors: anchorsM, pushupMax: 22 });
    expect(axisById(axes, "strength_endurance").score).toBe(60); // M 20-29 "good" anchor
    expect(axisById(axes, "power").score).toBeNull();
    expect(axisById(axes, "aerobic").score).toBeNull();
    expect(axisById(axes, "max_strength").score).toBeNull();
  });

  it("power = mean of vertical and broad jump scores", () => {
    // M vertical 51 cm → 60 (above avg), broad 241 cm → 92 (excellent) → mean 76.
    const { axes } = radar({ anchors: anchorsM, verticalJumpCm: 51, broadJumpCm: 241 });
    expect(axisById(axes, "power").score).toBeCloseTo(76, 10);
  });

  it("max strength scores supplied e1RM aggregates against supplied anchors", () => {
    // Addendum-3 §4.1 @M80: squat Int 132 kg, deadlift Int 155 kg → both exactly 60.
    const { axes } = radar({
      anchors: anchorsM,
      maxStrengthLifts: [
        { id: "squat", e1rmKg: 132, anchorsKg: refMaxStrengthAnchorsKg.male.squat },
        { id: "deadlift", e1rmKg: 155, anchorsKg: refMaxStrengthAnchorsKg.male.deadlift },
      ],
    });
    const axis = axisById(axes, "max_strength");
    expect(axis.score).toBeCloseTo(60, 10);
    expect(axis.detail).toContain("squat");
    expect(axis.detail).toContain("deadlift");
  });

  it("relative strength uses ×BW anchors (addendum-3 §4.3 regression: F deadlift Beg = 0.67)", () => {
    const { axes } = radar({
      anchors: anchorsF,
      relStrengthLifts: [
        { id: "deadlift", ratio: 0.67, anchorsRatio: relStrengthAnchorsXbw.female.deadlift },
      ],
    });
    expect(axisById(axes, "relative_strength").score).toBe(25); // NOT 0.75 (doc01), NOT 0.50 (doc04)
  });

  it("skill & balance mixes the balance test with supplied skill points", () => {
    const only = radar({ anchors: anchorsM, skillPoints: 70 });
    expect(axisById(only.axes, "skill_balance").score).toBe(70);

    const both = radar({ anchors: anchorsM, balanceEcSec: 13, skillPoints: 70 });
    expect(axisById(both.axes, "skill_balance").score).toBeCloseTo((45 + 70) / 2, 10); // 13 s → 45
  });

  it("mobility mixes sit-and-reach with pass/fail screens", () => {
    const checksOnly = radar({ anchors: anchorsM, mobilityChecks: { passed: 3, total: 4 } });
    expect(axisById(checksOnly.axes, "mobility").score).toBe(75);

    const both = radar({
      anchors: anchorsM,
      sitAndReachCm: 24, // M median → 45
      mobilityChecks: { passed: 4, total: 4 },
    });
    expect(axisById(both.axes, "mobility").score).toBeCloseTo((45 + 100) / 2, 10);
  });

  it("aerobic converts Cooper distance to VO2max then scores it", () => {
    const vo2 = (2400 - 504.9) / 44.73; // 42.37 — between M anchors 37→45 and 44→60
    const expected = 45 + ((vo2 - 37) / (44 - 37)) * (60 - 45);
    const { axes } = radar({ anchors: anchorsM, cooperDistanceM: 2400 });
    const axis = axisById(axes, "aerobic");
    expect(axis.score).toBeCloseTo(expected, 10);
    expect(axis.detail).toContain("Cooper");
  });

  it("aerobic uses the best of Cooper and beep-test estimates", () => {
    const cooperVo2 = vo2Cooper(2400);
    const legerVo2 = vo2Leger(legerSpeedForLevel(1)); // 30.3 — worse than Cooper's 42.4
    expect(legerVo2).toBeLessThan(cooperVo2);
    const { axes } = radar({
      anchors: anchorsM,
      cooperDistanceM: 2400,
      legerSpeedKmh: legerSpeedForLevel(1),
    });
    expect(axisById(axes, "aerobic").detail).toContain("Cooper");
  });
});

// ---------------------------------------------------------------------------

describe("symmetryFlags (doc 04 §4.6)", () => {
  it("passes the doc's mean ratios as healthy (squat:dead 0.87 M / 0.84 F)", () => {
    const m = symmetryFlags({ sex: "male", e1rm: { squat: 87, deadlift: 100 } });
    expect(flagById(m, "squat_deadlift").ratio).toBeCloseTo(0.87, 10);
    expect(flagById(m, "squat_deadlift").status).toBe("ok");
    expect(flagById(m, "squat_deadlift").healthy).toEqual([0.83, 0.9]);

    const f = symmetryFlags({ sex: "female", e1rm: { squat: 84, deadlift: 100 } });
    expect(flagById(f, "squat_deadlift").status).toBe("ok");
    expect(flagById(f, "squat_deadlift").healthy).toEqual([0.8, 0.88]);
  });

  it("squat:deadlift warns between healthy band and flag limits, flags beyond them", () => {
    const warn = symmetryFlags({ sex: "male", e1rm: { squat: 95, deadlift: 100 } });
    expect(flagById(warn, "squat_deadlift").status).toBe("warn"); // 0.95 ∈ (0.90, 1.00]

    const low = symmetryFlags({ sex: "male", e1rm: { squat: 70, deadlift: 100 } });
    expect(flagById(low, "squat_deadlift").status).toBe("flag"); // <0.75

    const high = symmetryFlags({ sex: "male", e1rm: { squat: 101, deadlift: 100 } });
    expect(flagById(high, "squat_deadlift").status).toBe("flag"); // >1.00
  });

  it("bench:deadlift targets 0.65 M / 0.57 F with ±0.12 flag band", () => {
    const ok = symmetryFlags({ sex: "male", e1rm: { bench: 65, deadlift: 100 } });
    expect(flagById(ok, "bench_deadlift").status).toBe("ok");

    const fOk = symmetryFlags({ sex: "female", e1rm: { bench: 57, deadlift: 100 } });
    expect(flagById(fOk, "bench_deadlift").status).toBe("ok");

    const bad = symmetryFlags({ sex: "male", e1rm: { bench: 40, deadlift: 100 } });
    expect(flagById(bad, "bench_deadlift").status).toBe("flag"); // 0.40 < 0.53
  });

  it("H:Q flags below 0.60, ok at and above it", () => {
    const boundary = symmetryFlags({ sex: "male", e1rm: { hamstring: 60, quad: 100 } });
    expect(flagById(boundary, "hq").status).toBe("ok");

    const ok = symmetryFlags({ sex: "male", e1rm: { hamstring: 65, quad: 100 } });
    expect(flagById(ok, "hq").status).toBe("ok");

    const bad = symmetryFlags({ sex: "female", e1rm: { hamstring: 55, quad: 100 } });
    expect(flagById(bad, "hq").status).toBe("flag");
  });

  it("LSI: ≥0.90 ok, <0.90 warn, <0.85 flag; symmetric in left/right", () => {
    const ok = symmetryFlags({ sex: "male", unilateral: [{ id: "grip", left: 95, right: 100 }] });
    expect(flagById(ok, "lsi_grip").status).toBe("ok");

    const warn = symmetryFlags({ sex: "male", unilateral: [{ id: "grip", left: 88, right: 100 }] });
    expect(flagById(warn, "lsi_grip").status).toBe("warn");

    const act = symmetryFlags({ sex: "male", unilateral: [{ id: "grip", left: 100, right: 80 }] });
    expect(flagById(act, "lsi_grip").ratio).toBeCloseTo(0.8, 10); // order-independent min/max
    expect(flagById(act, "lsi_grip").status).toBe("flag");
  });

  it("push:pull (bench:row) healthy 1.0–1.1, flags when row < 85% of bench", () => {
    const ok = symmetryFlags({ sex: "male", e1rm: { bench: 100, row: 95 } });
    expect(flagById(ok, "push_pull").status).toBe("ok"); // 1.05

    const warn = symmetryFlags({ sex: "male", e1rm: { bench: 100, row: 87 } });
    expect(flagById(warn, "push_pull").status).toBe("warn"); // 1.149 < 1/0.85

    const bad = symmetryFlags({ sex: "male", e1rm: { bench: 100, row: 80 } });
    expect(flagById(bad, "push_pull").status).toBe("flag"); // 1.25 > 1/0.85
  });

  it("pull-up(+BW):dip(+BW) healthy 0.85–1.05, flags below 0.80", () => {
    const ok = symmetryFlags({ sex: "male", e1rm: { pullupPlusBwKg: 95, dipPlusBwKg: 100 } });
    expect(flagById(ok, "pullup_dip").status).toBe("ok");

    const bad = symmetryFlags({ sex: "male", e1rm: { pullupPlusBwKg: 75, dipPlusBwKg: 100 } });
    expect(flagById(bad, "pullup_dip").status).toBe("flag");
  });

  it("emits flags only for ratios whose inputs are present", () => {
    const flags = symmetryFlags({ sex: "male", e1rm: { squat: 87, deadlift: 100 } });
    expect(flags.map((f) => f.id)).toEqual(["squat_deadlift"]);
    expect(symmetryFlags({ sex: "male" })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("norms data integrity", () => {
  const sexes = ["male", "female"] as const;
  const allSets: Array<[string, AnchorSet]> = [];
  for (const sex of sexes) {
    for (const [bracket, set] of Object.entries(pushupNorms[sex]) as Array<[string, AnchorSet]>) {
      allSets.push([`pushup ${sex} ${bracket}`, set]);
    }
    allSets.push(
      [`pullup ${sex}`, pullupNorms[sex]],
      [`plank ${sex}`, plankNorms[sex]],
      [`deadHang ${sex}`, deadHangNorms[sex]],
      [`wallSit ${sex}`, wallSitNorms[sex]],
      [`verticalJump ${sex}`, verticalJumpNorms[sex]],
      [`broadJump ${sex}`, broadJumpNorms[sex]],
      [`grip ${sex}`, gripNorms[sex]],
      [`sitAndReach ${sex}`, sitAndReachNorms[sex]],
      [`balanceEc ${sex}`, balanceEcNorms[sex]],
      [`cooperDistance ${sex}`, cooperDistanceNorms[sex]],
      [`vo2max ${sex}`, vo2maxNorms[sex]],
    );
    for (const [dist, bySex] of Object.entries(runTimeNorms)) {
      allSets.push([`${dist} ${sex}`, bySex[sex]]);
    }
    for (const bundle of Object.values(radarAnchorsBySex[sex])) {
      allSets.push([`radarBundle ${sex}`, bundle]);
    }
  }

  it("every anchor array is strictly monotonic and same length as its scores", () => {
    expect(allSets.length).toBeGreaterThan(0);
    for (const [name, set] of allSets) {
      expect(set.raw.length, name).toBeGreaterThan(0);
      expect(set.raw.length, name).toBe(set.scores.length);
      for (let i = 1; i < set.scores.length; i++) {
        expect(set.scores[i] > set.scores[i - 1], `${name} scores ascend`).toBe(true);
      }
      for (let i = 1; i < set.raw.length; i++) {
        if (set.direction === "higher") {
          expect(set.raw[i] > set.raw[i - 1], `${name} raw ascends`).toBe(true);
        } else {
          expect(set.raw[i] < set.raw[i - 1], `${name} raw descends`).toBe(true);
        }
      }
    }
  });

  it("every anchor maps exactly to its anchor score through piecewiseScore", () => {
    for (const [name, set] of allSets) {
      for (let i = 0; i < set.raw.length; i++) {
        expect(scoreAgainst(set, set.raw[i]), `${name}[${i}]`).toBe(set.scores[i]);
      }
    }
  });

  it("lift anchor arrays match LIFT_TIER_SCORES length and ascend strictly", () => {
    for (const sex of sexes) {
      for (const [lift, arr] of Object.entries(refMaxStrengthAnchorsKg[sex])) {
        expect(arr.length, `refMax ${sex} ${lift}`).toBe(LIFT_TIER_SCORES.length);
        for (let i = 1; i < arr.length; i++) {
          expect(arr[i] > arr[i - 1], `refMax ${sex} ${lift} ascends`).toBe(true);
        }
      }
      for (const [lift, arr] of Object.entries(relStrengthAnchorsXbw[sex])) {
        expect(arr.length, `relXbw ${sex} ${lift}`).toBe(LIFT_TIER_SCORES.length);
        for (let i = 1; i < arr.length; i++) {
          expect(arr[i] > arr[i - 1], `relXbw ${sex} ${lift} ascends`).toBe(true);
        }
      }
    }
  });

  it("test registry ids are unique, domains valid, pseudo-tests marked computed", () => {
    const ids = tests.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of tests) {
      expect(AXIS_ORDER, t.id).toContain(t.domain);
      expect(t.direction === "higher" || t.direction === "lower", t.id).toBe(true);
      expect(t.entryHint.length, t.id).toBeGreaterThan(0);
    }
    for (const id of ["pushup_max", "pullup_max", "plank_hold", "dead_hang", "wall_sit", "vertical_jump", "broad_jump", "grip_strength", "sit_and_reach", "balance_ec_single_leg", "cooper_12min"]) {
      expect(ids).toContain(id);
    }
    const computed = tests.filter((t) => t.computed);
    expect(computed.map((t) => t.id).sort()).toEqual(
      ["deadlift_e1rm", "squat_e1rm", "weighted_dip_e1rm", "weighted_pullup_e1rm"].sort(),
    );
  });

  it("male and female bundles differ where the docs are sex-split", () => {
    expect(radarAnchorsBySex.male.pushup.raw).not.toEqual(radarAnchorsBySex.female.pushup.raw);
    expect(radarAnchorsBySex.male.vo2max.raw).not.toEqual(radarAnchorsBySex.female.vo2max.raw);
    // Balance EC is gender-independent (Springer 2007) — intentionally shared.
    expect(radarAnchorsBySex.male.balanceEc.raw).toEqual(radarAnchorsBySex.female.balanceEc.raw);
  });
});
