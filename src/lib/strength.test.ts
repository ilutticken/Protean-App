// Worked-example tests transcribed from docs/research/02-strength-standards.md
// (§3.3–§3.6 verified values) and docs/research/06-addendum-3.md §7 (reference-
// implementation output). Printed values are asserted at printed precision.

import { describe, expect, it } from "vitest";
import {
  FOSTER_AGE_FACTORS,
  MCCULLOCH_AGE_FACTORS,
  MCCULLOCH_CAP,
  STRENGTH_STANDARDS,
} from "../data/standards";
import {
  bwExerciseLoad,
  dots,
  e1rm,
  ipfGl,
  relativeStrength,
  standardsLevel,
  wilks,
  wilks2020,
} from "./strength";

// ---------------------------------------------------------------------------

describe("e1rm — canonical StrengthLevel hybrid (addendum-3 §2.2)", () => {
  it("is exact at a true single: Brzycki at r=1 is w·36/36 = w (kills the false-unlock bug)", () => {
    expect(e1rm(80, 1).value).toBe(80);
    expect(e1rm(100, 1).value).toBe(100);
    expect(e1rm(156, 1).value).toBe(156); // pure Epley would say 161.2 and falsely unlock 2×BW @ 80 kg
  });

  it("reproduces the addendum-3 §7 printed values at w=100", () => {
    expect(e1rm(100, 3).value).toBeCloseTo(105.89, 2);
    expect(e1rm(100, 5).value).toBeCloseTo(112.51, 2);
    expect(e1rm(100, 8).value).toBeCloseTo(124.16, 2); // pure Brzycki boundary
    expect(e1rm(100, 9).value).toBeCloseTo(129.3, 2); // 50/50 blend
    expect(e1rm(100, 10).value).toBeCloseTo(133.33, 2); // == Epley exactly
    expect(e1rm(100, 15).value).toBeCloseTo(150.0, 2); // == Epley, flagged
  });

  it("blend endpoints equal pure Brzycki at r=8 and pure Epley at r=10 (bit-exact)", () => {
    expect(e1rm(100, 8).value).toBe(100 / (1.0278 - 0.0278 * 8));
    expect(e1rm(100, 10).value).toBe(100 * (1 + 10 / 30));
  });

  it("is continuous at the r=8 branch boundary", () => {
    const below = e1rm(100, 7.999).value as number;
    const at = e1rm(100, 8).value as number;
    expect(Math.abs(below - at)).toBeLessThan(0.01);
  });

  it("applies the single rep cap: full ≤10, flagged 11–15, capacity ≥16 (addendum-3 §2.4)", () => {
    expect(e1rm(100, 10).confidence).toBe("full");
    expect(e1rm(100, 11).confidence).toBe("flagged");
    expect(e1rm(100, 15).confidence).toBe("flagged");
    expect(e1rm(100, 16)).toEqual({ value: null, confidence: "capacity" });
    expect(e1rm(100, 35)).toEqual({ value: null, confidence: "capacity" }); // 35-rep tier: endurance only
    expect(() => e1rm(100, 16)).not.toThrow();
  });

  it("rejects non-positive rep counts", () => {
    expect(() => e1rm(100, 0)).toThrow(RangeError);
    expect(() => e1rm(100, -3)).toThrow(RangeError);
  });

  it("never deviates from pure Epley by more than ~3.9% over r=1..10 (addendum-3 §2.3)", () => {
    for (let r = 1; r <= 10; r++) {
      const canon = e1rm(100, r).value as number;
      const epley = 100 * (1 + r / 30);
      expect(Math.abs(epley - canon) / canon).toBeLessThanOrEqual(0.0389);
    }
  });
});

// ---------------------------------------------------------------------------

