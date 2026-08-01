// Seed plan for Protean — verbatim transcription of the authoritative seed JSON in
// docs/research/06-addendum-2.md §3 ("protean-seed-1.0"), mapped onto src/lib/types.ts.
// Chains are HARDEST-FIRST (stepIndex 0 = hardest). All weights kg. JSON "_note" -> "note".
// wu-13 (the daily Overcoming Isometric) is carried as `seedPlan.iso`, NOT as a warmup[] item.

import type { SeedPlan } from "../lib/types";

/** Seed provenance + config fields that PlanConfig does not model (addendum-2 §3 "config"/"source"). */
export const seedMeta = {
  schemaVersion: "protean-seed-1.0",
  source: {
    pdf: "reference_mat/Printable-Routines.pdf",
    verified: "2026-08-01",
    transcript: "docs/protean-routine-source.md",
  },
  tierSemantics: "band",
  bandFormula: "N==1?1:roundHalfUp(2i/(N-1))",
  unilateralRepsPerSide: true,
  alternatingRepsTotal: true,
  warmupBeforeEveryTrainingDay: true,
  mobilityAsDailyBookendOptional: true,
} as const;

/** Overcoming-iso execution defaults from wu-13 that IsoOvercomingSpec does not model (addendum-2 §3, §5). */
export const isoDefaults = {
  intent: "max",
  minPctMVC: 70,
  restRepSec: 30,
  restAngleSec: 60,
  authorConfirmed: false,
} as const;

