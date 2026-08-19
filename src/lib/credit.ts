// Credit: the answer to "does doing the workout mark off stunts?", made visible.
//
// Two directions, both pure:
//   creditedNodes(exerciseId) — STATIC. What this exercise can ever feed, filtered to
//     what logging can actually move. Drives the Plan screen's "feeds" line, so a slot's
//     purpose is legible before you train it. nodesCreditedBy() is its unfiltered form.
//   sessionCredit(before, after) — DYNAMIC. What a specific session actually moved,
//     by diffing skill statuses across it. Drives the post-session summary.
//
// The static map inverts the three seams in selectors.bestByExercise / skillStatuses:
//   1. direct id identity  (node.id === exerciseId)
//   2. skillExerciseAlias  (node.id -> exerciseId republish)
//   3. e1rm-ratio          (exercise -> standards key -> tree lift id -> every node on it)
// It deliberately does NOT include locomotion: nothing in the routine produces a run or
// swim, so no slot can claim to feed those nodes (see locomotion.ts).

import { skills } from "../data/skills";
import { skillExerciseAlias } from "../data/skill-exercise-alias";
import { standardsKeyByExercise, type StandardsLiftKey } from "../data/exercises";
import type { SkillNode, SkillProgress, SkillStatus } from "./types";

/** Standards-table key -> the `liftId` used by `e1rm-ratio` criteria in the tree. */
const TREE_LIFT_BY_STANDARDS_KEY: Partial<Record<StandardsLiftKey, string>> = {
  back_squat: "squat",
  bench_press: "bench",
  deadlift: "deadlift",
  ohp: "ohp",
};

/** exerciseId -> node ids, built once. */
const creditIndex: Record<string, string[]> = (() => {
  const out: Record<string, Set<string>> = {};
  const add = (exerciseId: string, nodeId: string) => (out[exerciseId] ??= new Set()).add(nodeId);

  for (const id of Object.keys(skills)) add(id, id); // 1. direct
  for (const [nodeId, exerciseId] of Object.entries(skillExerciseAlias)) add(exerciseId, nodeId); // 2. alias

  // 3. e1RM — one logged barbell set feeds every ratio rung on that lift, AND every
  //    rung that reads the squat+bench+deadlift total (which is computed from them).
  const nodesByLift: Record<string, string[]> = {};
  const totalNodes: string[] = [];
  for (const n of Object.values(skills)) {
    if (n.criterion.kind === "e1rm-ratio") (nodesByLift[n.criterion.liftId] ??= []).push(n.id);
    else if (["total-ratio", "total-kg", "dots"].includes(n.criterion.kind)) totalNodes.push(n.id);
  }
  for (const lift of ["squat", "bench", "deadlift"]) {
    (nodesByLift[lift] ??= []).push(...totalNodes);
  }
  for (const [exerciseId, stdKey] of Object.entries(standardsKeyByExercise)) {
    const liftId = TREE_LIFT_BY_STANDARDS_KEY[stdKey];
    if (!liftId) continue;
    for (const nodeId of nodesByLift[liftId] ?? []) add(exerciseId, nodeId);
  }

  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
})();

/**
 * Every node a logged set of `exerciseId` maps onto — the RAW index, including nodes that
 * can never auto-mark. Nothing user-facing should use this directly: `creditedNodes()` is
 * the display path and applies the NO_AUTO_UNLOCK filter. The raw form is kept whole so
 * the alias/e1RM seams stay inspectable and testable against skilltree.ts.
 */
export function nodesCreditedBy(exerciseId: string): string[] {
  return creditIndex[exerciseId] ?? [];
}

/**
 * Can a logged set ever move this node on its own? Attested nodes and everything in the
 * `balance` sector are NO_AUTO_UNLOCK by locked decision #10 — the athlete attests them.
 * Mirrors the `autoAllowed` test in skilltree.computeSkillStatuses.
 */
function autoMarkable(node: SkillNode): boolean {
  return node.sector !== "balance" && node.criterion.kind !== "attested";
}

