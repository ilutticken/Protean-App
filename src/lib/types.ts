// Core domain types for Protean.
// Conventions follow docs/research/06-addendum-2.md (the authoritative seed schema):
//  - chains are ordered HARDEST-FIRST (stepIndex 0 = hardest; advancing = stepIndex - 1)
//  - "stepIndex" = chain position, "repBand" = 0/1/2 rep-tier band (never call either "tier")
//  - all weights stored in kg; display unit is a profile preference.

export type Sex = "male" | "female";
export type Unit = "kg" | "lb";

/** The 9 hex-map sectors (movement families), ids per addendum-2 seed. */
export type Sector =
  | "pushup"
  | "dips_planche_hs"
  | "pull_levers"
  | "back_chain"
  | "posterior"
  | "squat"
  | "core"
  | "balance"
  | "run_martial";

export interface Athlete {
  id: string;
  name: string;
  sex: Sex;
  bodyweightKg: number;
  heightCm?: number;
  birthYear?: number;
  unit: Unit;
  /** Accent color used everywhere this athlete's data appears (hex). */
  accent: string;
  bodyweightLog: { date: string; kg: number }[];
}

// ---------------------------------------------------------------------------
// Exercises

export type MovementPattern =
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "core"
  | "carry"
  | "locomotion"
  | "power";

export type Plane = "sagittal" | "frontal" | "transverse";

export interface Exercise {
  id: string; // canonical namespaced id, e.g. "planche.tuck_planche_pushup"
  name: string;
  sector: Sector;
  pattern: MovementPattern;
  planes: Plane[];
  /**
   * Effective load as fraction of bodyweight (static bottom-position convention,
   * addendum-3): push-up 0.750, knee push-up 0.618, pull-up/dip 0.956, pistol 0.839.
   * Undefined for externally loaded or non-strength movements.
   */
  bwLoadFactor?: number;
  loadable?: boolean;
}

// ---------------------------------------------------------------------------
// Plan (seed schema, addendum-2 §2-3)

export type SlotType = "chain" | "quasi_iso" | "timed_hold" | "iso_overcoming" | "rounds";
export type SlotUnit = "reps" | "steps" | "seconds" | "skips";
export type RepBand = 0 | 1 | 2;

export interface ChainStepOpt {
  n: string;
  ex: string;
  load?: boolean;
}

export interface ChainStep {
  n: string; // display name
  ex?: string; // canonical exercise id (absent when opts carry them)
  band: RepBand;
  load?: boolean; // takes external load
  loadOpt?: boolean; // load optional
  sa?: boolean; // straight-arm / long-lever elbow stress -> 21-day rate limiter
  uni?: boolean; // unilateral: reps are per side
  alt?: boolean; // alternating: reps are total
  opts?: ChainStepOpt[]; // equipment-equivalent choices at same difficulty
  note?: string;
}

export interface Slot {
  id: string; // e.g. "legs-02"
  type?: SlotType; // default "chain"
  sets: number;
  tiers: number[]; // [T0,T1,T2] hardest-band first, or [T] single
  unit?: SlotUnit; // default "reps"
  perSide?: boolean;
  sector: Sector;
  holdSec?: number; // quasi_iso / timed_hold
  workSec?: number; // rounds
  restSec?: number; // rounds
  alternativeTo?: string;
  /**
   * Not part of the day's 6 core exercises. Set by prescription.ts, never by the PDF
   * transcription. The Workout screen hides these; the Plan screen still lists them.
   */
  optional?: boolean;
  note?: string;
  chain: ChainStep[]; // HARDEST FIRST
}

export type DayId = "legs" | "pull" | "push" | "fullbody" | "mobility";

export interface WarmupItem {
  id: string;
  n: string;
  optional?: boolean;
  dose?: { min?: number; reps?: number; perSide?: boolean; perDirection?: boolean };
  ex?: string;
  note?: string;
}

export interface IsoOvercomingSpec {
  sets: number;
  holdSec: number;
  angles: number;
  patternByDay: Partial<Record<DayId, string | null>>;
  anglePresetsDeg: Record<string, { joint: string; angles: number[] }>;
}

