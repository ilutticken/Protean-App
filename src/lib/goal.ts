// Goal mode (PLAN-GENERATOR.md Phase 3): pick a target stunt, and the app shows the path
// up the tree toward it — on the map, on the plan, and in the numbers.
//
// This module is the pure engine: closure, frontier, slot relevance, and the
// goal-relevant set rate that §1 of the scoping doc names as an acceptance metric
// (target: ≥40% of weekly hard sets touch the goal's prerequisite closure).
//
// Deliberate limits, from the locked answers in that doc:
//  - §9.3: goal mode never adds volume. Nothing here prescribes anything; it only
//    annotates and measures. Chain-step selection stays with effectiveStepIndex().
//  - §10 ("overpromising ETAs"): progress is expressed as steps remaining, never dates.

import { skills } from "../data/skills";
import { nodesCreditedBy } from "./credit";
import type { SessionLog, SkillEntry, SkillNode, SkillProgress, Slot } from "./types";

/**
 * The goal's prerequisite closure: the goal plus every transitive prerequisite.
 * Order is unspecified; treat as a set.
 */
export function prereqClosure(goalId: string): Set<string> {
  const out = new Set<string>();
  const walk = (id: string) => {
    if (out.has(id)) return;
    const n = skills[id];
    if (!n) return;
    out.add(id);
    for (const p of n.prereqs) walk(p);
  };
  walk(goalId);
  return out;
}

/**
 * Everything training-relevant to the goal: the prerequisite closure PLUS the goal's own
 * line (same id namespace). The closure alone misses sibling drills — pull-04's Front
 * Lever Flutter and Tuck FL Kick train the front lever but are not formal prerequisites
 * of `front_lever.full`, and the slot that most obviously feeds the goal must badge.
 * The map keeps strict closure (it draws a route); badges and the set rate use this.
 */
export function goalRelevantIds(goalId: string): Set<string> {
  const out = prereqClosure(goalId);
  const line = goalId.slice(0, goalId.indexOf("."));
  if (line) {
    for (const id of Object.keys(skills)) {
      if (id.startsWith(line + ".")) out.add(id);
    }
  }
  return out;
}

export interface GoalPath {
  goal: SkillNode;
  closure: Set<string>;
  total: number;
  achieved: number;
  /** total − achieved — the honest "steps remaining", never a date. */
  remaining: number;
  /**
   * The working frontier: closure nodes not yet achieved whose prerequisites all are —
   * i.e. what the athlete can actually attempt next. Shallowest ring first.
   */
  nextUp: SkillNode[];
}

export function goalPath(
  goalId: string,
  statuses: Record<string, SkillProgress>,
): GoalPath | null {
  const goal = skills[goalId];
  if (!goal) return null;
  const closure = prereqClosure(goalId);
  let achieved = 0;
  const nextUp: SkillNode[] = [];
  for (const id of closure) {
    const st = statuses[id]?.status;
    if (st === "achieved") {
      achieved += 1;
      continue;
    }
    // available / in-progress = all prereqs achieved but this node not yet done.
    if (st === "available" || st === "in-progress") nextUp.push(skills[id]);
  }
  nextUp.sort((a, b) => a.ring - b.ring || a.name.localeCompare(b.name));
  return {
    goal,
    closure,
    total: closure.size,
    achieved,
    remaining: closure.size - achieved,
    nextUp,
  };
}

/**
 * Does training this slot move anything on the goal path? Uses creditedNodes'
 * raw ids via nodesCreditedBy but filters to the closure — attested closure
 * nodes (acro goals) can never be moved by a logged set, so they are excluded
 * exactly the way the Plan screen's "feeds" line excludes them.
 */
export function slotFeedsGoal(slot: Slot, closure: ReadonlySet<string>): boolean {
  for (const step of slot.chain) {
    const ids = step.ex ? [step.ex] : (step.opts ?? []).map((o) => o.ex);
    for (const ex of ids) {
      for (const nodeId of nodesCreditedBy(ex)) {
        if (!closure.has(nodeId)) continue;
        const n = skills[nodeId];
        if (n && n.sector !== "balance" && n.criterion.kind !== "attested") return true;
      }
    }
  }
  return false;
}

export interface GoalSetRate {
  relevant: number;
  total: number;
  /** 0..1; null when nothing was logged in the window. */
  rate: number | null;
}

/**
 * Of the sets logged since `sinceISO` (inclusive), how many credited a node on the
 * goal's closure? Counts workout sets and skill-log sets; total is everything logged,
 * so the rate answers "how much of my training moved my goal?".
 */
export function goalRelevantSetRate(
  sessions: SessionLog[],
  skillLog: SkillEntry[] | undefined,
  athleteId: string,
  closure: ReadonlySet<string>,
  sinceISO: string,
): GoalSetRate {
  let relevant = 0;
  let total = 0;
  for (const s of sessions) {
    if (s.athleteId !== athleteId || s.date < sinceISO) continue;
    for (const e of s.entries) {
      const feeds = nodesCreditedBy(e.exerciseId).some((id) => closure.has(id));
      total += e.sets.length;
      if (feeds) relevant += e.sets.length;
    }
  }
  for (const p of skillLog ?? []) {
    if (p.date < sinceISO) continue;
    total += 1;
    if (closure.has(p.nodeId)) relevant += 1;
  }
  return { relevant, total, rate: total === 0 ? null : relevant / total };
}
