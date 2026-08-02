// Pure skill-tree status derivation.
// Sources: docs/research/01-skill-progressions.md §3/§6 (criteria semantics),
// docs/research/06-addendum-1.md §0/§1 (NO_AUTO_UNLOCK acrobatics) and §3.2 (per-sex
// locomotion thresholds), docs/research/06-addendum-2.md §1.4 (skill-tree credit uses
// doc-01 criteria, independent of slot progression).

import type { Sector, Sex, SkillNode, SkillProgress, SkillStatus } from "./types";
import { femaleBwRatioOverride, locomotionTimeBySex } from "../data/skills";

/** Best logged results toward criteria, aggregated per canonical exercise/node id. */
/** One session's set values for a single exercise. */
export interface SessionSets {
  /** Set values from rep-counted slots. */
  reps: number[];
  /** Set values (seconds) from hold slots. */
  holds: number[];
  /** (reps, added kg) pairs from the same set. */
  pairs: { reps: number; weightKg: number }[];
}

export interface ExerciseBest {
  maxReps?: number;
  maxRepsPerSet?: number;
  maxHoldSec?: number;
  maxWeightKg?: number;
  maxSetsAtTarget?: number;
  /** Pareto frontier of (reps, weightKg) achieved in the SAME set — weighted
   * criteria must never combine a heavy single with a separate high-rep set. */
  weightedSetBests?: { reps: number; weightKg: number }[];
  /**
   * Per-session set values, needed because a criterion's `sets` is a real requirement:
   * doc 01 rule R-DYN is "3 sets x 8 clean reps IN ONE SESSION". Absent for data logged
   * before this was tracked, in which case criterionMet falls back to the best single set.
   */
  sessions?: SessionSets[];
}

export interface SkillTreeInput {
  skills: Record<string, SkillNode>;
  /** Manual marks and attestations (NO_AUTO_UNLOCK nodes can ONLY achieve via these). */
  manual: Record<string, SkillProgress>;
  /** Keyed by canonical exercise id == skill node id (addendum-2 §4 mapping). */
  bestByExercise: Record<string, ExerciseBest>;
  /** Canonical e1RM (kg) per lift id, computed per addendum-3 §2.2 upstream. */
  e1rmByLift: Record<string, number>;
  bodyweightKg: number;
  sex: Sex;
  /** Locomotion bests keyed by node id: seconds for "time" nodes, meters for "distance" nodes. */
  locomotionBest?: Record<string, number>;
}

