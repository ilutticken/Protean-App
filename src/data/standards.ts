// Strength standards tables + points-formula coefficients for Protean.
//
// PRIMARY SOURCE: docs/research/06-addendum-3.md ("NORMATIVE", supersedes doc 02
// where they conflict). §4.1 tables were re-pulled from strengthlevel.com on
// 2026-08-01; tier ≡ percentile of the logging-lifter population
// (Beginner 5th / Novice 20th / Intermediate 50th / Advanced 80th / Elite 95th).
// FALLBACK SOURCE: docs/research/02-strength-standards.md §2.2 (barbell curl only —
// addendum-3 §4.1 does not carry a curl table; single anchor rows M 80 kg / F 60 kg).
//
// Conventions:
//  - All values kg. Cells are [beginner, novice, intermediate, advanced, elite].
//  - weighted_pullup / weighted_dip cells are ADDED weight; negative = assistance
//    required (addendum-3 §4.1 note ²). Interpolation across those cells must use
//    the linear branch, never log-log (addendum-3 §4.2).
//  - hip_thrust INCLUDES the 20 kg bar (addendum-3 §4.1 note ¹).

import type { EvidenceTier, Sex } from "../lib/types";

// ---------------------------------------------------------------------------
// Level naming (never "tier" in identifiers per project convention)

export const STANDARDS_LEVEL_NAMES = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const;

export type StandardsLevelName = (typeof STANDARDS_LEVEL_NAMES)[number];

export type LiftKey =
  | "back_squat"
  | "bench_press"
  | "deadlift"
  | "ohp"
  | "barbell_row"
  | "curl"
  | "hip_thrust"
  | "weighted_pullup"
  | "weighted_dip";

/** [beginner, novice, intermediate, advanced, elite] in kg. */
export type ThresholdsKg = readonly [number, number, number, number, number];

export interface StandardsRow {
  bodyweightKg: number;
  kg: ThresholdsKg;
}

export interface LiftStandards {
  /** Rows sorted ascending by bodyweight. May contain a single anchor row. */
  rows: Record<Sex, readonly StandardsRow[]>;
  /** True when cells are ADDED weight over bodyweight (may be negative = assisted). */
  addedWeight: boolean;
  /** Bar weight already included in the cells (hip thrust convention). */
  barIncludedKg?: number;
  evidence: EvidenceTier;
  source: string;
}

const SL = "strengthlevel.com re-pull 2026-08-01, doc 06-addendum-3 §4.1";
const SL_DOC02 = "strengthlevel.com anchor rows, doc 02 §2.2 (absent from addendum-3)";