export interface MobilityItem {
  id: string;
  n: string;
  holdSec?: number;
  perSide?: boolean;
  ex?: string;
  dose?: { min?: number };
  note?: string;
}

export interface PlanConfig {
  confirmSessions: number; // sessions at target before advancing a step
  landingFailPctOfTarget: number; // R-LAND revert threshold (60)
  chainCooldownDays: number; // after revert (14)
  saStepRateLimitDays: number; // straight-arm advance limit (21)
  quasiIsoMaxPerSession: number;
  restSecByBand: [number, number, number];
  restSecIso: number;
  restSecTimed: number;
  loadIncKg: { lower: number; upper: number };
  weekOrder: DayId[];
}

export interface SeedPlan {
  config: PlanConfig;
  warmup: WarmupItem[];
  iso: IsoOvercomingSpec;
  days: Record<Exclude<DayId, "mobility">, Slot[]>;
  mobility: MobilityItem[];
}

// ---------------------------------------------------------------------------
// Logging

export interface SetLog {
  /** reps | steps | skips depending on slot unit; seconds for holds. */
  value: number;
  weightKg?: number;
  rir?: number;
  perSide?: boolean;
}

export interface EntryLog {
  slotId: string;
  stepIndex: number; // chain position performed (0 = hardest)
  optIndex?: number; // which equipment option, when step has opts
  exerciseId: string; // resolved canonical id actually performed
  repBand: RepBand;
  sets: SetLog[];
}

export interface SessionLog {
  id: string;
  athleteId: string;
  date: string; // ISO yyyy-mm-dd
  dayId: DayId;
  entries: EntryLog[];
  isoDone?: boolean;
  warmupDone?: boolean;
  notes?: string;
  durationMin?: number;
}

// ---------------------------------------------------------------------------
// Skill tree (docs 01, 06-addendum-1)

export type Criterion =
  | { kind: "hold"; seconds: number; sets?: number }
  | { kind: "reps"; reps: number; sets?: number; perSide?: boolean }
  | { kind: "weighted-reps"; reps: number; sets?: number; bwRatio: number }
  | { kind: "e1rm-ratio"; liftId: string; bwRatio: number }
  | { kind: "time"; seconds: number; note?: string } // locomotion milestones
  | { kind: "distance"; meters: number; note?: string }
  | { kind: "attested" }; // NO_AUTO_UNLOCK: user attests (flips, judged skills)

export type EvidenceTier = "A" | "B" | "C" | "D";

export interface SkillNode {
  id: string; // e.g. "planche.straddle"
  name: string;
  sector: Sector;
  /** 0 = hub/foundation … higher = closer to the elite stunt. Drives radial layout. */
  ring: number;
  criterion: Criterion;
  prereqs: string[]; // skill node ids (AND semantics)
  evidence: EvidenceTier;
  isStunt?: boolean; // headline stunts get special rendering
  sa?: boolean; // straight-arm: tendon pacing warnings apply
  surface?: "pit" | "resi" | "tumbltrak" | "floor"; // acrobatics safety gate
  spotterRequired?: boolean;
  estMonths?: [number, number]; // typical range for a trained adult
  description?: string;
}

export type SkillStatus = "locked" | "available" | "in-progress" | "achieved";

export interface SkillProgress {
  status: SkillStatus;
  /** Best measured result toward the criterion (reps, seconds, or ratio). */
  best?: number;
  achievedDate?: string;
  attestedDate?: string;
}

// ---------------------------------------------------------------------------
// Assessment / field tests (doc 04)

export interface TestResult {
  id: string;
  athleteId: string;
  testId: string; // snake_case id from the norms registry, e.g. "broad_jump", "dead_hang", "cooper_12min"
  date: string;
  value: number; // in the test's canonical unit
}

// ---------------------------------------------------------------------------
// App state