/** The authoritative seed plan, transcribed from addendum-2 §3 (42 slots, 12 warmup items + iso, 11 mobility items). */
export const seedPlan: SeedPlan = {
  config: {
    confirmSessions: 2,
    landingFailPctOfTarget: 60,
    chainCooldownDays: 14,
    saStepRateLimitDays: 21,
    quasiIsoMaxPerSession: 3,
    restSecByBand: [150, 120, 90],
    restSecIso: 60,
    restSecTimed: 60,
    loadIncKg: { lower: 2.5, upper: 1.25 },
    weekOrder: ["legs", "pull", "mobility", "push", "fullbody"],
  },
  warmup: [
    { id: "wu-01", n: "Body Scan Meditation", dose: { min: 5 } },
    { id: "wu-02", n: "Knee Circles", dose: { reps: 10, perDirection: true } },
    { id: "wu-03", n: "Arm Windmills (opposite directions)", dose: { reps: 10, perDirection: true } },
    { id: "wu-04", n: "Alternating Toe Touches", dose: { reps: 5, perSide: true } },
    { id: "wu-05", n: "High Kicks", dose: { reps: 5, perSide: true }, note: "5 straight up + 5 sideways per leg" },
    { id: "wu-06", n: "Anterior / CLA Reach", dose: { reps: 5, perSide: true } },
    { id: "wu-07", n: "Posterior Reach", dose: { reps: 5, perSide: true } },
    { id: "wu-08", n: "Bird Dog", dose: { reps: 5, perSide: true } },
    { id: "wu-09", n: "Deep Squat", dose: { reps: 5 } },
    { id: "wu-10", n: "Balance Board", optional: true, dose: { min: 2 } },
    { id: "wu-11", n: "Reaction Ball-Wall / Juggling / Skipping", dose: { min: 2 }, note: "3 equivalent options; pick one" },
    { id: "wu-12", n: "Skater Hops", ex: "squat.skater_hop", dose: { reps: 10, perSide: true } },
  ],
  // wu-13 "Overcoming Isometric" (type iso_overcoming) — daily warm-up finisher, addendum-2 §0/§5.
  iso: {
    sets: 4,
    holdSec: 7,
    angles: 3,
    patternByDay: { legs: "squat", pull: "pullup", push: "dip_press", fullbody: "hinge", mobility: null },
    anglePresetsDeg: {
      squat: { joint: "knee", angles: [90, 115, 140] },
      pullup: { joint: "elbow", angles: [150, 110, 70] },
      dip_press: { joint: "elbow", angles: [90, 120, 150] },
      hinge: { joint: "hip", angles: [45, 90, 135] },
    },
  },
  days: {
    legs: [
      {
        id: "legs-01", sets: 2, tiers: [10, 30, 50], sector: "squat", chain: [
          { n: "One-Legged Jump Squat w/ Knee Thrust (alt.)", ex: "squat.olj_knee_thrust", band: 0, alt: true },
          { n: "Lunge Scissor Jump", ex: "squat.lunge_scissor_jump", band: 1, alt: true },
          { n: "Reverse Lunge", ex: "squat.reverse_lunge", band: 2, alt: true },
        ],
      },
      {
        id: "legs-02", sets: 2, tiers: [15, 20, 35], sector: "squat", chain: [
          { n: "Weighted Pistol Squat", ex: "pistol_squat.weighted_pistol", band: 0, load: true, uni: true },
          { n: "Pistol Squat", ex: "pistol_squat.pistol", band: 1, uni: true },
          { n: "Weighted Lunge Walk", ex: "squat.lunge_walk_weighted", band: 1, load: true, alt: true },
          { n: "Lunge Walk", ex: "squat.lunge_walk", band: 2, alt: true },
        ],
      },
      {
        id: "legs-03", sets: 2, tiers: [10, 20, 25], sector: "posterior", chain: [
          { n: "Romanian Deadlift", ex: "hinge.rdl", band: 0, load: true },
          { n: "Weighted Good Morning", ex: "hinge.good_morning_weighted", band: 1, load: true },
          { n: "Bodyweight Good Morning", ex: "hinge.good_morning", band: 2 },
        ],
      },
      {
        id: "legs-04", sets: 2, tiers: [10, 25, 50], sector: "squat", chain: [
          { n: "Goblet Jump Squat", ex: "squat.goblet_jump_squat", band: 0, load: true },
          { n: "Jump Squat", ex: "squat.jump_squat", band: 1 },
          { n: "Air Squat", ex: "squat.air_squat", band: 1 },
          { n: "Assisted Squat", ex: "squat.assisted_squat", band: 2 },
        ],
      },
      {
        id: "legs-04-alt", alternativeTo: "legs-04", sets: 2, tiers: [50], sector: "posterior", chain: [
          { n: "Overspeed Kettlebell Swing", ex: "hinge.kb_swing_overspeed", band: 0, load: true },
          { n: "Kettlebell Swing", ex: "hinge.kb_swing", band: 1, load: true },
          { n: "Jump Squat", ex: "squat.jump_squat", band: 1 },
          { n: "Air Squat", ex: "squat.air_squat", band: 2 },
          { n: "Assisted Squat", ex: "squat.assisted_squat", band: 2 },
        ],
      },
      {
        id: "legs-05", sets: 2, tiers: [25, 50, 100], sector: "squat", chain: [
          { n: "Hindu Squat", ex: "squat.hindu_squat", band: 0 },
          { n: "Bunny Hop", ex: "squat.bunny_hop", band: 1 },
          { n: "Backward Jogging", ex: "cond.backward_jog", band: 1, note: "count steps" },
          { n: "Backward Walking", ex: "cond.backward_walk", band: 2, note: "count steps" },
        ],
      },
      {
        id: "legs-06", sets: 2, tiers: [20, 30, 50], sector: "squat", chain: [
          { n: "Weighted Cossack Squat", ex: "squat.cossack_weighted", band: 0, load: true, uni: true },
          { n: "Weighted Side Lunge", ex: "squat.side_lunge_weighted", band: 1, load: true, uni: true },
          { n: "Side Lunge", ex: "squat.side_lunge", band: 1, uni: true },
          { n: "Skater Hop", ex: "squat.skater_hop", band: 2, alt: true },
        ],
      },
      {
        id: "legs-07", sets: 2, tiers: [20, 30, 35], sector: "posterior", chain: [
          { n: "Weighted Glute Bridge", ex: "hinge.glute_bridge_weighted", band: 0, load: true },
          { n: "Unilateral Glute Bridge", ex: "hinge.glute_bridge_unilateral", band: 1, uni: true },
          { n: "Glute Bridge", ex: "bridge.glute_bridge", band: 2 },
        ],
      },
      {
        id: "legs-08", sets: 2, tiers: [20, 30, 35], sector: "posterior", chain: [
          { n: "Deficit Calf Raise", ex: "squat.deficit_calf_raise", band: 0, loadOpt: true },
          { n: "Calf Raise", ex: "squat.calf_raise", band: 2 },
        ],
      },
      {
        id: "legs-09", sets: 2, tiers: [15, 25, 50], sector: "core", chain: [
          { n: "X-Up", ex: "core.x_up", band: 0 },
          { n: "Bicycle Sit-Up", ex: "core.bicycle_situp", band: 1, alt: true },
          { n: "Elbow to Knee", ex: "core.elbow_to_knee", band: 2, alt: true },
        ],
      },
      {
        id: "legs-10", sets: 2, tiers: [20, 30, 50], sector: "core", chain: [
          { n: "L-Sit Flutter", ex: "core.lsit_flutter", band: 0 },
          { n: "Lying Leg Raise", ex: "core.lying_leg_raise", band: 1 },
          { n: "Lying Leg Flutter", ex: "core.lying_leg_flutter", band: 2 },
        ],
      },
      {
        id: "legs-11", sets: 2, tiers: [50, 100, 150], unit: "steps", sector: "run_martial", chain: [
          { n: "Bilateral Loaded Carry", ex: "carry.bilateral_carry", band: 0, load: true },
          { n: "100-Up Major", ex: "cond.100up_major", band: 1, note: "unit reps" },
          { n: "100-Up Minor", ex: "cond.100up_minor", band: 2, note: "unit reps" },
        ],
      },
      {
        // tiers not in source JSON (slot is a 60 s hold); [60] supplied because Slot.tiers is required.
        id: "legs-12", type: "quasi_iso", sets: 1, tiers: [60], holdSec: 60, sector: "squat", chain: [
          { n: "Quasi-Isometric Air Squat", ex: "qi.air_squat", band: 0 },
          { n: "Quasi-Isometric Assisted Air Squat", ex: "qi.assisted_air_squat", band: 2 },
        ],
      },
    ],
    pull: [
      {
        id: "pull-01", sets: 2, tiers: [15, 25, 30], sector: "pull_levers",
        note: "unit ambiguity: 15 weighted L-sit rope-climb 'reps' likely = hand-pulls, not ascents. PENDING-Q5",
        chain: [
          { n: "Weighted L-Sit Rope Climb", ex: "rope_climb.weighted_climb", band: 0, load: true },
          { n: "L-Sit Rope Climb", ex: "rope_climb.lsit_rope_climb", band: 1 },
          { n: "Wall Climb", ex: "pull.wall_climb", band: 1 },
          { n: "Towel Pull-Up", ex: "pull.towel_pullup", band: 2 },
          { n: "Decline/Assisted Towel Pull-Up", ex: "pull.towel_pullup_assisted", band: 2 },
        ],
      },
      {
        id: "pull-02", sets: 2, tiers: [20, 50, 75], sector: "pull_levers", chain: [
          { n: "Weighted Decline Row", ex: "pull.row_decline_weighted", band: 0, load: true },
          { n: "Decline Row", ex: "pull.row_decline", band: 1 },
          { n: "Bodyweight Row", ex: "pull.row_bodyweight", band: 1 },
          { n: "Incline Row", ex: "pull.row_incline", band: 2 },
          { n: "Reverse Plank w/ Leg Raise", ex: "core.reverse_plank_leg_raise", band: 2 },
        ],
      },
      {
        id: "pull-03", sets: 2, tiers: [15, 25, 50], sector: "pull_levers", chain: [
          { n: "One-Arm BW Row w/ Rotation", ex: "pull.one_arm_row_rotation", band: 0, uni: true },
          { n: "Band Pull", ex: "pull.band_pull", band: 2 },
        ],
      },
      {
        id: "pull-04", sets: 2, tiers: [10, 20, 30], sector: "pull_levers", chain: [
          { n: "Front Lever Flutter", ex: "front_lever.fl_flutter", band: 0, sa: true },
          { n: "Tuck Front Lever Kick", ex: "front_lever.tuck_fl_kick", band: 1, sa: true },
          { n: "Bodyweight Scapula Row", ex: "pull.scap_row", band: 1 },
          { n: "Band Scapula Row", ex: "pull.scap_row_band", band: 2 },
        ],
      },
      {
        id: "pull-05", sets: 2, tiers: [15, 25, 35], sector: "pull_levers", chain: [
          { n: "Weighted Explosive Pull-Up", ex: "pull.explosive_pullup_weighted", band: 0, load: true },
          {
            n: "Weighted Pull-Up / Explosive Pull-Up", band: 0, opts: [
              { n: "Weighted Pull-Up", ex: "one_arm_pullup.wpu_25pct", load: true },
              { n: "Explosive Pull-Up", ex: "muscle_up_bar.explosive_pullup" },
            ],
          },
          { n: "Pull-Up", ex: "one_arm_pullup.pullup10", band: 1 },
          { n: "Kipping Pull-Up", ex: "pull.kipping_pullup", band: 1 },
          { n: "Pull-Up Negative", ex: "pull.pullup_negative", band: 2 },
          { n: "Assisted Pull-Up", ex: "pull.pullup_assisted", band: 2 },
        ],
      },
      {
        id: "pull-06", sets: 2, tiers: [20, 30, 50], sector: "core", chain: [
          {
            n: "Hanging Leg Raise / Weighted Hanging Frog Kick", band: 0, opts: [
              { n: "Hanging Leg Raise", ex: "core.hanging_leg_raise" },
              { n: "Weighted Hanging Frog Kick", ex: "core.hanging_frog_kick_weighted", load: true },
            ],
          },
          { n: "Hanging Frog Kick", ex: "core.hanging_frog_kick", band: 1 },
          { n: "Seated Leg Raise", ex: "core.seated_leg_raise", band: 2 },
        ],
      },
      {
        id: "pull-07", sets: 2, tiers: [20, 30, 50], sector: "pull_levers", chain: [
          { n: "Curl", ex: "pull.curl", band: 0, load: true },
          { n: "Hammer Curl", ex: "pull.hammer_curl", band: 1, load: true },
          { n: "Drag Curl", ex: "pull.drag_curl", band: 1, load: true },
          { n: "Cheat Curl", ex: "pull.cheat_curl", band: 2, load: true },
        ],
      },
      {
        // tiers not in source JSON (60 s hold); [60] supplied because Slot.tiers is required.
        id: "pull-08", type: "timed_hold", sets: 1, tiers: [60], holdSec: 60, sector: "pull_levers", chain: [
          { n: "Dead Hang", ex: "pull.dead_hang", band: 1 },
        ],
      },
      {
        // tiers not in source JSON (60 s hold); [60] supplied because Slot.tiers is required.
        id: "pull-09", type: "quasi_iso", sets: 1, tiers: [60], holdSec: 60, sector: "pull_levers", chain: [
          {
            n: "Quasi-Iso Pull-Up / Bodyweight Row", band: 0, opts: [
              { n: "Quasi-Iso Pull-Up", ex: "qi.pullup" },
              { n: "Quasi-Iso Bodyweight Row", ex: "qi.row" },
            ],
          },
          { n: "Quasi-Iso Band Row", ex: "qi.band_row", band: 2 },
        ],
      },
    ],
    push: [
      {
        id: "push-01", sets: 2, tiers: [15, 30, 50], sector: "dips_planche_hs", chain: [
          { n: "Weighted Ring Dip", ex: "dip.ring_dip_weighted", band: 0, load: true },
          { n: "Ring Dip", ex: "dip.ring_dip", band: 0 },
          { n: "Weighted Dip", ex: "dip.dip_weighted", band: 1, load: true },
          { n: "Dip", ex: "dip.dip", band: 1 },
          { n: "Assisted Dip", ex: "dip.dip_assisted", band: 1 },
          { n: "Tricep Dip", ex: "dip.tricep_dip", band: 2 },
          { n: "Assisted Tricep Dip", ex: "dip.tricep_dip_assisted", band: 2 },
        ],
      },
      {
        id: "push-02", sets: 2, tiers: [15, 25, 50], sector: "dips_planche_hs", chain: [
          { n: "Handstand Push-Up", ex: "hspu.free_hspu", band: 0 },
          { n: "Assisted Handstand Push-Up", ex: "hspu.wall_hspu_full", band: 1 },
          { n: "Decline Pike Press", ex: "hspu.elevated_pike", band: 1 },
          { n: "Pike Press", ex: "hspu.pike_pushup", band: 2 },
          { n: "Shoulder Press", ex: "push.shoulder_press", band: 2, load: true },
        ],
      },
      {
        id: "push-03", sets: 2, tiers: [20], sector: "dips_planche_hs",
        note: "PENDING-Q3: 2x20 impossible at band 0; skill-tree credit gates at doc 01 criteria (planche_pushup 3x3)",
        chain: [
          { n: "Planche Push-Up", ex: "planche.planche_pushup", band: 0, sa: true },
          { n: "Straddle Planche Push-Up", ex: "planche.straddle_planche_pushup", band: 0, sa: true },
          { n: "Tuck Planche Push-Up", ex: "planche.tuck_planche_pushup", band: 1, sa: true },
          { n: "Pseudo Planche Push-Up", ex: "planche.pseudo_planche_pushup", band: 1, sa: true },
          { n: "Knuckle Push-Up", ex: "push.knuckle_pushup", band: 1 },
          { n: "Knuckle Push-Up on Knees", ex: "push.knuckle_pushup_knees", band: 2 },
          { n: "Wall Knuckle Push-Up", ex: "push.knuckle_pushup_wall", band: 2 },
        ],
      },
      {
        id: "push-04", sets: 2, tiers: [10, 15, 30], sector: "core", chain: [
          { n: "One-Arm LaLanne Push-Up", ex: "core.lalanne_pushup_one_arm", band: 0, sa: true, uni: true },
          { n: "LaLanne Push-Up", ex: "core.lalanne_pushup", band: 1, sa: true },
          { n: "Ab Roll-Out", ex: "core.ab_rollout", band: 1, sa: true },
          { n: "Ab Roll-Out on Knees", ex: "core.ab_rollout_knees", band: 2, sa: true },
          { n: "Walk-Out to Plank", ex: "core.walkout_plank", band: 2 },
        ],
      },
      {
        id: "push-05", sets: 2, tiers: [30, 50, 100], sector: "pushup", chain: [
          { n: "Explosive Push-Up", ex: "push.explosive_pushup", band: 0 },
          { n: "Push-Up", ex: "one_arm_pushup.pushup", band: 1 },
          { n: "Push-Up on Knees", ex: "push.pushup_knees", band: 1 },
          { n: "Incline Push-Up", ex: "push.pushup_incline", band: 2 },
        ],
      },
      {
        id: "push-06", sets: 2, tiers: [15, 20, 50], sector: "pushup", chain: [
          { n: "Fingertip Push-Up", ex: "push.fingertip_pushup", band: 0 },
          { n: "Fingertip Push-Up on Knees", ex: "push.fingertip_pushup_knees", band: 1 },
          { n: "Push-Up", ex: "one_arm_pushup.pushup", band: 1 },
          { n: "Push-Up on Knees", ex: "push.pushup_knees", band: 2 },
        ],
      },
      {
        id: "push-07", sets: 2, tiers: [15, 25, 50], sector: "pushup", chain: [
          { n: "Weighted One-Arm Push-Up", ex: "push.oap_weighted", band: 0, load: true, uni: true },
          { n: "One-Arm Push-Up", ex: "one_arm_pushup.oap", band: 1, uni: true },
          { n: "Staggered-Stance Band Press", ex: "push.band_press_staggered", band: 2, uni: true },
        ],
      },
      {
        id: "push-08", sets: 2, tiers: [20, 50, 100], unit: "steps", sector: "balance", chain: [
          {
            n: "Sandbag Tug Crawl / Slow Lizard Crawl", band: 0, opts: [
              { n: "Sandbag Tug Crawl", ex: "cond.sandbag_tug_crawl", load: true },
              { n: "Slow Lizard Crawl", ex: "cond.lizard_crawl_slow" },
            ],
          },
          { n: "Lizard Crawl", ex: "cond.lizard_crawl", band: 1 },
          { n: "Foot-Hand Crawl", ex: "cond.foot_hand_crawl", band: 2 },
        ],
      },
      {
        // tiers not in source JSON (60 s hold); [60] supplied because Slot.tiers is required.
        id: "push-09", type: "quasi_iso", sets: 1, tiers: [60], holdSec: 60, sector: "pushup", chain: [
          { n: "Quasi-Iso Push-Up", ex: "qi.pushup", band: 0 },
          { n: "Quasi-Iso Incline Push-Up", ex: "qi.incline_pushup", band: 1 },
          { n: "Quasi-Iso Band Press", ex: "qi.band_press", band: 2 },
        ],
      },
    ],
    fullbody: [
      {
        id: "full-01", sets: 2, tiers: [10, 25, 30], sector: "squat", chain: [
          { n: "Cross-Body KB Clean & Press", ex: "power.kb_clean_press_crossbody", band: 0, load: true, uni: true },
          { n: "Squat Press", ex: "power.squat_press", band: 1, load: true },
          { n: "Dumbbell Squat", ex: "squat.dumbbell_squat", band: 1, load: true },
          { n: "Assisted Squat", ex: "squat.assisted_squat", band: 2 },
        ],
      },
      {
        id: "full-02", sets: 2, tiers: [10, 15, 30], sector: "back_chain", chain: [
          { n: "Sandbag Snatch", ex: "power.sandbag_snatch", band: 0, load: true },
          { n: "Sandbag Clean", ex: "power.sandbag_clean", band: 1, load: true },
          { n: "Sandbag Bent Row", ex: "power.sandbag_bent_row", band: 1, load: true },
          { n: "Bent Dumbbell Row", ex: "pull.bent_db_row", band: 2, load: true },
        ],
      },
      {
        id: "full-03", sets: 2, tiers: [10, 25, 50], sector: "run_martial", chain: [
          { n: "Man Maker", ex: "power.man_maker", band: 0, load: true },
          { n: "Devil Press", ex: "power.devil_press", band: 1, load: true },
          { n: "Burpee", ex: "cond.burpee", band: 1 },
          { n: "Incline Push-Up", ex: "push.pushup_incline", band: 2 },
        ],
      },
      {
        id: "full-04", sets: 2, tiers: [10, 25, 50], sector: "balance", chain: [
          {
            n: "Bulgarian Bag Spin / Gama Cast / Halo / KB Halo", band: 1, load: true, opts: [
              { n: "Bulgarian Bag Spin", ex: "power.bulgarian_bag_spin" },
              { n: "Gama Cast", ex: "power.gama_cast" },
              { n: "Halo", ex: "power.halo" },
              { n: "Kettlebell Halo", ex: "power.kb_halo" },
            ],
          },
        ],
      },
      {
        id: "full-05", sets: 2, tiers: [15, 20, 30], sector: "run_martial", chain: [
          { n: "Dumbbell Runner", ex: "power.db_runner", band: 1, load: true },
        ],
      },
      {
        id: "full-06", sets: 2, tiers: [15, 20, 30], sector: "pull_levers", chain: [
          { n: "Overhand Curl", ex: "pull.overhand_curl", band: 1, load: true },
        ],
      },
      {
        id: "full-07", sets: 2, tiers: [15, 25, 50], sector: "core", chain: [
          {
            n: "Med-Ball Slam / Sledgehammer / Band Woodchopper", band: 0, load: true, opts: [
              { n: "Medicine Ball Slam", ex: "power.medball_slam" },
              { n: "Sledgehammer", ex: "power.sledgehammer" },
              { n: "Band Woodchopper", ex: "power.band_woodchopper" },
            ],
          },
          { n: "X-Up", ex: "core.x_up", band: 1 },
          { n: "Knee-to-Elbow Crunch", ex: "core.elbow_to_knee", band: 2 },
        ],
      },
      {
        id: "full-08", sets: 2, tiers: [10, 15, 20], sector: "back_chain", chain: [
          {
            n: "Bodyweight / Band Face Pull", band: 1, opts: [
              { n: "Bodyweight Face Pull", ex: "pull.face_pull_bw" },
              { n: "Band Face Pull", ex: "pull.face_pull_band" },
            ],
          },
        ],
      },
      {
        id: "full-09", sets: 1, tiers: [50, 150, 200], unit: "steps", perSide: true, sector: "run_martial", chain: [
          {
            n: "Farmers' Walk Briefcase Carry / Briefcase Carry 100-Up", band: 1, load: true, opts: [
              { n: "Farmers' Walk Briefcase Carry", ex: "carry.briefcase_carry" },
              { n: "Briefcase Carry 100-Up", ex: "carry.briefcase_100up" },
            ],
          },
        ],
      },
      {
        id: "full-10", sets: 1, tiers: [50, 100, 150], unit: "skips", perSide: true, sector: "run_martial", chain: [
          { n: "Single-Leg Skipping", ex: "cond.single_leg_skip", band: 0, uni: true },
          { n: "Skipping", ex: "cond.skip", band: 1 },
          { n: "Skipping (No Rope)", ex: "cond.skip_no_rope", band: 2 },
        ],
      },
      {
        // tiers not in source JSON (5 x 60 s rounds); [60] supplied because Slot.tiers is required.
        id: "full-11", type: "rounds", sets: 5, tiers: [60], workSec: 60, restSec: 30, sector: "run_martial", chain: [
          {
            n: "Bag Work / Shadow Boxing", band: 1, opts: [
              { n: "Bag Work", ex: "cond.bag_work" },
              { n: "Shadow Boxing", ex: "cond.shadow_boxing" },
            ],
          },
        ],
      },
    ],
  },
  mobility: [
    { id: "mob-01", n: "Split Squat", holdSec: 30, perSide: true },
    { id: "mob-02", n: "Cossack Squat", holdSec: 30, perSide: true },
    { id: "mob-03", n: "Deep Squat", holdSec: 30, perSide: true },
    { id: "mob-04", n: "Prayer Squat (Namaskarasana)", holdSec: 30, note: "PDF says 30 minute; typo-corrected" },
    { id: "mob-05", n: "Squatting Internal Rotation", holdSec: 30, perSide: true },
    { id: "mob-06", n: "Cobra Stretch", holdSec: 30 },
    { id: "mob-07", n: "Downward Dog", holdSec: 30 },
    { id: "mob-08", n: "Overhead Squat", holdSec: 30 },
    { id: "mob-09", n: "Crab Reach", holdSec: 30, perSide: true },
    { id: "mob-10", n: "Half Bridge OR Full Bridge", holdSec: 30, ex: "bridge.full_bridge" },
    { id: "mob-11", n: "Hakalau Meditation", dose: { min: 5 } },
  ],
};

