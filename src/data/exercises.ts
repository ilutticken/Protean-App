// Exercise catalog for Protean.
// Ids + sectors: docs/research/06-addendum-2.md §3 (each exercise takes its slot's sector).
// Pattern + planes: docs/research/04-assessment-domains.md §1.2 mapping table (judged where the
// table has no row — marked "judged" below).
// bwLoadFactor: docs/research/06-addendum-3.md §3/§6 canonical `bw_load_fraction` constants
// (static bottom-position convention). Values marked "estimate" are reduced judged values for
// incline/assisted/partial variants; they are NOT addendum-3 canonical numbers.
// loadable: true where the seed shows a load/loadOpt channel for the exercise (addendum-2 §3).

import type { Exercise, MovementPattern, Plane, Sector } from "../lib/types";

// Addendum-3 §6 canonical bw_load_fraction constants (NORMATIVE — do not re-derive).
const F_PUSHUP = 0.750;
const F_PUSHUP_KNEE = 0.618;
const F_PUSHUP_HANDS_30CM = 0.55; // canonical "pushup_hands_30cm" — used for incline push-up variants
const F_PULLUP_DIP = 0.956;
const F_PISTOL = 0.839;
const F_SQUAT_BODY = 0.878;
const F_INVERTED_ROW = 0.72; // canonical "inverted_row"

type Extra = { bwLoadFactor?: number; loadable?: boolean };

// Compact constructor for one Exercise record (internal helper).
const e = (
  id: string,
  name: string,
  sector: Sector,
  pattern: MovementPattern,
  planes: Plane[],
  extra: Extra = {},
): Exercise => ({ id, name, sector, pattern, planes, ...extra });

