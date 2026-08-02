// Which skill nodes a logged run or swim is allowed to credit.
//
// The routine contains no running and no swimming — legs-11/full-09/full-10 are carries,
// skips and 100-Ups, all counted in steps. So every `time` / `distance` node in the tree
// had no producer at all and could never auto-achieve. The cardio log (AthleteState.
// cardioLog) is that producer, and this registry is the seam between them.
//
// SAFETY RULE, mirroring skill-exercise-alias.ts: map ONLY nodes whose criterion really is
// "cover this distance in one continuous effort". Distance thresholds may differ freely —
// criterionMet re-measures them — but a node whose criterion describes a SESSION SHAPE
// rather than a distance must never be credited by a single continuous effort.
//
// Deliberately excluded on that rule:
//   run_base.strides       600 m as 6 × 100 m at mile pace with walk-backs
//   run_base.hill_sprints  800 m as 10 × 80 m uphill with walk-down rest
// A 5 km run covers both distances and trains neither. Both stay manually markable.
//
// Also excluded automatically (not by this file): attested nodes — swim_base.water_safety
// and swim_base.open_water_400m are NO_AUTO_UNLOCK by addendum-1 §3.4/§4.

export type CardioModality = "run" | "swim";

export interface LocomotionSource {
  modality: CardioModality;
  /**
   * TIME nodes only: the distance the clock is measured over. The node's best is the
   * fastest logged effort of AT LEAST this distance — a 10 km time is admissible evidence
   * for a 5 km threshold (it is strictly harder), a 3 km time is not.
   */
  overMeters?: number;
}

export const locomotionSources: Record<string, LocomotionSource> = {
  // ---- running, distance ---------------------------------------------------
  "run_base.walk_30min": { modality: "run" },
  "run_base.walk_run_20min": { modality: "run" },
  "run_base.jog_5min": { modality: "run" },
  "run_base.jog_1k": { modality: "run" },
  "run_distance.mile": { modality: "run" },
  "run_base.run_2k": { modality: "run" },
  "run_distance.5k": { modality: "run" },
  "run_base.long_8k": { modality: "run" },
  "run_distance.10k": { modality: "run" },
  "run_base.long_15k": { modality: "run" },
  "run_distance.half": { modality: "run" },
  "run_base.long_30k": { modality: "run" },
  "run_distance.marathon": { modality: "run" },

  // ---- running, timed ------------------------------------------------------
  "run_speed.5k_t2": { modality: "run", overMeters: 5000 },
  "run_speed.5k_t3": { modality: "run", overMeters: 5000 },
  "run_speed.5k_t4": { modality: "run", overMeters: 5000 },
  "run_speed.5k_t5": { modality: "run", overMeters: 5000 },
  "run_speed.10k_t2": { modality: "run", overMeters: 10000 },
  "run_speed.10k_t3": { modality: "run", overMeters: 10000 },
  "run_speed.10k_t4": { modality: "run", overMeters: 10000 },
  "run_speed.10k_t5": { modality: "run", overMeters: 10000 },
  "run_speed.half_t2": { modality: "run", overMeters: 21097 },
  "run_speed.half_t3": { modality: "run", overMeters: 21097 },
  "run_speed.half_t4": { modality: "run", overMeters: 21097 },
  "run_speed.half_t5": { modality: "run", overMeters: 21097 },
  "run_speed.marathon_t2": { modality: "run", overMeters: 42195 },
  "run_speed.marathon_t3": { modality: "run", overMeters: 42195 },
  "run_speed.marathon_t4": { modality: "run", overMeters: 42195 },
  "run_speed.marathon_t5": { modality: "run", overMeters: 42195 },

  // ---- swimming, distance --------------------------------------------------
  "swim_base.crawl_25m": { modality: "swim" },
  "swim_base.crawl_50m": { modality: "swim" },
  "swim.competence_100m": { modality: "swim" },
  "swim_base.crawl_200m": { modality: "swim" },
  "swim.400m": { modality: "swim" },
  "swim.750m": { modality: "swim" },
  "swim.1000m": { modality: "swim" },
  "swim.1500m": { modality: "swim" },
  "swim.2km": { modality: "swim" },
  "swim.3800m": { modality: "swim" },
};

/** Nodes with a time/distance criterion that this registry intentionally omits. */
export const locomotionExclusions: Record<string, string> = {
  "run_base.strides": "6 × 100 m with walk-backs — a session shape, not a distance",
  "run_base.hill_sprints": "10 × 80 m uphill with walk-down rest — a session shape, not a distance",
};
