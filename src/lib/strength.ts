// Pure strength-estimation functions for Protean.
// Canonical constants: docs/research/06-addendum-3.md (NORMATIVE) over
// docs/research/02-strength-standards.md. No React, no I/O — plain data in, data out.

import type { Sex } from "./types";
import {
  DOTS_BW_CLAMP_KG,
  DOTS_COEFFS,
  DOTS_NUMERATOR,
  IPF_GL_COEFFS,
  STANDARDS_LEVEL_NAMES,
  STRENGTH_STANDARDS,
  WILKS2020_COEFFS,
  WILKS2020_NUMERATOR,
  WILKS_COEFFS,
  WILKS_NUMERATOR,
} from "../data/standards";
import type {
  IpfGlEvent,
  LiftKey,
  StandardsLevelName,
  StandardsRow,
} from "../data/standards";

// ---------------------------------------------------------------------------
// e1RM — canonical StrengthLevel hybrid (addendum-3 §2.2) + rep cap (§2.4)

/**
 * "full": r ≤ 10 · "flagged": 11–15 (inert for unlocks/PRs, CI ×1.5) ·
 * "capacity": r ≥ 16 — no e1RM emitted; log as work capacity instead (addendum-3 §2.4).
 */
export type E1rmConfidence = "full" | "flagged" | "capacity";

export interface E1rmResult {
  /** Estimated 1RM in kg; null when reps ≥ 16 (strength-endurance domain). */
  value: number | null;
  confidence: E1rmConfidence;
}

/** Brzycki (1993): w / (1.0278 − 0.0278·r) — doc 02 §1.1, canonical branch addendum-3 §2.2. */
function brzycki(weightKg: number, reps: number): number {
  return weightKg / (1.0278 - 0.0278 * reps);
}

/** Epley (1985): w · (1 + r/30) — doc 02 §1.1, canonical branch addendum-3 §2.2. */
function epley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/**
 * Canonical e1RM (StrengthLevel hybrid): r=1 → w exactly; r<8 Brzycki; 8–10 linear
 * Brzycki/Epley blend (9 = 50/50); r>10 Epley — addendum-3 §2.2, rep cap §2.4.
 */
export function e1rm(weightKg: number, reps: number): E1rmResult {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || reps <= 0) {
    throw new RangeError(`e1rm: invalid inputs (weightKg=${weightKg}, reps=${reps})`);
  }
  if (reps >= 16) return { value: null, confidence: "capacity" };
  const confidence: E1rmConfidence = reps <= 10 ? "full" : "flagged";
  if (reps === 1) return { value: weightKg, confidence }; // exact by construction (§2.2)
  let value: number;
  if (reps < 8) {
    value = brzycki(weightKg, reps);
  } else if (reps <= 10) {
    const t = (reps - 8) / 2; // 8 → 100% Brzycki, 9 → 50/50, 10 → 100% Epley
    value = (1 - t) * brzycki(weightKg, reps) + t * epley(weightKg, reps);
  } else {
    value = epley(weightKg, reps);
  }
  return { value, confidence };
}

// ---------------------------------------------------------------------------
// Bodyweight-exercise load conversion

/** effective_load = bwLoadFactor·BW + added, kg — doc 02 §5.2 with addendum-3 §3.1 static-bottom fractions. */
export function bwExerciseLoad(
  bodyweightKg: number,
  addedKg: number,
  bwLoadFactor: number,
): number {
  return bwLoadFactor * bodyweightKg + addedKg;
}

// ---------------------------------------------------------------------------
// Standards lookup — addendum-3 §4.2 (normative interpolation algorithm)

export interface StandardsLevelResult {
  /** 0 = beginner … 4 = elite. e1RMs below the beginner threshold still report 0. */
  level: 0 | 1 | 2 | 3 | 4;
  name: StandardsLevelName;
  /**
   * Progress from the current level's threshold toward the next, clamped to [0, 1]
   * (0 when below beginner; 1 at elite).
   */
  percentOfNext: number;
  /** [beginner, novice, intermediate, advanced, elite] kg at this bodyweight. */
  interpolatedThresholds: [number, number, number, number, number];
}

/**
 * Interpolate one lift's five level thresholds at a bodyweight: log-log between
 * bracketing rows; LINEAR when either surrounding cell ≤ 0 (assisted rows — ln of a
 * non-positive is a crash); bodyweights outside the table EXTRAPOLATE on the
 * full-span rows (addendum-3 §4.2 normative pseudocode + its "Local exponents"
 * table, which is computed from the table ends M 60→90 / F 50→70 and is the
 * prescribed exponent source "to extrapolate beyond table ends"). Single-anchor
 * tables (curl) resolve to their only row at any bodyweight.
 */