const list: Exercise[] = [
  // --- squat / lunge families (legs day; addendum-2 §3 "legs") -------------------------------
  e("squat.olj_knee_thrust", "One-Legged Jump Squat w/ Knee Thrust", "squat", "lunge", ["sagittal"]),
  e("squat.lunge_scissor_jump", "Lunge Scissor Jump", "squat", "lunge", ["sagittal"]),
  e("squat.reverse_lunge", "Reverse Lunge", "squat", "lunge", ["sagittal"]),
  e("pistol_squat.weighted_pistol", "Weighted Pistol Squat", "squat", "lunge", ["sagittal"], { bwLoadFactor: F_PISTOL, loadable: true }),
  e("pistol_squat.pistol", "Pistol Squat", "squat", "lunge", ["sagittal"], { bwLoadFactor: F_PISTOL }),
  e("squat.lunge_walk_weighted", "Weighted Lunge Walk", "squat", "lunge", ["sagittal"], { loadable: true }),
  e("squat.lunge_walk", "Lunge Walk", "squat", "lunge", ["sagittal"]),
  e("squat.goblet_jump_squat", "Goblet Jump Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: F_SQUAT_BODY, loadable: true }),
  e("squat.jump_squat", "Jump Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: F_SQUAT_BODY }),
  e("squat.air_squat", "Air Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: F_SQUAT_BODY }),
  e("squat.assisted_squat", "Assisted Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: 0.70 }), // estimate: assisted, below canonical 0.878
  e("squat.hindu_squat", "Hindu Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: F_SQUAT_BODY }),
  e("squat.bunny_hop", "Bunny Hop", "squat", "squat", ["sagittal"]),
  e("squat.cossack_weighted", "Weighted Cossack Squat", "squat", "lunge", ["frontal"], { loadable: true }),
  e("squat.side_lunge_weighted", "Weighted Side Lunge", "squat", "lunge", ["frontal"], { loadable: true }),
  e("squat.side_lunge", "Side Lunge", "squat", "lunge", ["frontal"]),
  e("squat.skater_hop", "Skater Hop", "squat", "lunge", ["frontal"]),
  e("squat.dumbbell_squat", "Dumbbell Squat", "squat", "squat", ["sagittal"], { loadable: true }),
  // legs-05 lives in a squat-sector slot; the two backward-gait steps are locomotion pattern.
  e("cond.backward_jog", "Backward Jogging", "squat", "locomotion", ["sagittal"]),
  e("cond.backward_walk", "Backward Walking", "squat", "locomotion", ["sagittal"]),

  // --- hinge / posterior chain (doc 04 §1.2: posterior-legs sector -> HINGE) -----------------
  e("hinge.rdl", "Romanian Deadlift", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("hinge.good_morning_weighted", "Weighted Good Morning", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("hinge.good_morning", "Bodyweight Good Morning", "posterior", "hinge", ["sagittal"]),
  e("hinge.kb_swing_overspeed", "Overspeed Kettlebell Swing", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("hinge.kb_swing", "Kettlebell Swing", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("hinge.glute_bridge_weighted", "Weighted Glute Bridge", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("hinge.glute_bridge_unilateral", "Unilateral Glute Bridge", "posterior", "hinge", ["sagittal"]),
  e("bridge.glute_bridge", "Glute Bridge", "posterior", "hinge", ["sagittal"]),
  e("bridge.full_bridge", "Full Bridge", "back_chain", "hinge", ["sagittal"]), // mob-10; bridge -> back-chain sector (doc 04 §1.2)
  e("squat.deficit_calf_raise", "Deficit Calf Raise", "posterior", "hinge", ["sagittal"], { loadable: true }), // pattern judged via posterior-sector row
  e("squat.calf_raise", "Calf Raise", "posterior", "hinge", ["sagittal"]), // pattern judged via posterior-sector row

  // --- core (legs + pull + push days) --------------------------------------------------------
  e("core.x_up", "X-Up", "core", "core", ["sagittal"]),
  e("core.bicycle_situp", "Bicycle Sit-Up", "core", "core", ["sagittal", "transverse"]),
  e("core.elbow_to_knee", "Elbow to Knee", "core", "core", ["sagittal", "transverse"]),
  e("core.lsit_flutter", "L-Sit Flutter", "core", "core", ["sagittal"]),
  e("core.lying_leg_raise", "Lying Leg Raise", "core", "core", ["sagittal"]),
  e("core.lying_leg_flutter", "Lying Leg Flutter", "core", "core", ["sagittal"]),
  e("core.hanging_leg_raise", "Hanging Leg Raise", "core", "core", ["sagittal"]),
  e("core.hanging_frog_kick_weighted", "Weighted Hanging Frog Kick", "core", "core", ["sagittal"], { loadable: true }),
  e("core.hanging_frog_kick", "Hanging Frog Kick", "core", "core", ["sagittal"]),
  e("core.seated_leg_raise", "Seated Leg Raise", "core", "core", ["sagittal"]),
  e("core.reverse_plank_leg_raise", "Reverse Plank w/ Leg Raise", "pull_levers", "core", ["sagittal"]), // sector from slot pull-02
  e("core.lalanne_pushup_one_arm", "One-Arm LaLanne Push-Up", "core", "core", ["sagittal"]),
  e("core.lalanne_pushup", "LaLanne Push-Up", "core", "core", ["sagittal"]),
  e("core.ab_rollout", "Ab Roll-Out", "core", "core", ["sagittal"]),
  e("core.ab_rollout_knees", "Ab Roll-Out on Knees", "core", "core", ["sagittal"]),
  e("core.walkout_plank", "Walk-Out to Plank", "core", "core", ["sagittal"]),

  // --- carries + gait conditioning (doc 04 §1.2: carries -> carry, frontal stabilization) ----
  e("carry.bilateral_carry", "Bilateral Loaded Carry", "run_martial", "carry", ["frontal"], { loadable: true }),
  e("carry.briefcase_carry", "Farmers' Walk Briefcase Carry", "run_martial", "carry", ["frontal"], { loadable: true }),
  e("carry.briefcase_100up", "Briefcase Carry 100-Up", "run_martial", "carry", ["frontal", "sagittal"], { loadable: true }),
  e("cond.100up_major", "100-Up Major", "run_martial", "locomotion", ["sagittal"]),
  e("cond.100up_minor", "100-Up Minor", "run_martial", "locomotion", ["sagittal"]),
  e("cond.single_leg_skip", "Single-Leg Skipping", "run_martial", "locomotion", ["sagittal"]),
  e("cond.skip", "Skipping", "run_martial", "locomotion", ["sagittal"]),
  e("cond.skip_no_rope", "Skipping (No Rope)", "run_martial", "locomotion", ["sagittal"]),

  // --- quasi-iso finishers (doc 04 §1.2: QI holds inherit parent pattern) --------------------
  e("qi.air_squat", "Quasi-Isometric Air Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: F_SQUAT_BODY }),
  e("qi.assisted_air_squat", "Quasi-Isometric Assisted Air Squat", "squat", "squat", ["sagittal"], { bwLoadFactor: 0.70 }), // estimate: assisted
  e("qi.pullup", "Quasi-Iso Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("qi.row", "Quasi-Iso Bodyweight Row", "pull_levers", "horizontal-pull", ["sagittal"], { bwLoadFactor: F_INVERTED_ROW }),
  e("qi.band_row", "Quasi-Iso Band Row", "pull_levers", "horizontal-pull", ["sagittal"]),
  e("qi.pushup", "Quasi-Iso Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP }),
  e("qi.incline_pushup", "Quasi-Iso Incline Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP_HANDS_30CM }), // estimate: incline height unspecified
  e("qi.band_press", "Quasi-Iso Band Press", "pushup", "horizontal-push", ["sagittal"]),

  // --- vertical pull (doc 04 §1.2: VPULL, frontal-adduction/sagittal mix) --------------------
  e("rope_climb.weighted_climb", "Weighted L-Sit Rope Climb", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { loadable: true }),
  e("rope_climb.lsit_rope_climb", "L-Sit Rope Climb", "pull_levers", "vertical-pull", ["frontal", "sagittal"]),
  e("pull.wall_climb", "Wall Climb", "pull_levers", "vertical-pull", ["frontal", "sagittal"]),
  e("pull.towel_pullup", "Towel Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("pull.towel_pullup_assisted", "Decline/Assisted Towel Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: 0.70 }), // estimate: assisted
  e("pull.explosive_pullup_weighted", "Weighted Explosive Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP, loadable: true }),
  e("one_arm_pullup.wpu_25pct", "Weighted Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP, loadable: true }),
  e("muscle_up_bar.explosive_pullup", "Explosive Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("one_arm_pullup.pullup10", "Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("pull.kipping_pullup", "Kipping Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: 0.75 }), // estimate: kip momentum reduces effective load
  e("pull.pullup_negative", "Pull-Up Negative", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("pull.pullup_assisted", "Assisted Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: 0.70 }), // estimate: assisted
  e("pull.dead_hang", "Dead Hang", "pull_levers", "vertical-pull", ["sagittal"], { bwLoadFactor: F_PULLUP_DIP }), // hang carries the pull-up fraction (BW minus forearms+hands)

  // --- horizontal pull (doc 04 §1.2: rows + front-lever chain -> HPULL) ----------------------
  e("pull.row_decline_weighted", "Weighted Decline Row", "pull_levers", "horizontal-pull", ["sagittal"], { bwLoadFactor: 0.85, loadable: true }), // estimate: feet elevated, above canonical 0.72 row
  e("pull.row_decline", "Decline Row", "pull_levers", "horizontal-pull", ["sagittal"], { bwLoadFactor: 0.85 }), // estimate: feet elevated
  e("pull.row_bodyweight", "Bodyweight Row", "pull_levers", "horizontal-pull", ["sagittal"], { bwLoadFactor: F_INVERTED_ROW }),
  e("pull.row_incline", "Incline Row", "pull_levers", "horizontal-pull", ["sagittal"], { bwLoadFactor: 0.55 }), // estimate: upright angle, below canonical 0.72 row
  e("pull.one_arm_row_rotation", "One-Arm BW Row w/ Rotation", "pull_levers", "horizontal-pull", ["sagittal", "transverse"]),
  e("pull.band_pull", "Band Pull", "pull_levers", "horizontal-pull", ["sagittal"]),
  e("front_lever.fl_flutter", "Front Lever Flutter", "pull_levers", "horizontal-pull", ["sagittal"]),
  e("front_lever.tuck_fl_kick", "Tuck Front Lever Kick", "pull_levers", "horizontal-pull", ["sagittal"]),
  e("pull.scap_row", "Bodyweight Scapula Row", "pull_levers", "horizontal-pull", ["sagittal"], { bwLoadFactor: F_INVERTED_ROW }), // estimate: row-position scap retraction
  e("pull.scap_row_band", "Band Scapula Row", "pull_levers", "horizontal-pull", ["sagittal"]),
  e("pull.bent_db_row", "Bent Dumbbell Row", "back_chain", "horizontal-pull", ["sagittal"], { loadable: true }),
  e("pull.face_pull_bw", "Bodyweight Face Pull", "back_chain", "horizontal-pull", ["sagittal", "transverse"]),
  e("pull.face_pull_band", "Band Face Pull", "back_chain", "horizontal-pull", ["sagittal", "transverse"]),

  // --- curls (judged: elbow-flexion accessory grouped with vertical pulling; no doc 04 row) --
  e("pull.curl", "Curl", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),
  e("pull.hammer_curl", "Hammer Curl", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),
  e("pull.drag_curl", "Drag Curl", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),
  e("pull.cheat_curl", "Cheat Curl", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),
  e("pull.overhand_curl", "Overhand Curl", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),

  // --- dips (doc 04 §1.2: dips -> VPUSH, downward-vertical) ----------------------------------
  e("dip.ring_dip_weighted", "Weighted Ring Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: F_PULLUP_DIP, loadable: true }),
  e("dip.ring_dip", "Ring Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("dip.dip_weighted", "Weighted Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: F_PULLUP_DIP, loadable: true }),
  e("dip.dip", "Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: F_PULLUP_DIP }),
  e("dip.dip_assisted", "Assisted Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: 0.70 }), // estimate: assisted
  e("dip.tricep_dip", "Tricep Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: 0.60 }), // estimate: bench dip, feet supported
  e("dip.tricep_dip_assisted", "Assisted Tricep Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: 0.45 }), // estimate: assisted bench dip

  // --- vertical push: HSPU line + shoulder press (doc 04 §1.2: pike PU -> HSPU = VPUSH) ------
  // No canonical bwLoadFactor exists for the HSPU/pike family in addendum-3 — left undefined.
  e("hspu.free_hspu", "Handstand Push-Up", "dips_planche_hs", "vertical-push", ["sagittal"]),
  e("hspu.wall_hspu_full", "Assisted Handstand Push-Up", "dips_planche_hs", "vertical-push", ["sagittal"]),
  e("hspu.elevated_pike", "Decline Pike Press", "dips_planche_hs", "vertical-push", ["sagittal"]),
  e("hspu.pike_pushup", "Pike Press", "dips_planche_hs", "vertical-push", ["sagittal"]),
  e("push.shoulder_press", "Shoulder Press", "dips_planche_hs", "vertical-push", ["sagittal"], { loadable: true }),

  // --- horizontal push: planche chain + push-ups (doc 04 §1.2: push-up/planche -> HPUSH) -----
  // Planche variants exceed the canonical push-up fraction; no addendum-3 constant — undefined.
  e("planche.planche_pushup", "Planche Push-Up", "dips_planche_hs", "horizontal-push", ["sagittal"]),
  e("planche.straddle_planche_pushup", "Straddle Planche Push-Up", "dips_planche_hs", "horizontal-push", ["sagittal"]),
  e("planche.tuck_planche_pushup", "Tuck Planche Push-Up", "dips_planche_hs", "horizontal-push", ["sagittal"]),
  e("planche.pseudo_planche_pushup", "Pseudo Planche Push-Up", "dips_planche_hs", "horizontal-push", ["sagittal"]),
  e("push.knuckle_pushup", "Knuckle Push-Up", "dips_planche_hs", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP }), // sector from slot push-03
  e("push.knuckle_pushup_knees", "Knuckle Push-Up on Knees", "dips_planche_hs", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP_KNEE }),
  e("push.knuckle_pushup_wall", "Wall Knuckle Push-Up", "dips_planche_hs", "horizontal-push", ["sagittal"], { bwLoadFactor: 0.30 }), // estimate: near-vertical wall push
  e("push.explosive_pushup", "Explosive Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP }), // static bottom-position fraction (convention)
  e("one_arm_pushup.pushup", "Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP }),
  e("push.pushup_knees", "Push-Up on Knees", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP_KNEE }),
  e("push.pushup_incline", "Incline Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP_HANDS_30CM }), // estimate: incline height unspecified, canonical 30 cm value used
  e("push.fingertip_pushup", "Fingertip Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP }), // same body position, load borne on fingertips
  e("push.fingertip_pushup_knees", "Fingertip Push-Up on Knees", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP_KNEE }),
  e("push.oap_weighted", "Weighted One-Arm Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP, loadable: true }), // same fraction, borne on one arm
  e("one_arm_pushup.oap", "One-Arm Push-Up", "pushup", "horizontal-push", ["sagittal"], { bwLoadFactor: F_PUSHUP }), // same fraction, borne on one arm
  e("push.band_press_staggered", "Staggered-Stance Band Press", "pushup", "horizontal-push", ["sagittal", "transverse"]),

  // --- crawls (push-08, balance sector; doc 04 §1.2: crawling -> LOCO) -----------------------
  e("cond.sandbag_tug_crawl", "Sandbag Tug Crawl", "balance", "locomotion", ["sagittal", "transverse"], { loadable: true }),
  e("cond.lizard_crawl_slow", "Slow Lizard Crawl", "balance", "locomotion", ["sagittal", "transverse"]),
  e("cond.lizard_crawl", "Lizard Crawl", "balance", "locomotion", ["sagittal", "transverse"]),
  e("cond.foot_hand_crawl", "Foot-Hand Crawl", "balance", "locomotion", ["sagittal", "transverse"]),

  // --- full-body power / conditioning (addendum-2 §3 "fullbody") -----------------------------
  e("power.kb_clean_press_crossbody", "Cross-Body KB Clean & Press", "squat", "power", ["sagittal", "transverse"], { loadable: true }),
  e("power.squat_press", "Squat Press", "squat", "power", ["sagittal"], { loadable: true }),
  e("power.sandbag_snatch", "Sandbag Snatch", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("power.sandbag_clean", "Sandbag Clean", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("power.sandbag_bent_row", "Sandbag Bent Row", "back_chain", "horizontal-pull", ["sagittal"], { loadable: true }),
  e("power.man_maker", "Man Maker", "run_martial", "power", ["sagittal"], { loadable: true }),
  e("power.devil_press", "Devil Press", "run_martial", "power", ["sagittal"], { loadable: true }),
  e("cond.burpee", "Burpee", "run_martial", "power", ["sagittal"]), // judged: whole-body conditioning
  // Rotational/circumduction work -> CORE rotation, transverse (doc 04 §1.2 twist-work row).
  e("power.bulgarian_bag_spin", "Bulgarian Bag Spin", "balance", "core", ["transverse"], { loadable: true }),
  e("power.gama_cast", "Gama Cast", "balance", "core", ["transverse"], { loadable: true }),
  e("power.halo", "Halo", "balance", "core", ["transverse"], { loadable: true }),
  e("power.kb_halo", "Kettlebell Halo", "balance", "core", ["transverse"], { loadable: true }),
  e("power.db_runner", "Dumbbell Runner", "run_martial", "locomotion", ["sagittal"], { loadable: true }),
  e("power.medball_slam", "Medicine Ball Slam", "core", "core", ["sagittal", "transverse"], { loadable: true }), // doc 04: throws -> CORE rotation
  e("power.sledgehammer", "Sledgehammer", "core", "core", ["transverse", "sagittal"], { loadable: true }),
  e("power.band_woodchopper", "Band Woodchopper", "core", "core", ["transverse"], { loadable: true }),
  e("cond.bag_work", "Bag Work", "run_martial", "power", ["transverse", "sagittal"]), // judged: striking = rotational power
  e("cond.shadow_boxing", "Shadow Boxing", "run_martial", "power", ["transverse", "sagittal"]),

  // --- barbell standards lifts (addendum-3 §4 StrengthLevel lifts; sectors judged) -----------
  e("barbell.back_squat", "Barbell Back Squat", "squat", "squat", ["sagittal"], { loadable: true }),
  e("barbell.bench_press", "Barbell Bench Press", "pushup", "horizontal-push", ["sagittal"], { loadable: true }),
  e("barbell.deadlift", "Barbell Deadlift", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("barbell.ohp", "Barbell Overhead Press", "dips_planche_hs", "vertical-push", ["sagittal"], { loadable: true }),
  e("barbell.row", "Barbell Bent-Over Row", "back_chain", "horizontal-pull", ["sagittal"], { loadable: true }),
  e("barbell.curl", "Barbell Curl", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),
  e("barbell.hip_thrust", "Barbell Hip Thrust", "posterior", "hinge", ["sagittal"], { loadable: true }),

  // --- Loaded feats: barbell variants and odd-object lifts -----------------------------
  // Not in the routine — these are tested from Stats -> "Test a lift" and exist so the
  // weightlifting / weighted-calisthenics side of the stunt map has depth and breadth.
  // Deliberately absent from standardsKeyByExercise: no StrengthLevel table covers them,
  // so they feed skill criteria (weighted-reps ratios) but never e1RM or the radar.
  e("barbell.front_squat", "Barbell Front Squat", "squat", "squat", ["sagittal"], { loadable: true }),
  e("barbell.overhead_squat", "Overhead Squat", "squat", "squat", ["sagittal"], { loadable: true }),
  e("barbell.zercher_squat", "Zercher Squat", "squat", "squat", ["sagittal"], { loadable: true }),
  e("barbell.suitcase_deadlift", "Suitcase Deadlift", "posterior", "hinge", ["frontal"], { loadable: true }),
  e("barbell.jefferson_deadlift", "Jefferson Deadlift", "posterior", "hinge", ["transverse"], { loadable: true }),
  e("barbell.hack_lift", "Barbell Hack Lift", "posterior", "hinge", ["sagittal"], { loadable: true }),
  e("barbell.steinborn", "Steinborn Lift", "posterior", "squat", ["frontal"], { loadable: true }),
  e("barbell.power_snatch", "Power Snatch", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("barbell.snatch_balance", "Snatch Balance", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("barbell.sots_press", "Sots Press", "back_chain", "vertical-push", ["sagittal"], { loadable: true }),
  e("barbell.clean_and_jerk", "Clean & Jerk", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("barbell.power_clean", "Power Clean", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("barbell.clean_and_press", "Clean & Press", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("barbell.snatch", "Snatch (full)", "back_chain", "power", ["sagittal"], { loadable: true }),
  e("barbell.two_hands_anyhow", "Two Hands Anyhow", "dips_planche_hs", "vertical-push", ["frontal"], { loadable: true }),
  e("kb.turkish_getup", "Turkish Get-Up", "dips_planche_hs", "vertical-push", ["transverse"], { loadable: true }),
  e("kb.windmill", "Windmill", "dips_planche_hs", "core", ["frontal"], { loadable: true }),
  e("kb.bent_press", "Bent Press", "dips_planche_hs", "vertical-push", ["frontal"], { loadable: true }),
  e("db.crucifix_hold", "Crucifix Hold", "dips_planche_hs", "vertical-push", ["frontal"], { loadable: true }),
  e("pull.weighted_muscleup", "Weighted Muscle-Up", "pull_levers", "vertical-pull", ["sagittal"], { loadable: true }),
  // Weighted-calisthenics standards aliases (ids not used by the seed, addendum-3 §4.1).
  e("pull.weighted_pullup", "Weighted Pull-Up", "pull_levers", "vertical-pull", ["frontal", "sagittal"], { bwLoadFactor: F_PULLUP_DIP, loadable: true }),
  e("dip.weighted_dip", "Weighted Dip", "dips_planche_hs", "vertical-push", ["sagittal"], { bwLoadFactor: F_PULLUP_DIP, loadable: true }),
];

/** Canonical exercise catalog keyed by id — every ex id used in seedPlan resolves here (addendum-2 §3). */
export const exercises: Record<string, Exercise> = Object.fromEntries(list.map((x) => [x.id, x]));

/** StrengthLevel standards-table lift keys shipped in addendum-3 §4.1. */
export type StandardsLiftKey =
  | "back_squat"
  | "bench_press"
  | "deadlift"
  | "ohp"
  | "barbell_row"
  | "curl"
  | "hip_thrust"
  | "weighted_pullup"
  | "weighted_dip";

/**
 * Exercise id -> standards lift key, ONLY where the exercise IS that standards lift
 * (addendum-3 §4.1). Deliberately sparse: e.g. hinge.rdl is NOT deadlift, bent DB row is
 * NOT barbell_row, ring dips are NOT the dip standard.
 */
export const standardsKeyByExercise: Record<string, StandardsLiftKey> = {
  "barbell.back_squat": "back_squat",
  "barbell.bench_press": "bench_press",
  "barbell.deadlift": "deadlift",
  "barbell.ohp": "ohp",
  "barbell.row": "barbell_row",
  "barbell.curl": "curl",
  "barbell.hip_thrust": "hip_thrust",
  "one_arm_pullup.wpu_25pct": "weighted_pullup",
  "pull.weighted_pullup": "weighted_pullup",
  "dip.dip_weighted": "weighted_dip",
  "dip.weighted_dip": "weighted_dip",
  "push.shoulder_press": "ohp",
  "pull.curl": "curl",
};
