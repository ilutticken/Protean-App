// Durable identity for chain positions.
//
// SlotState.stepIndex is a POSITION in slot.chain, and chains are meant to grow:
// every new difficulty rung authored into an existing chain shifts every index
// after it. A stored bare index would then silently re-point at a different
// exercise — an athlete working "Knee Push-Up" would come back to find the app
// had reassigned them "Full Push-Up", with their confirm count intact.
//
// So the index is treated as a cache and the KEY is treated as the progress:
// stamp the key on every write, resolve it back to an index on every read. When
// a step genuinely disappears from a chain the stored index is the fallback,
// which is the honest answer — the position it named no longer exists.
//
// In-step slots (single step, three tiers) are exempt: there stepIndex is a
// T-index into slot.tiers, not a chain position, so there is nothing positional
// to protect and a key would be actively misleading.

import { isInStepSlot } from "./progression";
import type { ChainStep, Slot, SlotState } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Stable key for a chain step. `ex` is the canonical exercise id and is unique
 * within a chain; steps that carry their exercises in `opts` have no `ex` of
 * their own, so they fall back to their display name.
 */
export function stepKeyOf(step: ChainStep | undefined): string | undefined {
  if (!step) return undefined;
  return step.ex ?? `n:${step.n}`;
}

/** Stable key for the chosen equipment option — the option's exercise id. */
export function optKeyOf(
  step: ChainStep | undefined,
  optIndex: number | undefined,
): string | undefined {
  if (!step?.opts || optIndex === undefined) return undefined;
  return step.opts[optIndex]?.ex;
}

/** Stamp the keys matching this state's current indices. Call on every write. */
export function stampSlotState(slot: Slot, state: SlotState): SlotState {
  const next: SlotState = { ...state };
  if (isInStepSlot(slot)) {
    delete next.stepKey;
    delete next.optKey;
    return next;
  }
  const step = slot.chain?.[state.stepIndex];
  const stepKey = stepKeyOf(step);
  const optKey = optKeyOf(step, state.optIndex);
  if (stepKey === undefined) delete next.stepKey;
  else next.stepKey = stepKey;
  if (optKey === undefined) delete next.optKey;
  else next.optKey = optKey;
  return next;
}

/**
 * Re-point a stored state at the CURRENT chain. Call on every read.
 * Returns the input untouched when nothing moved, so it stays referentially
 * stable for React memo dependencies.
 */
export function resolveSlotState(
  slot: Slot,
  stored: SlotState | undefined,
): SlotState | undefined {
  if (!stored) return undefined;
  const chain = slot.chain ?? [];
  if (isInStepSlot(slot) || chain.length === 0) return stored;

  let stepIndex = clamp(stored.stepIndex, 0, chain.length - 1);
  if (stored.stepKey !== undefined) {
    const found = chain.findIndex((s) => stepKeyOf(s) === stored.stepKey);
    if (found >= 0) stepIndex = found;
  }

  let optIndex = stored.optIndex;
  if (stored.optKey !== undefined) {
    const opts = chain[stepIndex]?.opts ?? [];
    const found = opts.findIndex((o) => o.ex === stored.optKey);
    optIndex = found >= 0 ? found : 0;
  }

  if (stepIndex === stored.stepIndex && optIndex === stored.optIndex) return stored;
  return { ...stored, stepIndex, ...(optIndex === undefined ? {} : { optIndex }) };
}

/**
 * Stamp every stored slot state against the plan. Used by the schema migration
 * that introduced keys: existing states were written when their indices were
 * still correct, so this is the one moment their meaning can be captured.
 */
export function stampAllSlotStates(
  slots: Record<string, Slot>,
  states: Record<string, SlotState>,
): Record<string, SlotState> {
  const out: Record<string, SlotState> = {};
  for (const [id, st] of Object.entries(states)) {
    const slot = slots[id];
    out[id] = slot ? stampSlotState(slot, st) : st;
  }
  return out;
}