// StrengthLevel kg standards, transcribed verbatim from addendum-3 §4.1 (curl from doc 02 §2.2).
export const STRENGTH_STANDARDS: Record<LiftKey, LiftStandards> = {
  back_squat: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [49, 71, 98, 129, 162] },
        { bodyweightKg: 70, kg: [62, 86, 116, 149, 185] },
        { bodyweightKg: 80, kg: [75, 101, 132, 168, 206] },
        { bodyweightKg: 90, kg: [87, 115, 148, 186, 226] },
      ],
      female: [
        { bodyweightKg: 50, kg: [26, 42, 63, 88, 116] },
        { bodyweightKg: 60, kg: [32, 49, 72, 99, 129] },
        { bodyweightKg: 70, kg: [37, 56, 80, 109, 140] },
      ],
    },
    addedWeight: false,
    evidence: "B",
    source: SL,
  },
  bench_press: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [37, 53, 72, 95, 119] },
        { bodyweightKg: 70, kg: [47, 64, 85, 110, 136] },
        { bodyweightKg: 80, kg: [56, 75, 98, 124, 151] },
        { bodyweightKg: 90, kg: [65, 85, 109, 137, 165] },
      ],
      female: [
        { bodyweightKg: 50, kg: [14, 25, 40, 58, 79] },
        { bodyweightKg: 60, kg: [19, 31, 47, 66, 88] },
        { bodyweightKg: 70, kg: [22, 36, 53, 74, 96] },
      ],
    },
    addedWeight: false,
    evidence: "B",
    source: SL,
  },
  deadlift: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [61, 86, 117, 153, 191] },
        { bodyweightKg: 70, kg: [75, 103, 137, 175, 216] },
        { bodyweightKg: 80, kg: [89, 119, 155, 196, 239] },
        { bodyweightKg: 90, kg: [102, 134, 172, 215, 260] },
      ],
      female: [
        { bodyweightKg: 50, kg: [34, 52, 76, 105, 136] },
        { bodyweightKg: 60, kg: [40, 60, 86, 116, 149] },
        { bodyweightKg: 70, kg: [46, 68, 95, 126, 160] },
      ],
    },
    addedWeight: false,
    evidence: "B",
    source: SL,
  },
  ohp: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [21, 32, 45, 62, 79] },
        { bodyweightKg: 70, kg: [27, 39, 54, 72, 90] },
        { bodyweightKg: 80, kg: [33, 46, 62, 81, 101] },
        { bodyweightKg: 90, kg: [38, 53, 70, 90, 111] },
      ],
      female: [
        { bodyweightKg: 50, kg: [10, 17, 27, 38, 51] },
        { bodyweightKg: 60, kg: [12, 20, 31, 43, 57] },
        { bodyweightKg: 70, kg: [15, 23, 34, 47, 62] },
      ],
    },
    addedWeight: false,
    evidence: "B",
    source: SL,
  },
  barbell_row: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [31, 46, 65, 87, 111] },
        { bodyweightKg: 70, kg: [40, 56, 77, 101, 127] },
        { bodyweightKg: 80, kg: [48, 66, 88, 114, 141] },
        { bodyweightKg: 90, kg: [56, 75, 99, 125, 154] },
      ],
      female: [
        { bodyweightKg: 50, kg: [15, 25, 38, 54, 72] },
        { bodyweightKg: 60, kg: [18, 29, 43, 59, 78] },
        { bodyweightKg: 70, kg: [20, 32, 46, 64, 83] },
      ],
    },
    addedWeight: false,
    evidence: "B",
    source: SL,
  },
  // Curl is NOT in addendum-3 §4.1 — single anchor rows from doc 02 §2.2.
  // Lookups at any bodyweight clamp to the anchor row (no second row to interpolate).
  curl: {
    rows: {
      male: [{ bodyweightKg: 80, kg: [22, 33, 46, 63, 80] }],
      female: [{ bodyweightKg: 60, kg: [8, 14, 23, 34, 47] }],
    },
    addedWeight: false,
    evidence: "B",
    source: SL_DOC02,
  },
  hip_thrust: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [32, 63, 107, 163, 227] },
        { bodyweightKg: 70, kg: [44, 80, 129, 189, 257] },
        { bodyweightKg: 80, kg: [56, 96, 149, 213, 285] },
        { bodyweightKg: 90, kg: [68, 111, 168, 236, 311] },
      ],
      female: [
        { bodyweightKg: 50, kg: [30, 56, 92, 137, 187] },
        { bodyweightKg: 60, kg: [35, 63, 100, 147, 199] },
        { bodyweightKg: 70, kg: [39, 69, 108, 155, 209] },
      ],
    },
    addedWeight: false,
    barIncludedKg: 20,
    evidence: "B",
    source: SL,
  },
  // ADDED weight; negative cells = assistance required (addendum-3 §4.1 note ²).
  weighted_pullup: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [-4, 11, 27, 45, 64] },
        { bodyweightKg: 70, kg: [-2, 13, 31, 50, 71] },
        { bodyweightKg: 80, kg: [-2, 14, 33, 54, 75] },
        { bodyweightKg: 90, kg: [-2, 15, 35, 57, 79] },
      ],
      female: [
        { bodyweightKg: 50, kg: [-14, -4, 8, 21, 35] },
        { bodyweightKg: 60, kg: [-16, -4, 9, 23, 38] },
        { bodyweightKg: 70, kg: [-18, -5, 9, 24, 40] },
      ],
    },
    addedWeight: true,
    evidence: "B",
    source: SL,
  },
  weighted_dip: {
    rows: {
      male: [
        { bodyweightKg: 60, kg: [-1, 17, 39, 64, 91] },
        { bodyweightKg: 70, kg: [2, 22, 46, 73, 101] },
        { bodyweightKg: 80, kg: [5, 26, 52, 81, 111] },
        { bodyweightKg: 90, kg: [6, 30, 57, 87, 118] },
      ],
      female: [
        { bodyweightKg: 50, kg: [-15, -2, 14, 32, 52] },
        { bodyweightKg: 60, kg: [-15, 0, 17, 37, 58] },
        { bodyweightKg: 70, kg: [-16, 0, 19, 40, 62] },
      ],
    },
    addedWeight: true,
    evidence: "B",
    source: SL,
  },
};

/** ISO date the StrengthLevel tables were pulled (surface in UI per addendum-3 §8.6). */
export const STANDARDS_PULLED_DATE = "2026-08-01";

/** Percentile each level maps to in the logging-lifter population (addendum-3 §4.1). */
export const STANDARDS_LEVEL_PERCENTILES: Record<StandardsLevelName, number> = {
  beginner: 5,
  novice: 20,
  intermediate: 50,
  advanced: 80,
  elite: 95,
};

// ---------------------------------------------------------------------------
// DOTS — doc 02 §3.5, re-affirmed addendum-3 §6. total * 500 / (A·bw⁴+B·bw³+C·bw²+D·bw+E).