const SECTORS: Sector[] = [
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

// Female bwRatio replacement (doc 01 §4.1/§6 female criteria) for ratio-based criteria.
export function effectiveBwRatio(nodeId: string, bwRatio: number, sex: Sex): number {
  if (sex === "female") {
    const override = femaleBwRatioOverride[nodeId];
    if (override !== undefined) return override;
  }
  return bwRatio;
}

/**
 * Did ANY single session contain `need` sets at or above `threshold`?
 * A criterion's `sets` is a requirement, not decoration — doc 01 R-DYN is "3 sets x 8 clean
 * reps in one session", and three hard sets on three different days is not the same claim.
 */
function countsInOneSession(
  sessions: SessionSets[],
  pick: (s: SessionSets) => number[],
  threshold: number,
  need: number,
): boolean {
  return sessions.some((s) => pick(s).filter((v) => v >= threshold).length >= need);
}

// True when logged data satisfies the node's criterion (doc 01 §6 unlock criteria).
// Attested criteria never auto-satisfy (addendum-1 §0 NO_AUTO_UNLOCK).
function criterionMet(node: SkillNode, input: SkillTreeInput): boolean {
  const c = node.criterion;
  const b = input.bestByExercise[node.id];
  switch (c.kind) {
    case "hold": {
      const need = c.sets ?? 1;
      if (b?.sessions) return countsInOneSession(b.sessions, (x) => x.holds, c.seconds, need);
      return (b?.maxHoldSec ?? 0) >= c.seconds; // legacy data: best single set only
    }
    case "reps": {
      const need = c.sets ?? 1;
      if (b?.sessions) return countsInOneSession(b.sessions, (x) => x.reps, c.reps, need);
      return (b?.maxRepsPerSet ?? b?.maxReps ?? 0) >= c.reps;
    }
    case "weighted-reps": {
      const ratio = effectiveBwRatio(node.id, c.bwRatio, input.sex);
      const needKg = ratio * input.bodyweightKg;
      // Same-set pairs when available (review finding #15); the legacy independent-
      // maxima check remains only as a fallback for data logged before pairs existed.
      const needSets = c.sets ?? 1;
      if (b?.sessions) {
        return b.sessions.some(
          (s2) => s2.pairs.filter((p) => p.weightKg >= needKg && p.reps >= c.reps).length >= needSets,
        );
      }
      if (b?.weightedSetBests?.length) {
        return b.weightedSetBests.some((p) => p.weightKg >= needKg && p.reps >= c.reps);
      }
      return (b?.maxWeightKg ?? 0) >= needKg && (b?.maxRepsPerSet ?? b?.maxReps ?? 0) >= c.reps;
    }
    case "e1rm-ratio": {
      const ratio = effectiveBwRatio(node.id, c.bwRatio, input.sex);
      return (input.e1rmByLift[c.liftId] ?? 0) >= ratio * input.bodyweightKg;
    }
    case "time": {
      const best = input.locomotionBest?.[node.id];
      const threshold = locomotionTimeBySex[node.id]?.[input.sex] ?? c.seconds;
      return best !== undefined && best > 0 && best <= threshold;
    }
    case "distance":
      return (input.locomotionBest?.[node.id] ?? 0) >= c.meters;
    case "attested":
      return false;
  }
}

// Best measured value toward the criterion (reps, seconds, kg, or ratio) — for SkillProgress.best.
function bestToward(node: SkillNode, input: SkillTreeInput): number | undefined {
  const c = node.criterion;
  const b = input.bestByExercise[node.id];
  switch (c.kind) {
    case "hold":
      return b?.maxHoldSec;
    case "reps":
      return b?.maxRepsPerSet ?? b?.maxReps;
    case "weighted-reps":
      // kg-denominated best only — reps must never flow into a kg formula
      // (review finding #16); unweighted work still shows via in-progress state.
      return b?.maxWeightKg;
    case "e1rm-ratio": {
      const e1rm = input.e1rmByLift[c.liftId];
      return e1rm !== undefined && input.bodyweightKg > 0 ? e1rm / input.bodyweightKg : undefined;
    }
    case "time":
    case "distance":
      return input.locomotionBest?.[node.id];
    case "attested":
      return undefined;
  }
}

/**
 * Derive every node's SkillStatus from logged bests + manual attestations —
 * doc 01 §6 criteria; addendum-1 §0 (acrobatics/"balance" nodes NEVER auto-achieve);
 * addendum-2 §1.4 (tree credit gates at doc-01 numbers, not slot band targets).
 * achieved: criterion met (or manual/attested) · available: all prereqs achieved ·
 * in-progress: available with any logged best > 0 · else locked.
 */
export function computeSkillStatuses(input: SkillTreeInput): Record<string, SkillProgress> {
  // Pass 1: achievement (independent of availability, so it never recurses).
  const achieved: Record<string, boolean> = {};
  for (const id in input.skills) {
    const node = input.skills[id];
    const m = input.manual[id];
    const manualAchieved = m?.status === "achieved" || m?.attestedDate !== undefined;
    const autoAllowed = node.sector !== "balance" && node.criterion.kind !== "attested";
    achieved[id] = manualAchieved || (autoAllowed && criterionMet(node, input));
  }
  // Pass 2: availability / progress.
  const out: Record<string, SkillProgress> = {};
  for (const id in input.skills) {
    const node = input.skills[id];
    const m = input.manual[id];
    const best = bestToward(node, input);
    let status: SkillStatus;
    if (achieved[id]) {
      status = "achieved";
    } else {
      const available = node.prereqs.every((p) => achieved[p] === true);
      const b = input.bestByExercise[id];
      // Only measurable criteria count logged work as progress; attested nodes
      // stay fully manual (safety semantics — skills.test.ts pins this).
      const anyLog =
        node.criterion.kind !== "attested" &&
        (b?.maxRepsPerSet ?? b?.maxReps ?? b?.maxHoldSec ?? b?.maxWeightKg ?? 0) > 0;
      if (!available) status = "locked";
      else if ((best !== undefined && best > 0) || anyLog || m?.status === "in-progress")
        status = "in-progress";
      else status = "available";
    }
    const progress: SkillProgress = { status };
    if (best !== undefined) progress.best = best;
    if (m?.achievedDate !== undefined) progress.achievedDate = m.achievedDate;
    if (m?.attestedDate !== undefined) progress.attestedDate = m.attestedDate;
    out[id] = progress;
  }
  return out;
}

/** Per-sector achieved/total counts for the hex map — doc 05 §4 sector routing via SkillNode.sector. */
export function sectorCompletion(
  statuses: Record<string, SkillProgress>,
  skills: Record<string, SkillNode>,
): Record<Sector, { achieved: number; total: number }> {
  const out = {} as Record<Sector, { achieved: number; total: number }>;
  for (const s of SECTORS) out[s] = { achieved: 0, total: 0 };
  for (const id in skills) {
    const sector = skills[id].sector;
    out[sector].total += 1;
    if (statuses[id]?.status === "achieved") out[sector].achieved += 1;
  }
  return out;
}
