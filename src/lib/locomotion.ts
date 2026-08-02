// The locomotion producer: turns the cardio log into the `locomotionBest` map that
// skilltree.ts::criterionMet reads for `time` and `distance` criteria.
//
// Before this existed, `skillStatuses()` simply never passed `locomotionBest`, so all 41
// time/distance nodes were permanently locked no matter what the athlete did — and there
// was nowhere to record a run or swim in the first place, since the routine contains
// neither. See src/data/locomotion-sources.ts for which nodes may be credited and why.

import { locomotionSources } from "../data/locomotion-sources";
import type { CardioEntry } from "./types";

/**
 * Best value toward each creditable locomotion node.
 *  - distance nodes → the FARTHEST single effort in that modality (metres).
 *  - time nodes → the FASTEST single effort of at least `overMeters` (seconds).
 *
 * Both are per-effort, never summed: covering 5 km across three runs is not a 5 km run.
 */
export function locomotionBestFrom(log: CardioEntry[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!log || log.length === 0) return out;

  const farthest: Record<string, number> = { run: 0, swim: 0 };
  for (const e of log) {
    if (!Number.isFinite(e.meters) || e.meters <= 0) continue;
    farthest[e.modality] = Math.max(farthest[e.modality] ?? 0, e.meters);
  }

  for (const [nodeId, src] of Object.entries(locomotionSources)) {
    if (src.overMeters === undefined) {
      const m = farthest[src.modality] ?? 0;
      if (m > 0) out[nodeId] = m;
      continue;
    }
    let fastest = Infinity;
    for (const e of log) {
      if (e.modality !== src.modality) continue;
      if (!Number.isFinite(e.meters) || e.meters < src.overMeters) continue;
      if (e.seconds === undefined || !Number.isFinite(e.seconds) || e.seconds <= 0) continue;
      fastest = Math.min(fastest, e.seconds);
    }
    if (Number.isFinite(fastest)) out[nodeId] = fastest;
  }
  return out;
}

/** Farthest single effort per modality — for the Stats summary line. */
export function cardioSummary(log: CardioEntry[] | undefined): {
  run: { count: number; farthestM: number };
  swim: { count: number; farthestM: number };
} {
  const out = { run: { count: 0, farthestM: 0 }, swim: { count: 0, farthestM: 0 } };
  for (const e of log ?? []) {
    const bucket = out[e.modality];
    if (!bucket) continue;
    bucket.count += 1;
    if (Number.isFinite(e.meters)) bucket.farthestM = Math.max(bucket.farthestM, e.meters);
  }
  return out;
}

/** "5.0 km" / "800 m" — display helper for the cardio log. */
export function formatMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)} km` : `${Math.round(m)} m`;
}

/** Seconds → "42:11" or "1:23:04". */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}
