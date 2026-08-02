// Skill-node id -> catalog exercise id, for on-ramp nodes whose id is NOT itself an
// exercise id. criterionMet() (src/lib/skilltree.ts) reads bestByExercise[node.id], so a
// rung like pull_base.pullup3 can never auto-achieve: the athlete logs the catalog pull-up
// (one_arm_pullup.pullup10). selectors.bestByExercise() republishes each source's bests
// under the node id listed here — the node's OWN criterion still gates achievement.
//
// SAFETY RULE: map ONLY when the logged exercise is the SAME physical movement. Rep and
// load thresholds may differ freely (they are re-measured against the node's criterion),
// but a node must NEVER draw from an easier movement — that would unlock hard skills from
// beginner work. When in doubt, leave unmapped.
//
// Deliberately unmapped: balance/attested nodes (NO_AUTO_UNLOCK), e1rm-ratio nodes (they
// read e1rmByLift, not bestByExercise), time/distance locomotion nodes, hold nodes with no
// hold-logged catalog source, and every assisted / partial-ROM / negative / tempo / grip
// variant that has no catalog exercise of its own.

export const skillExerciseAlias: Record<string, string> = {
  // Strict pull-up rep rungs — one movement, four thresholds; catalog pull-up is the log.
  "pull_base.pullup1": "one_arm_pullup.pullup10",
  "pull_base.pullup3": "one_arm_pullup.pullup10",
  "pull_base.pullup5": "one_arm_pullup.pullup10",
  "pull_base.pullup8": "one_arm_pullup.pullup10",

  // Weighted pull-up load rungs — same movement; added-kg is paired per set, so each
  // bwRatio threshold still has to be earned.
  "pull_base.wpu_10pct": "one_arm_pullup.wpu_25pct",
  "pull_base.wpu_35pct": "one_arm_pullup.wpu_25pct",
  "pull_base.wpu_70pct": "one_arm_pullup.wpu_25pct",
  "one_arm_pullup.wpu_50pct": "one_arm_pullup.wpu_25pct",

  // Full push-up rep rungs — the catalog push-up IS the movement these count.
  "pushup_base.first_pushup": "one_arm_pushup.pushup",
  "pushup_base.pushup_10": "one_arm_pushup.pushup",

  // Parallel-bar dip: strict-rep rung and the two added-load rungs share the catalog dip.
  "dip.dip_strict5": "dip.dip",
  "dip.dip_weighted_10": "dip.dip_weighted",
  "dip.weighted_half_bw": "dip.dip_weighted",

  // Air squat volume rung + weighted-pistol load rungs — same movements, higher thresholds.
  "squat_base.air_squat_50": "squat.air_squat",
  "pistol_squat.pistol_10pct": "pistol_squat.weighted_pistol",
  "pistol_squat.pistol_half_bw": "pistol_squat.weighted_pistol",

  // Hinge / posterior on-ramp: back_chain re-authors movements the catalog already carries
  // under the posterior-sector ids the seed actually logs.
  "hinge_ramp.good_morning_bw": "hinge.good_morning",
  "hinge_ramp.rdl_half_bw": "hinge.rdl",
  "hinge_ramp.rdl_bw": "hinge.rdl",
  "power_ramp.kb_swing": "hinge.kb_swing",
  "bridge_ramp.sl_glute_bridge": "hinge.glute_bridge_unilateral",
  "posterior_base.hip_thrust_2x": "barbell.hip_thrust",

  // Jump rope volume rung — same movement as the catalog skip, 5x the reps.
  "skip.skip_500": "cond.skip",
};