function interpolateThresholds(
  rows: readonly StandardsRow[],
  bodyweightKg: number,
): [number, number, number, number, number] {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (rows.length === 1) {
    return [...first.kg];
  }
  const exact = rows.find((r) => r.bodyweightKg === bodyweightKg);
  if (exact) return [...exact.kg];

  // Outside the table: extrapolate on the end rows — their log-log exponents
  // reproduce addendum-3 §4.2's printed "Local exponents" table exactly.
  let lo = first;
  let hi = last;
  if (bodyweightKg > first.bodyweightKg && bodyweightKg < last.bodyweightKg) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].bodyweightKg > bodyweightKg) {
        lo = rows[i - 1];
        hi = rows[i];
        break;
      }
    }
  }
  const out: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = lo.kg[i];
    const b = hi.kg[i];
    if (a > 0 && b > 0) {
      // local allometric exponent (log-log)
      const e = Math.log(b / a) / Math.log(hi.bodyweightKg / lo.bodyweightKg);
      out.push(a * Math.pow(bodyweightKg / lo.bodyweightKg, e));
    } else {
      // linear fallback: assisted (non-positive) cells only
      out.push(
        a + ((b - a) * (bodyweightKg - lo.bodyweightKg)) / (hi.bodyweightKg - lo.bodyweightKg),
      );
    }
  }
  return out as [number, number, number, number, number];
}

/**
 * Level lookup vs the StrengthLevel standards tables (addendum-3 §4.1/§4.2).
 * For weighted_pullup/weighted_dip pass the ADDED-weight e1RM (may be negative = assisted).
 */
export function standardsLevel(
  liftKey: LiftKey,
  sex: Sex,
  bodyweightKg: number,
  e1rmKg: number,
): StandardsLevelResult {
  const rows = STRENGTH_STANDARDS[liftKey].rows[sex];
  const interpolatedThresholds = interpolateThresholds(rows, bodyweightKg);
  let level: 0 | 1 | 2 | 3 | 4 = 0;
  for (let i = 4; i >= 0; i--) {
    if (e1rmKg >= interpolatedThresholds[i]) {
      level = i as 0 | 1 | 2 | 3 | 4;
      break;
    }
  }
  let percentOfNext = 1;
  if (level < 4) {
    const span = interpolatedThresholds[level + 1] - interpolatedThresholds[level];
    percentOfNext =
      span > 0
        ? Math.min(1, Math.max(0, (e1rmKg - interpolatedThresholds[level]) / span))
        : 0;
  }
  return {
    level,
    name: STANDARDS_LEVEL_NAMES[level],
    percentOfNext,
    interpolatedThresholds,
  };
}

// ---------------------------------------------------------------------------
// Points systems

/** DOTS = total·500 / (A·bw⁴+B·bw³+C·bw²+D·bw+E), bw clamped 40–210 M / 40–150 F — doc 02 §3.5. */
export function dots(sex: Sex, bodyweightKg: number, totalKg: number): number {
  const [A, B, C, D, E] = DOTS_COEFFS[sex];
  const [lo, hi] = DOTS_BW_CLAMP_KG[sex];
  const bw = Math.min(hi, Math.max(lo, bodyweightKg));
  const denom = A * bw ** 4 + B * bw ** 3 + C * bw ** 2 + D * bw + E;
  return (totalKg * DOTS_NUMERATOR) / denom;
}

const round6 = (x: number): number => Math.round(x * 1e6) / 1e6;

/**
 * IPF GL = result·100 / (A − B·exp(−C·bw)); coefficient then points rounded to 6 dp
 * per federation rule — doc 02 §3.6.
 */
export function ipfGl(
  sex: Sex,
  bodyweightKg: number,
  totalKg: number,
  event: IpfGlEvent = "classic",
): number {
  const [A, B, C] = IPF_GL_COEFFS[sex][event];
  const coeff = round6(100 / (A - B * Math.exp(-C * bodyweightKg)));
  return round6(totalKg * coeff);
}

/** Shared 5th-order Wilks denominator: a+b·x+c·x²+d·x³+e·x⁴+f·x⁵ — doc 02 §3.3/§3.4. */
function wilksDenominator(
  coeffs: readonly [number, number, number, number, number, number],
  bw: number,
): number {
  const [a, b, c, d, e, f] = coeffs;
  return a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4 + f * bw ** 5;
}

/** Wilks (original, 1994), numerator 500 — doc 02 §3.3. Never mix with Wilks-2020. */
export function wilks(sex: Sex, bodyweightKg: number, totalKg: number): number {
  return (totalKg * WILKS_NUMERATOR) / wilksDenominator(WILKS_COEFFS[sex], bodyweightKg);
}

/** Wilks-2020 ("Wilks 2"), numerator 600 — doc 02 §3.4. Never mix with original Wilks. */
export function wilks2020(sex: Sex, bodyweightKg: number, totalKg: number): number {
  return (
    (totalKg * WILKS2020_NUMERATOR) / wilksDenominator(WILKS2020_COEFFS[sex], bodyweightKg)
  );
}

/** Plain relative strength ratio e1RM ÷ bodyweight — doc 02 §0 (cross-athlete display). */
export function relativeStrength(e1rmKg: number, bodyweightKg: number): number {
  return e1rmKg / bodyweightKg;
}