export interface SlotState {
  stepIndex: number; // current working chain position (0 = hardest)
  optIndex?: number;
  /**
   * Stable identity of the step `stepIndex` points at — see `slot-identity.ts`.
   * Chains gain rungs over time; a bare index would silently re-point at a
   * different exercise, so the key is what actually carries the progress.
   * Absent on in-step slots, where stepIndex is a T-index, not a position.
   */
  stepKey?: string;
  optKey?: string;
  workingWeightKg?: number;
  /** Sessions in a row meeting workTarget (advance at config.confirmSessions). */
  confirmCount: number;
  lastAdvanceDate?: string; // for sa rate-limiting + cooldowns
  cooldownUntil?: string;
}

/** A one-off tested lift outside the routine (barbell stunts need these). */
export interface LiftEntry {
  date: string;
  exerciseId: string; // e.g. "barbell.back_squat"
  weightKg: number;
  reps: number;
}

/**
 * One SET of deliberate skill practice, logged straight against a tree node.
 *
 * The routine has three hold slots and one iso spec, so there is nowhere in the week to
 * record a tuck-planche hold, a wall handstand or a front-lever tuck — which is why ~259
 * measurable nodes had no producer at all. This is the same fix as the cardio log: when
 * the plan cannot produce the measurement, give the athlete a place to record it.
 *
 * One entry = one set. Entries on the same date for the same node form one session, so
 * the enforced `sets` requirement (doc 01 R-DYN) is satisfied honestly.
 */
export interface SkillEntry {
  date: string;
  /** The skill-tree node id this set was performed against. */
  nodeId: string;
  /** Reps, or SECONDS when the node's criterion is a hold. */
  value: number;
  /** Added load, for weighted-reps criteria. */
  weightKg?: number;
}

/**
 * A run or swim. The routine contains neither, so this log is the ONLY producer for the
 * tree's `time` / `distance` criteria — see src/lib/locomotion.ts.
 * One entry = one continuous effort; distances are never summed across entries.
 */
export interface CardioEntry {
  date: string;
  modality: "run" | "swim" | "row";
  meters: number;
  /** Optional — required only to credit the timed `run_speed.*` tiers. */
  seconds?: number;
}

/** The active target stunt (goal mode, PLAN-GENERATOR.md Phase 3). One at a time. */
export interface GoalState {
  nodeId: string;
  startedDate: string;
}

export interface AthleteState {
  skillProgress: Record<string, SkillProgress>;
  slotState: Record<string, SlotState>;
  /** legs-04 vs legs-04-alt choice, per mesocycle (Q8). */
  slotAlternatives: Record<string, string>;
  /** Quick-logged lift tests (Stats → Test a lift). */
  liftLog?: LiftEntry[];
  /** Logged runs, rows and swims (Stats → Cardio log). */
  cardioLog?: CardioEntry[];
  /** Deliberate skill practice, logged against a node (Stunts → Log an attempt). */
  skillLog?: SkillEntry[];
  /** The stunt currently being chased; drives path highlighting and slot badges. */
  goal?: GoalState;
}

/**
 * An athlete carried over from the v1 multi-athlete schema who is not this
 * install's athlete. Never read by the app — retained so that collapsing to a
 * single athlete cannot destroy history, and so it still round-trips through
 * export/import (the owner can recover it into their own install).
 */
export interface ArchivedAthlete {
  athlete: Athlete;
  state: AthleteState;
  sessions: SessionLog[];
  tests: TestResult[];
}

/**
 * Protean is single-athlete by design: storage is local-first, so two people run
 * two independent installs rather than sharing one device's localStorage.
 */
export interface AppData {
  version: number;
  /** Null only before onboarding. */
  athlete: Athlete | null;
  state: AthleteState;
  sessions: SessionLog[];
  tests: TestResult[];
  settings: {
    theme: "dark" | "light";
    /**
     * How the straight-arm (`sa`) 21-day step rate limit behaves.
     *  - "advisory" (default): the warning is shown, advancement is never blocked.
     *  - "guided": addendum-2 §1.3 behaviour — advancement waits out the 21 days.
     * Advisory is the default by the athlete's explicit direction (years of lifting
     * background); see PLAN.md "Tendon pacing".
     */
    tendonPacing: "advisory" | "guided";
  };
  archived?: ArchivedAthlete[];
}