/** One open author question from addendum-2 §7 (`authorConfirmed:false` items). */
export interface AuthorQuestion {
  id: string;
  question: string;
  seedDefault: string;
}

/** Open author questions Q1-Q8, transcribed from addendum-2 §7 (ship-as-is defaults). */
export const authorQuestions: AuthorQuestion[] = [
  {
    id: "Q1",
    question: "Tier semantics: bands-by-difficulty (B) confirmed?",
    seedDefault: "Yes per source-doc header; §1.2 band model",
  },
  {
    id: "Q2",
    question: "Week ordering / rest days?",
    seedDefault: "legs, pull, mobility, push, fullbody per doc 03 §14; warm-up daily, mobility bookend",
  },
  {
    id: "Q3",
    question: "push-03 \"2 × 20\" at planche level — aspirational or per-band?",
    seedDefault: "Treat 20 as band-1/2 target; band-0 gated by doc 01 criteria (§1.4)",
  },
  {
    id: "Q4",
    question: "Overcoming-iso: which exercise + which 3 angles?",
    seedDefault: "Day-pattern presets, §5 table",
  },
  {
    id: "Q5",
    question: "Units: rope-climb \"reps\" (pulls vs ascents), crawl distance, wall climb meaning",
    seedDefault: "pulls; steps; wall-bar ascent",
  },
  {
    id: "Q6",
    question: "Unilateral reps per side, alternating total?",
    seedDefault: "Yes / yes (config flags)",
  },
  {
    id: "Q7",
    question: "Same-exercise-two-days policy",
    seedDefault: "Independent slots, shared volume ids (§6)",
  },
  {
    id: "Q8",
    question: "legs-04 vs legs-04-alt: choose per session or per block?",
    seedDefault: "Per mesocycle block, user-switchable",
  },
];