/**
 * As above, resolved to nodes and ordered nearest-to-a-stunt first — for the Plan
 * screen's "feeds" line.
 *
 * Excludes nodes that can never auto-mark: push-08's crawl steps map onto `balance`
 * nodes (Lizard Crawl, Foot-Hand Crawl), and advertising "feeds Foot-Hand Crawl" would
 * promise credit that logging can never deliver. A step whose whole feed list is
 * unmovable correctly advertises nothing.
 */
export function creditedNodes(exerciseId: string): SkillNode[] {
  return nodesCreditedBy(exerciseId)
    .map((id) => skills[id])
    .filter((n): n is SkillNode => Boolean(n) && autoMarkable(n))
    // Stunts first, then NEAREST first (lowest ring). A slot's "feeds" line should
    // answer "what is this exercise for?" with the next thing it moves — a barbell
    // squat feeds DOTS 500 too, but advertising that to someone who has never benched
    // is noise. The nearest rung is the useful answer.
    .sort(
      (a, b) =>
        Number(Boolean(b.isStunt)) - Number(Boolean(a.isStunt)) || a.ring - b.ring,
    );
}

// ---------------------------------------------------------------------------

export type CreditKind = "achieved" | "unlocked" | "progressed";

export interface NodeCredit {
  nodeId: string;
  name: string;
  kind: CreditKind;
  /** Present for "progressed": the measured best before and after. */
  from?: number;
  to?: number;
}

export interface SessionCredit {
  achieved: NodeCredit[];
  unlocked: NodeCredit[];
  progressed: NodeCredit[];
  total: number;
}

const RANK: Record<SkillStatus, number> = { locked: 0, available: 1, "in-progress": 2, achieved: 3 };

/**
 * Diff two skill-status maps — what a session moved.
 *  - achieved:  reached its criterion
 *  - unlocked:  became reachable (prereqs completed), i.e. locked -> available/in-progress
 *  - progressed: same status, but the measured best improved
 *
 * Status is compared by RANK, never by identity, so a node that jumps
 * locked -> achieved in one session is reported once, as achieved.
 */
export function sessionCredit(
  before: Record<string, SkillProgress>,
  after: Record<string, SkillProgress>,
): SessionCredit {
  const out: SessionCredit = { achieved: [], unlocked: [], progressed: [], total: 0 };

  for (const [nodeId, post] of Object.entries(after)) {
    const node = skills[nodeId];
    if (!node) continue;
    const pre = before[nodeId];
    const preRank = pre ? RANK[pre.status] : 0;
    const postRank = RANK[post.status];

    if (postRank > preRank) {
      const entry: NodeCredit = { nodeId, name: node.name, kind: "achieved" };
      if (post.status === "achieved") out.achieved.push(entry);
      else if (preRank === 0) out.unlocked.push({ ...entry, kind: "unlocked" });
      else out.progressed.push({ ...entry, kind: "progressed", from: pre?.best, to: post.best });
      // MUST continue: a node that both changed status AND improved its best would
      // otherwise fall through and be counted a second time under "progressed",
      // inflating the headline and listing the node twice.
      continue;
    }

    // Same status, better number — the common case, and the one that otherwise
    // makes a session feel like it did nothing.
    if (post.best !== undefined && post.best > (pre?.best ?? 0)) {
      out.progressed.push({
        nodeId,
        name: node.name,
        kind: "progressed",
        from: pre?.best,
        to: post.best,
      });
    }
  }

  const stuntFirst = (a: NodeCredit, b: NodeCredit) =>
    Number(Boolean(skills[b.nodeId]?.isStunt)) - Number(Boolean(skills[a.nodeId]?.isStunt)) ||
    (skills[b.nodeId]?.ring ?? 0) - (skills[a.nodeId]?.ring ?? 0);
  out.achieved.sort(stuntFirst);
  out.unlocked.sort(stuntFirst);
  out.progressed.sort(stuntFirst);
  out.total = out.achieved.length + out.unlocked.length + out.progressed.length;
  return out;
}
