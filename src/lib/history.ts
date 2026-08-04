// Editing logged history — the pure half of the History tab.
//
// WHY THIS EXISTS: every number in the app (e1RM trends, skill credit, goal progress)
// is DERIVED from the session log, so one fat-fingered 40 that should have been 4
// permanently pollutes the trend and can falsely achieve a skill node. Because the
// derivation is recomputed from scratch, fixing the log fixes everything downstream —
// deleting the bad set un-achieves the false unlock with no extra bookkeeping.
//
// The one thing edits deliberately do NOT touch: SlotState (chain position, confirm
// counts). Progression already advanced is not rewound — the athlete adjusts the step
// arrows in their next workout if an advance was earned on bad data. Rewinding it here
// would mean re-simulating every applySession() since the edit, which is a bigger
// correctness risk than the one it fixes.
//
// All functions are immutable: they return a new array and never mutate the input.

import type { SessionLog } from "./types";

/** Patch one set's value / added weight. `weightKg: null` clears the weight. */
export function updateSet(
  sessions: SessionLog[],
  sessionId: string,
  entryIndex: number,
  setIndex: number,
  patch: { value?: number; weightKg?: number | null },
): SessionLog[] {
  return sessions.map((s) => {
    if (s.id !== sessionId) return s;
    return {
      ...s,
      entries: s.entries.map((e, ei) => {
        if (ei !== entryIndex) return e;
        return {
          ...e,
          sets: e.sets.map((set, si) => {
            if (si !== setIndex) return set;
            const next = { ...set };
            if (patch.value !== undefined && Number.isFinite(patch.value) && patch.value > 0) {
              next.value = patch.value;
            }
            if (patch.weightKg === null) delete next.weightKg;
            else if (patch.weightKg !== undefined && Number.isFinite(patch.weightKg)) {
              next.weightKg = patch.weightKg;
            }
            return next;
          }),
        };
      }),
    };
  });
}

/**
 * Delete one set. An entry left with no sets is dropped; a session left with no
 * entries and no iso work is dropped entirely (there is nothing left to show).
 */
export function deleteSet(
  sessions: SessionLog[],
  sessionId: string,
  entryIndex: number,
  setIndex: number,
): SessionLog[] {
  return sessions
    .map((s) => {
      if (s.id !== sessionId) return s;
      const entries = s.entries
        .map((e, ei) => (ei === entryIndex ? { ...e, sets: e.sets.filter((_, si) => si !== setIndex) } : e))
        .filter((e) => e.sets.length > 0);
      return { ...s, entries };
    })
    .filter((s) => s.id !== sessionId || s.entries.length > 0 || s.isoDone === true);
}

/** Delete a whole session. */
export function deleteSession(sessions: SessionLog[], sessionId: string): SessionLog[] {
  return sessions.filter((s) => s.id !== sessionId);
}