describe("bwExerciseLoad — effective load conversion (doc 02 §5.2, addendum-3 §7)", () => {
  it("push-up: 0.750 × 70 kg = 52.50 → e1RM(·, 8) = 65.19", () => {
    expect(bwExerciseLoad(70, 0, 0.75)).toBe(52.5);
    const v = e1rm(52.5, 8).value as number;
    expect(Number(v.toFixed(2))).toBe(65.19);
  });

  it("push-up: 0.750 × 80 kg = 60.00 → e1RM(·, 8) = 74.50", () => {
    expect(bwExerciseLoad(80, 0, 0.75)).toBe(60);
    const v = e1rm(60, 8).value as number;
    expect(Number(v.toFixed(2))).toBe(74.5);
  });

  it("pull-up 80 kg + 20 kg added at 0.956 = 96.48; pistol 60 kg at 0.839 = 50.34", () => {
    expect(bwExerciseLoad(80, 20, 0.956)).toBeCloseTo(96.48, 2);
    expect(bwExerciseLoad(60, 0, 0.839)).toBeCloseTo(50.34, 2);
  });

  it("regression guard against doc-04's 0.64 push-up constant: ratio ≈ 1.1725 (the 17.2% bug)", () => {
    const canonical = e1rm(bwExerciseLoad(80, 0, 0.75), 8).value as number;
    const doc04 = e1rm(bwExerciseLoad(80, 0, 0.64), 8).value as number;
    expect(canonical / doc04).toBeCloseTo(1.1725, 2);
  });
});

// ---------------------------------------------------------------------------

