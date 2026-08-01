// Shared constructors for skill-tree data files (src/data/skills.ts and the
// per-sector extension files in src/data/skills-ext/).
// Conventions: ring 0 = the line's hub as originally authored; EXTENSION files may
// use NEGATIVE rings for sub-hub (true beginner) content — buildSkills normalizes
// each sector so its lowest ring becomes 0. Prereq rings must stay strictly smaller
// than their dependents' (enforced by src/data/skills.test.ts).

import type { Criterion, EvidenceTier, Sector, SkillNode } from "../lib/types";

export const hold = (seconds: number, sets?: number): Criterion => ({ kind: "hold", seconds, sets });

export const reps = (count: number, sets?: number, perSide?: boolean): Criterion => ({
  kind: "reps",
  reps: count,
  sets,
  perSide,
});

export const wreps = (count: number, bwRatio: number, sets?: number): Criterion => ({
  kind: "weighted-reps",
  reps: count,
  sets,
  bwRatio,
});

export const e1rmRatio = (liftId: string, bwRatio: number): Criterion => ({
  kind: "e1rm-ratio",
  liftId,
  bwRatio,
});

export const timeUnder = (seconds: number, note?: string): Criterion => ({ kind: "time", seconds, note });

export const distanceOf = (meters: number, note?: string): Criterion => ({
  kind: "distance",
  meters,
  note,
});

/** NO_AUTO_UNLOCK (addendum-1 §0): user attestation is the only unlock path. */
export const ATTESTED: Criterion = { kind: "attested" };

export type NodeExtras = Partial<
  Pick<SkillNode, "isStunt" | "sa" | "surface" | "spotterRequired" | "estMonths" | "description">
> & { evidence?: EvidenceTier };

/** Node constructor with tier-C default evidence (doc 01 §0.1). */
export function node(
  id: string,
  name: string,
  sector: Sector,
  ring: number,
  criterion: Criterion,
  prereqs: string[],
  extras: NodeExtras = {},
): SkillNode {
  const { evidence = "C", ...rest } = extras;
  return { id, name, sector, ring, criterion, prereqs, evidence, ...rest };
}

/**
 * Extra prereqs to splice onto EXISTING nodes, keyed by existing node id.
 * Extension files use this to insert easier work beneath an already-authored hub
 * without editing skills.ts (which would collide across parallel authors).
 */
export type RewireMap = Record<string, string[]>;

export interface SectorExtension {
  nodes: SkillNode[];
  rewire?: RewireMap;
}