/** DOTS 4th-order polynomial coefficients [A(bw⁴), B(bw³), C(bw²), D(bw), E] — doc 02 §3.5. */
export const DOTS_COEFFS: Record<Sex, readonly [number, number, number, number, number]> = {
  male: [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076],
  female: [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288],
};

export const DOTS_NUMERATOR = 500;

/** Bodyweight clamp ranges for DOTS, kg [min, max] — doc 02 §3.5. */
export const DOTS_BW_CLAMP_KG: Record<Sex, readonly [number, number]> = {
  male: [40, 210],
  female: [40, 150],
};

// ---------------------------------------------------------------------------
// Wilks (original, 1994) — doc 02 §3.3. Coeff = 500 / (a+b·x+c·x²+d·x³+e·x⁴+f·x⁵), x = bw kg.

/** Wilks original 5th-order polynomial coefficients [a..f] — doc 02 §3.3. */
export const WILKS_COEFFS: Record<
  Sex,
  readonly [number, number, number, number, number, number]
> = {
  male: [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8],
  female: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8],
};

export const WILKS_NUMERATOR = 500;

// ---------------------------------------------------------------------------
// Wilks-2020 ("Wilks 2") — doc 02 §3.4 / addendum-3 §6. NUMERATOR 600, never mix with original.

/** Wilks-2020 5th-order polynomial coefficients [a..f] — doc 02 §3.4. */
export const WILKS2020_COEFFS: Record<
  Sex,
  readonly [number, number, number, number, number, number]
> = {
  male: [
    47.46178854, 8.472061379, 0.07369410346, -0.001395833811, 7.07665973070743e-6,
    -1.20804336482315e-8,
  ],
  female: [
    -125.4255398, 13.71219419, -0.03307250631, -0.001050400051, 9.38773881462799e-6,
    -2.3334613884954e-8,
  ],
};

export const WILKS2020_NUMERATOR = 600;

// ---------------------------------------------------------------------------
// IPF GL Points — doc 02 §3.6 (official IPF, valid from 2020-05-01; declared valid
// to 2023-12-31 — re-check federation page before public release, addendum-3 §8.5).
// IPF_GL = result_kg * 100 / (A - B·exp(-C·bw)). Round coefficient to 6 dp, then points to 6 dp.

export type IpfGlEvent = "classic" | "classic_bench" | "equipped" | "equipped_bench";

/** IPF GL [A, B, C] per sex × event — doc 02 §3.6 (classic sets re-affirmed addendum-3 §6). */
export const IPF_GL_COEFFS: Record<Sex, Record<IpfGlEvent, readonly [number, number, number]>> = {
  male: {
    classic: [1199.72839, 1025.18162, 0.00921],
    classic_bench: [320.98041, 281.40258, 0.01008],
    equipped: [1236.25115, 1449.21864, 0.01644],
    equipped_bench: [381.22073, 733.79378, 0.02398],
  },
  female: {
    classic: [610.32796, 1045.59282, 0.03048],
    classic_bench: [142.40398, 442.52671, 0.04724],
    equipped: [758.63878, 949.31382, 0.02435],
    equipped_bench: [221.82209, 357.00377, 0.02937],
  },
};

// ---------------------------------------------------------------------------
// Age grading — doc 02 §7 (official USA Powerlifting / WRPF step tables).

/** McCulloch masters age coefficients, ages 40–79 — doc 02 §7 (WRPF 2022 edition). */
export const MCCULLOCH_AGE_FACTORS: Record<number, number> = {
  40: 1.0, 41: 1.005, 42: 1.014, 43: 1.028, 44: 1.044,
  45: 1.06, 46: 1.078, 47: 1.096, 48: 1.114, 49: 1.132,
  50: 1.15, 51: 1.168, 52: 1.187, 53: 1.207, 54: 1.228,
  55: 1.25, 56: 1.273, 57: 1.297, 58: 1.322, 59: 1.35,
  60: 1.38, 61: 1.41, 62: 1.44, 63: 1.47, 64: 1.501,
  65: 1.533, 66: 1.565, 67: 1.597, 68: 1.63, 69: 1.664,
  70: 1.7, 71: 1.74, 72: 1.78, 73: 1.82, 74: 1.86,
  75: 1.9, 76: 1.94, 77: 1.98, 78: 2.02, 79: 2.06,
};

/** Ages 80–90+ are capped at this coefficient — doc 02 §7. */
export const MCCULLOCH_CAP = 2.06;

/** Foster teen/junior age coefficients, ages 14–23 — doc 02 §7 (USA Powerlifting). */
export const FOSTER_AGE_FACTORS: Record<number, number> = {
  14: 1.23, 15: 1.18, 16: 1.13, 17: 1.08, 18: 1.06,
  19: 1.04, 20: 1.03, 21: 1.02, 22: 1.01, 23: 1.0,
};