describe("standardsLevel — log-log lookup (addendum-3 §4.1/§4.2)", () => {
  it("round-trips table cells exactly at table bodyweights", () => {
    expect(standardsLevel("back_squat", "male", 80, 0).interpolatedThresholds).toEqual([
      75, 101, 132, 168, 206,
    ]);
    expect(standardsLevel("back_squat", "female", 60, 0).interpolatedThresholds).toEqual([
      32, 49, 72, 99, 129,
    ]);
    // edge rows
    expect(standardsLevel("back_squat", "male", 60, 0).interpolatedThresholds).toEqual([
      49, 71, 98, 129, 162,
    ]);
    expect(standardsLevel("deadlift", "male", 90, 0).interpolatedThresholds).toEqual([
      102, 134, 172, 215, 260,
    ]);
  });

  it("M 80 kg squat intermediate = 132 kg = 1.650 ×BW; F 60 kg = 72 kg = 1.200 ×BW", () => {
    const m = standardsLevel("back_squat", "male", 80, 0).interpolatedThresholds[2];
    expect(m).toBe(132);
    expect(relativeStrength(m, 80)).toBeCloseTo(1.65, 3);
    const f = standardsLevel("back_squat", "female", 60, 0).interpolatedThresholds[2];
    expect(f).toBe(72);
    expect(relativeStrength(f, 60)).toBeCloseTo(1.2, 3);
  });

  it("interpolated row: M 75 kg squat intermediate ≈ 124.0 kg (addendum-3 §7)", () => {
    const v = standardsLevel("back_squat", "male", 75, 0).interpolatedThresholds[2];
    expect(v).toBeCloseTo(124.0, 1);
  });

  it("F 60 kg deadlift beginner = 40 kg = 0.667 ×BW — NOT 0.75 (doc01), NOT 0.50 (doc04)", () => {
    const v = standardsLevel("deadlift", "female", 60, 0).interpolatedThresholds[0];
    expect(v).toBe(40);
    expect(relativeStrength(v, 60)).toBeCloseTo(0.667, 3);
  });

  it("doc01/doc04 regression guards: M 80 squat intermediate is neither 1.75 nor 1.50 ×BW", () => {
    const xbw = standardsLevel("back_squat", "male", 80, 0).interpolatedThresholds[2] / 80;
    expect(Math.abs(xbw - 1.75)).toBeGreaterThan(0.05);
    expect(Math.abs(xbw - 1.5)).toBeGreaterThan(0.05);
  });

  it("interpolates monotonically between bodyweight rows (every level)", () => {
    const bws = [60, 62.5, 65, 67.5, 70, 72.5, 75, 77.5, 80, 82.5, 85, 87.5, 90];
    for (let level = 0; level < 5; level++) {
      let prev = -Infinity;
      for (const bw of bws) {
        const v = standardsLevel("back_squat", "male", bw, 0).interpolatedThresholds[level];
        expect(v).toBeGreaterThan(prev);
        prev = v;
      }
    }
  });

  it("negative/assisted cells take the linear branch and never NaN (addendum-3 §4.2)", () => {
    const t = standardsLevel("weighted_pullup", "female", 55, 0).interpolatedThresholds;
    for (const v of t) expect(Number.isFinite(v)).toBe(true);
    expect(t[0]).toBe(-15); // linear midpoint of -14 (50 kg) and -16 (60 kg)
    expect(t[1]).toBe(-4); // linear on -4/-4
    expect(t[2]).toBeGreaterThan(8); // positive cells 8→9 stay log-log
    expect(t[2]).toBeLessThan(9);
    expect(t[0]).toBeLessThan(0); // negative branch reached without calling ln()
  });

  it("zero cells also take the linear branch (F weighted dip novice)", () => {
    const t = standardsLevel("weighted_dip", "female", 65, 0).interpolatedThresholds;
    for (const v of t) expect(Number.isFinite(v)).toBe(true);
    expect(t[1]).toBe(0); // 0 (60 kg) → 0 (70 kg)
    expect(t[0]).toBe(-15.5); // -15 → -16 linear
  });

  it("classifies levels with percentOfNext (including the negative added-weight domain)", () => {
    const atThreshold = standardsLevel("back_squat", "male", 80, 132);
    expect(atThreshold.level).toBe(2);
    expect(atThreshold.name).toBe("intermediate");
    expect(atThreshold.percentOfNext).toBe(0);

    const midway = standardsLevel("back_squat", "male", 80, 150);
    expect(midway.level).toBe(2);
    expect(midway.percentOfNext).toBeCloseTo(0.5, 3); // (150-132)/(168-132)

    const elite = standardsLevel("back_squat", "male", 80, 210);
    expect(elite.level).toBe(4);
    expect(elite.name).toBe("elite");
    expect(elite.percentOfNext).toBe(1);

    const subBeginner = standardsLevel("back_squat", "male", 80, 50);
    expect(subBeginner.level).toBe(0);
    expect(subBeginner.name).toBe("beginner");
    expect(subBeginner.percentOfNext).toBe(0);

    // assisted pull-up: -10 kg added at F 60 kg sits halfway beginner (-16) → novice (-4)
    const assisted = standardsLevel("weighted_pullup", "female", 60, -10);
    expect(assisted.level).toBe(0);
    expect(assisted.percentOfNext).toBeCloseTo(0.5, 3);
  });

  it("resolves single-row anchors at any bodyweight (curl, doc 02 §2.2)", () => {
    // curl has one anchor row per sex — extrapolation is impossible, so it resolves to it
    expect(standardsLevel("curl", "male", 90, 46).interpolatedThresholds).toEqual([
      22, 33, 46, 63, 80,
    ]);
    expect(standardsLevel("curl", "male", 90, 46).level).toBe(2);
    expect(standardsLevel("curl", "female", 52, 0).interpolatedThresholds).toEqual([
      8, 14, 23, 34, 47,
    ]);
  });

  it("extrapolates beyond table ends via the full-span local exponents (addendum-3 §4.2)", () => {
    // The §4.2 "Local exponents" table (squat M: 1.42/1.19/1.02/0.90/0.82) is computed
    // from the end rows M 60→90 and is the prescribed source for beyond-ends lookups.
    const rows = { lo: { bw: 60, kg: [49, 71, 98, 129, 162] }, hi: { bw: 90, kg: [87, 115, 148, 186, 226] } };
    const printedExponents = [1.42, 1.19, 1.02, 0.9, 0.82];
    rows.lo.kg.forEach((a, i) => {
      const e = Math.log(rows.hi.kg[i] / a) / Math.log(rows.hi.bw / rows.lo.bw);
      expect(e).toBeCloseTo(printedExponents[i], 2);
    });
    // Above the last row (M 120 kg): continues the span power law, does NOT clamp to 90 kg row.
    const above = standardsLevel("back_squat", "male", 120, 0).interpolatedThresholds;
    expect(above[0]).toBeCloseTo(130.74, 1);
    expect(above[2]).toBeCloseTo(198.28, 1);
    expect(above[4]).toBeCloseTo(286.22, 1);
    for (let i = 0; i < 5; i++) expect(above[i]).toBeGreaterThan(rows.hi.kg[i]);
    // Below the first row (M 50 kg): extrapolates downward, does NOT clamp to 60 kg row.
    const below = standardsLevel("back_squat", "male", 50, 0).interpolatedThresholds;
    expect(below[0]).toBeCloseTo(37.85, 1);
    expect(below[2]).toBeCloseTo(81.42, 1);
    expect(below[4]).toBeCloseTo(139.48, 1);
    for (let i = 0; i < 5; i++) expect(below[i]).toBeLessThan(rows.lo.kg[i]);
    // Assisted (negative) cells extrapolate on the LINEAR branch and never NaN:
    // F weighted pull-up beginner runs -14 (50 kg) → -18 (70 kg), slope -0.2/kg.
    const wpu = standardsLevel("weighted_pullup", "female", 80, 0).interpolatedThresholds;
    expect(wpu[0]).toBeCloseTo(-20, 6);
    for (const v of wpu) expect(Number.isFinite(v)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("points systems — all doc 02 / addendum-3 §7 worked examples", () => {
  it("DOTS reproduces all four printed values", () => {
    expect(dots("male", 80, 600)).toBeCloseTo(413.7, 1);
    expect(dots("male", 93, 700)).toBeCloseTo(445.4, 1);
    expect(dots("female", 63, 400)).toBeCloseTo(430.2, 1);
    expect(dots("female", 60, 300)).toBeCloseTo(332.6, 1);
  });

  it("IPF GL classic reproduces 84.62 (M 80/600) and 67.81 (F 60/300)", () => {
    expect(ipfGl("male", 80, 600)).toBeCloseTo(84.62, 2); // doc 02 prints 84.6
    expect(ipfGl("female", 60, 300, "classic")).toBeCloseTo(67.81, 2); // doc 02 prints 67.8
  });

  it("Wilks original: M 80 kg / 600 kg → 409.6", () => {
    expect(wilks("male", 80, 600)).toBeCloseTo(409.6, 1);
  });

  it("Wilks-2020: M 80 kg / 600 kg → 491.5, a ~1.200× scale shift vs original — never mix", () => {
    expect(wilks2020("male", 80, 600)).toBeCloseTo(491.5, 1);
    expect(wilks2020("male", 80, 600) / wilks("male", 80, 600)).toBeCloseTo(1.2, 2);
  });

  it("relativeStrength is the plain ratio", () => {
    expect(relativeStrength(120, 80)).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------

describe("standards data integrity (addendum-3 §4.1 conventions)", () => {
  it("marks weighted lifts as added-weight and hip thrust as bar-included", () => {
    expect(STRENGTH_STANDARDS.weighted_pullup.addedWeight).toBe(true);
    expect(STRENGTH_STANDARDS.weighted_dip.addedWeight).toBe(true);
    expect(STRENGTH_STANDARDS.back_squat.addedWeight).toBe(false);
    expect(STRENGTH_STANDARDS.hip_thrust.barIncludedKg).toBe(20);
  });

  it("keeps rows sorted ascending by bodyweight with strictly increasing level thresholds", () => {
    for (const lift of Object.values(STRENGTH_STANDARDS)) {
      for (const rows of [lift.rows.male, lift.rows.female]) {
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i].bodyweightKg).toBeGreaterThan(rows[i - 1].bodyweightKg);
        }
        for (const row of rows) {
          for (let i = 1; i < 5; i++) {
            expect(row.kg[i]).toBeGreaterThan(row.kg[i - 1]);
          }
        }
      }
    }
  });

  it("carries the McCulloch and Foster age factors verbatim (doc 02 §7)", () => {
    expect(MCCULLOCH_AGE_FACTORS[40]).toBe(1.0);
    expect(MCCULLOCH_AGE_FACTORS[55]).toBe(1.25);
    expect(MCCULLOCH_AGE_FACTORS[79]).toBe(2.06);
    expect(MCCULLOCH_CAP).toBe(2.06);
    expect(FOSTER_AGE_FACTORS[14]).toBe(1.23);
    expect(FOSTER_AGE_FACTORS[23]).toBe(1.0);
  });
});
