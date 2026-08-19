// Extension nodes for the "squat" sector — quad / single-leg family.
//
// Why: skills.ts entered this sector at `pistol_squat.split_squat` (3×12 per side) and
// `barbell_squat.1_0xbw` (a bodyweight back squat). An untrained adult has nothing to
// stand on there. This file adds the missing on-ramp at NEGATIVE rings (chair sit-to-stand
// → assisted squat → partial box squat → full air squat → single-leg entry work) plus
// intermediate rungs inside the pistol / shrimp / cossack / power lines.
//
// Sources: docs/research/01-skill-progressions.md §3.9 (pistol + shrimp chains, the
// "20 BW squats / ankle DF ≥10 cm knee-to-wall / single-leg balance 30 s" baseline) and
// §4.1/§6 (barbell squat 1RM bands); docs/research/06-addendum-2.md §3 (seed slot targets
// legs-01/04/05/06/12, full-01) and §4 (exercise-id mapping).
//
// Ids: where a rung corresponds to an exercise the routine already logs, the node id IS the
// canonical exercise id from src/data/exercises.ts (squat.air_squat, squat.assisted_squat,
// qi.air_squat, squat.jump_squat, …) so logged sets auto-feed the tree via
// computeSkillStatuses. Purely-new rungs live under the `squat_base.` namespace.
//
// Rings are pre-normalization: buildSkills shifts the sector so its lowest ring becomes 0.
// Nothing here is straight-arm/long-lever, so no `sa` flags apply.

import type { SectorExtension } from "../skill-helpers";
import { e1rmRatio, hold, node, reps, wreps } from "../skill-helpers";

export const squatExt: SectorExtension = {
  nodes: [
    // ---------------------------------------------------------------- on-ramp
    // Ring -6 is the new sector entry point: doable on day one, no equipment.
    node("squat_base.chair_stand", "Chair Sit-to-Stand", "squat", -6, reps(10, 2), [], {
      evidence: "D",
      description: "Sit to a chair/bench and stand back up without using your hands — 2×10. The day-one entry point; no depth, load or balance demand.",
    }),
    node("squat.assisted_squat", "Assisted Squat", "squat", -5, reps(15, 2), ["squat_base.chair_stand"], {
      evidence: "D",
      description: "Hold a doorframe, TRX strap or rail and squat as deep as is comfortable — 2×15. Seed exercise (legs-04 / full-01 band 2), so logged sets credit this node automatically.",
    }),
    node("squat_base.box_squat", "Partial Box Squat", "squat", -4, reps(12, 3), ["squat.assisted_squat"], {
      evidence: "D",
      description: "Hands free, sit to a knee-height box and stand — 3×12. Partial ROM removes the deep-position mobility demand while the legs catch up.",
    }),
    node("qi.assisted_air_squat", "Assisted Squat Hold", "squat", -4, hold(60), ["squat.assisted_squat"], {
      description: "Quasi-isometric assisted air squat, 1×60 s at ~50–70% effort (seed legs-12 band 2, addendum-2 §3). Builds the tendon/quad tolerance the unassisted holds need.",
    }),
    node("squat.air_squat", "Air Squat ×20", "squat", -3, reps(20, 3), ["squat_base.box_squat"], {
      description: "Full-depth unassisted air squat, 3×20 — doc 01 §3.9's explicit prerequisite baseline (\"20 bodyweight squats\") for every single-leg line above.",
    }),
    node("squat_base.wall_sit_60", "Wall Sit 60 s", "squat", -3, hold(60), ["qi.assisted_air_squat"], {
      description: "Thighs parallel, back flat on the wall, 1×60 s. First rung of the wall-sit duration ladder.",
    }),
    node("squat_base.deep_squat_hold", "Deep Squat Hold", "squat", -3, hold(60), ["squat_base.box_squat"], {
      description: "Bottom-position hold, heels flat, 1×60 s (warm-up wu-09 / mob-03 dosed at 30 s). This is the ankle-dorsiflexion gate doc 01 §3.9 proxies with knee-to-wall ≥10 cm — the usual pistol limiter is mobility, not strength.",
    }),

    // ------------------------------------------------- base breadth (rings -2/-1)
    node("squat_base.air_squat_50", "Air Squat ×50", "squat", -2, reps(50, 2), ["squat.air_squat"], {
      description: "2×50 unbroken — the seed's legs-04 band-2 tier. Local endurance base for the loaded and power branches.",
    }),
    node("squat.hindu_squat", "Hindu Squat", "squat", -2, reps(25, 2), ["squat.air_squat"], {
      description: "2×25 (seed legs-05 band-0 tier). Heels-up, rolling squat — a same-difficulty side branch that trains knee-flexion ROM and toe balance.",
    }),
    node("qi.air_squat", "Quasi-Iso Air Squat", "squat", -2, hold(60), ["squat.air_squat", "squat_base.wall_sit_60"], {
      description: "Unassisted quasi-isometric air squat, 1×60 s (seed legs-12 band 0). Harder than the wall sit: no back support, so the trunk works too.",
    }),
    node("squat_base.sl_balance", "Single-Leg Balance", "squat", -2, hold(30, 2), ["squat.air_squat"], {
      description: "30 s per side, eyes open, free leg off the floor — doc 01 §3.9's third baseline requirement before any pistol work.",
    }),
    node("squat.reverse_lunge", "Reverse Lunge", "squat", -2, reps(20, 2), ["squat.air_squat"], {
      evidence: "D",
      description: "2×20 alternating (10 per side). Seed exercise (legs-01 band 2, logged as total alternating reps) and the gentlest single-leg entry — stepping back is easier to control than stepping out.",
    }),
    node("squat.side_lunge", "Side Lunge", "squat", -2, reps(10, 2, true), ["squat.air_squat"], {
      evidence: "D",
      description: "2×10 per side (seed legs-06, unilateral). Opens the frontal-plane branch toward cossack squats.",
    }),
    node("squat_base.static_lunge", "Static Lunge", "squat", -1, reps(8, 3, true), [
      "squat.reverse_lunge",
      "squat_base.sl_balance",
    ], {
      evidence: "D",
      description: "Feet planted in a split stance, rear knee to within 2 cm of the floor — 3×8 per side. The rung directly beneath the 3×12 split-squat hub.",
    }),
    node("squat_base.cossack_partial", "Partial Cossack Squat", "squat", -1, reps(8, 3, true), [
      "squat.side_lunge",
      "squat_base.deep_squat_hold",
    ], {
      evidence: "D",
      description: "Cossack squat to roughly half depth, heel of the working leg down — 3×8 per side. First of the cossack depth tiers.",
    }),
    node("squat.dumbbell_squat", "Dumbbell Squat", "squat", -1, wreps(10, 0.25, 2), ["squat_base.air_squat_50"], {
      evidence: "D",
      description: "2×10 holding ≈25% bodyweight (goblet or dumbbells at the sides) — seed full-01 band 1. The external-load on-ramp beneath the barbell line.",
    }),
    node("shrimp_squat.kneel_to_stand", "Kneel-to-Stand", "squat", -0.5, reps(6, 3, true), [
      "squat_base.static_lunge",
    ], {
      evidence: "D",
      description: "From tall kneeling, step one foot up and stand without hands — 3×6 per side. Trains the deep-knee-flexion pattern the shrimp line needs, and sits under the assisted shrimp.",
    }),
    node("barbell_squat.0_75xbw", "Back Squat 0.75×BW", "squat", -0.5, e1rmRatio("squat", 0.75), [
      "squat.dumbbell_squat",
    ], {
      evidence: "B",
      description: "StrengthLevel novice band (doc 01 §4.1 table) and the seed's stated barbell competency baseline (\"3×5 @ 0.75×BW\"). Entry rung beneath the 1.0×BW node.",
    }),

    // ------------------------------------------- pistol / Bulgarian line inserts
    node("pistol_squat.rfe_split_squat", "Bulgarian Split Squat", "squat", 0.5, reps(10, 3, true), [
      "pistol_squat.split_squat",
    ], {
      description: "Rear foot on a knee-height bench, 3×10 per side. Doc 01 §3.9 step 1 pairs this with the flat split squat; broken out as its own rung because the load shift to the front leg is substantial.",
    }),
    node("pistol_squat.rfe_deficit", "Deficit Bulgarian", "squat", 1.5, reps(8, 3, true), [
      "pistol_squat.rfe_split_squat",
    ], {
      evidence: "D",
      description: "Front foot on a 10–15 cm plate as well, 3×8 per side — extra range at the bottom, closer to pistol depth.",
    }),
    node("pistol_squat.rfe_weighted", "Weighted Bulgarian", "squat", 2.5, wreps(8, 0.25, 3), [
      "pistol_squat.rfe_deficit",
    ], {
      evidence: "D",
      description: "3×8 per side holding ≈25% bodyweight. Parallel strength route to the pistol for athletes whose ankle mobility is still the limiter.",
    }),
    node("pistol_squat.heel_elev_pistol", "Heel-Elevated Pistol", "squat", 2.5, reps(5, 3, true), [
      "pistol_squat.box_pistol",
    ], {
      description: "Full-depth pistol with the heel on a 2–3 cm wedge, 3×5 per side. The standard mobility workaround between the low box pistol and floor work (doc 01 §3.9 notes ankle dorsiflexion, not strength, is the usual limiter).",
    }),
    node("pistol_squat.pistol_negative", "Pistol Negative", "squat", 3.5, reps(5, 3, true), [
      "pistol_squat.counterbalance_pistol",
    ], {
      description: "5-second lower to the bottom on one leg, stand with hand support — 3×5 per side. Eccentric-only rung between the counterbalance pistol and the unaided rep.",
    }),
    node("pistol_squat.pistol_10pct", "Pistol +10% BW", "squat", 4.5, wreps(5, 0.1, 3), ["pistol_squat.pistol"], {
      description: "3×5 per side at +10% bodyweight — doc 01 §3.9 step 6 spells this out as the entry load before the +25% BW node.",
    }),

    // ------------------------------------------------------------ shrimp insert
    node("shrimp_squat.overhead", "Overhead Shrimp Squat", "squat", 2.5, reps(5, 3, true), [
      "shrimp_squat.intermediate",
    ], {
      description: "Rear foot held, arms overhead instead of counterbalancing out front — 3×5 per side (doc 01 §3.9 uses 3×5/side at every shrimp level). Bridges the torso-upright and knee-taps-floor versions.",
    }),

    // -------------------------------------------------- cossack / frontal plane
    node("squat_base.cossack_full", "Full Cossack Squat", "squat", 0.5, reps(8, 3, true), [
      "squat_base.cossack_partial",
    ], {
      evidence: "D",
      description: "Bottom of the range, working heel flat, free leg straight with the toe up — 3×8 per side.",
    }),
    node("squat.cossack_weighted", "Weighted Cossack Squat", "squat", 1.5, wreps(8, 0.25, 2), [
      "squat_base.cossack_full",
    ], {
      evidence: "D",
      description: "2×8 per side holding ≈25% bodyweight (seed legs-06 band 0, unilateral + loaded).",
    }),

    // -------------------------------------------------------------- power rungs
    node("squat.jump_squat", "Jump Squat", "squat", 0.5, reps(20, 2), ["squat_base.air_squat_50"], {
      evidence: "D",
      description: "2×20 continuous (seed legs-04 band 1 targets 25). First power rung — land quiet, knees tracking over the toes.",
    }),
    node("squat.goblet_jump_squat", "Goblet Jump Squat", "squat", 1.5, wreps(10, 0.2, 2), [
      "squat.jump_squat",
      "squat.dumbbell_squat",
    ], {
      evidence: "D",
      description: "2×10 holding ≈20% bodyweight at the chest (seed legs-04 band 0).",
    }),
    node("squat_base.depth_jump", "Depth Jump (40 cm)", "squat", 2.5, reps(5, 3), ["squat.goblet_jump_squat"], {
      evidence: "D",
      description: "Step off a 40 cm box and rebound immediately — 3×5, full rest between sets. Log only reps with a quiet, sub-0.25 s ground contact; stop the set the moment contact time visibly lengthens.",
    }),

    // ------------------------------------------------------------- quad isolate
    node("squat_base.sissy_squat", "Sissy Squat", "squat", 0.5, reps(8, 3), [
      "squat_base.air_squat_50",
      "squat_base.wall_sit_60",
    ], {
      evidence: "D",
      description: "Knees travel forward, hips stay extended, torso and thighs in one line — 3×8, holding a support with one hand as needed. Isolated quad/knee-tolerance branch; build up slowly and use partial range first.",
    }),

    // ------------------------------------------------------- box jump line
    // A dedicated jump-height line. The sector already had scattered plyometrics
    // (jump squat, goblet jump squat, depth jump) but nothing that progressed
    // toward a measurable jump, and no landing mechanics before the impact work.
    // Order is the standard plyometric ramp: land → jump-and-stick → low box →
    // height → reactive → unilateral. ALWAYS step down from the box; jumping down
    // multiplies landing force for no training benefit (doc 01 §2.1 injury load).
    node("box_jump.step_up_knee", "Knee-High Step-Up", "squat", -2.5, reps(8, 3, true), ["squat.air_squat"], {
      evidence: "D",
      description: "Step up onto a knee-height box under control, no push-off from the trailing leg — 3×8 per side. Builds the single-leg strength a landing has to absorb before any jumping starts.",
    }),
    node("box_jump.jump_land", "Jump and Stick", "squat", -2, reps(8, 3), ["box_jump.step_up_knee"], {
      evidence: "D",
      description: "Small vertical jump, land in a quarter-squat and hold it silently for 2 s — 3×8. Landing is the skill; a quiet landing means the legs are absorbing force rather than the joints.",
    }),
    node("squat.bunny_hop", "Bunny Hop", "squat", -1.9, reps(20, 2), ["box_jump.jump_land"], {
      evidence: "D",
      description: "Continuous small two-footed hops, staying on the balls of the feet — 2×20. Seed exercise (legs-05), so logged sets credit this node. Low-amplitude bouncing that builds ankle stiffness.",
    }),
    node("box_jump.box_20", "Box Jump 20 cm", "squat", -1.5, reps(5, 3), ["box_jump.jump_land", "squat.bunny_hop"], {
      evidence: "D",
      description: "3×5 onto a low step, landing softly in a quarter-squat. Step back down every rep.",
    }),
    node("box_jump.box_40", "Box Jump 40 cm", "squat", -1, reps(5, 3), ["box_jump.box_20"], {
      evidence: "D",
      description: "3×5. Reset fully between reps — this is a power exercise, not conditioning.",
    }),
    node("box_jump.box_60", "Box Jump 60 cm", "squat", 1, reps(5, 3), ["box_jump.box_40", "squat.jump_squat"], {
      evidence: "D",
      description: "3×5 onto a standard 60 cm plyo box.",
    }),
    node("box_jump.seated_box_45", "Seated Box Jump 45 cm", "squat", 1.5, reps(5, 3), ["box_jump.box_60"], {
      evidence: "C",
      description: "From a seated start, no countermovement — 3×5. Removes the stretch-shortening contribution and exposes pure concentric power, which is what stalls first when box height plateaus.",
    }),
    node("box_jump.box_75", "Box Jump 75 cm", "squat", 2, reps(3, 3), ["box_jump.box_60"], {
      evidence: "D",
      description: "3×3. Beyond this height, added box usually means more knee tuck rather than more jump — see the stunt's note.",
    }),
    node("box_jump.depth_to_box", "Depth Jump to Box", "squat", 3, reps(3, 3), [
      "box_jump.box_75",
      "squat_base.depth_jump",
    ], {
      evidence: "C",
      description: "Drop from a 40 cm box, absorb, and rebound immediately onto a second box — 3×3. Reactive strength; keep ground contact short and stop the set the moment contact time lengthens.",
    }),
    node("box_jump.sl_box_40", "1-Leg Box Jump 40cm", "squat", 3.5, reps(3, 3, true), [
      "box_jump.box_75",
      "pistol_squat.box_pistol",
    ], {
      evidence: "D",
      description: "3×3 per side. Unilateral power, and the honest test of the left/right asymmetry a two-footed jump hides.",
    }),
    node("box_jump.box_100", "Box Jump 100 cm (40 in)", "squat", 4.5, reps(1), [
      "box_jump.depth_to_box",
      "box_jump.seated_box_45",
    ], {
      isStunt: true,
      evidence: "D",
      estMonths: [9, 24],
      description:
        "A 40-inch box, landed in a stable quarter-squat. Honest caveat: box height is NOT vertical jump — a deep knee tuck adds box height without adding an inch of hip displacement. The seated box jump on the way here is the check that the height is real.",
    }),

    // --------------------------------------------- conditioning slots (legs)
    // Nodes for routine exercises that previously credited nothing. Ids are the
    // canonical exercise ids, so logged sets auto-feed the tree.
    node("cond.backward_walk", "Backward Walking", "squat", -2.6, reps(100, 2), ["squat.air_squat"], {
      evidence: "D",
      description: "2×100 steps walked backwards — legs-05 counts steps, and its band-2 target is 100. Loads the quads through a shortened knee range with almost no eccentric braking, which is why it turns up in knee rehab.",
    }),
    node("cond.backward_jog", "Backward Jogging", "squat", -2.2, reps(50, 2), ["cond.backward_walk"], {
      evidence: "D",
      description: "2×50 steps jogged backwards — legs-05 band-1 target.",
    }),
    node("squat.skater_hop", "Skater Hop", "squat", -1.8, reps(10, 2, true), ["squat_base.sl_balance"], {
      evidence: "D",
      description: "Lateral bound from foot to foot, sticking each landing — 2×10 per side. Seed warm-up. The frontal-plane counterpart to the box jump line; almost all other lower-body work here is sagittal.",
    }),
    node("squat.side_lunge_weighted", "Weighted Side Lunge", "squat", -1, reps(10, 2, true), ["squat.side_lunge"], {
      evidence: "D",
      description: "2×10 per side holding a dumbbell or kettlebell. Seed exercise (legs-06).",
    }),
    node("squat.lunge_walk", "Lunge Walk", "squat", -0.5, reps(20, 2), ["squat_base.static_lunge"], {
      evidence: "D",
      description: "20 alternating walking lunges. Seed exercise (legs-02, band 2).",
    }),
    node("squat.lunge_scissor_jump", "Lunge Scissor Jump", "squat", -0.4, reps(10, 2), [
      "squat.reverse_lunge",
      "box_jump.jump_land",
    ], {
      evidence: "D",
      description: "Jump and switch legs in the air, landing in a lunge — 10 total. Seed exercise (legs-01, band 1).",
    }),
    node("power.squat_press", "Squat Press", "squat", -0.2, reps(10, 3), ["squat.dumbbell_squat"], {
      evidence: "D",
      description: "Squat into an overhead press with dumbbells or a kettlebell — 3×10. Seed exercise (full-01).",
    }),
    node("squat.lunge_walk_weighted", "Weighted Lunge Walk", "squat", 0, reps(20, 2), ["squat.lunge_walk"], {
      evidence: "D",
      description: "20 walking lunges carrying dumbbells. Seed exercise (legs-02, band 1).",
    }),
    node("power.kb_clean_press_crossbody", "Cross-Body Clean & Press", "squat", 0.2, reps(8, 3, true), [
      "squat.dumbbell_squat",
    ], {
      evidence: "D",
      description: "Kettlebell cleaned across the body and pressed — 3×8 per side. Seed exercise (full-01).",
    }),
    node("squat.olj_knee_thrust", "1-Leg Jump Squat", "squat", 1.2, reps(10, 2), [
      "squat.lunge_scissor_jump",
      "squat.jump_squat",
    ], {
      evidence: "D",
      description: "Single-leg jump squat driving the free knee up — 10 total, alternating. Seed exercise (legs-01, band 0) and the hardest rung of that chain.",
    }),

    // ------------------------------------------------ loaded feats (barbell)
    // Depth and breadth on the barbell side: the sector had exactly one ladder (back
    // squat). Criteria are weighted-reps ratios read from the quick lift-log, not e1RM â
    // no StrengthLevel table covers these lifts and inventing one would be dishonest.
    node("front_squat.0_75xbw", "Front Squat 0.75×BW", "squat", 0.5, wreps(1, 0.75), [
      "barbell_squat.1_0xbw",
    ], { evidence: "D", description: "Rack position, elbows high, torso vertical. A front squat runs roughly 80-85% of a back squat for most lifters." }),
    node("front_squat.1_0xbw", "Front Squat BW", "squat", 1.5, wreps(1, 1), ["front_squat.0_75xbw"], {
      evidence: "D",
      description: "Bodyweight on the front rack. The upper back usually gives out before the legs do.",
    }),
    node("front_squat.1_5xbw", "Front Squat 1.5×BW", "squat", 2.5, wreps(1, 1.5), ["front_squat.1_0xbw"], {
      isStunt: true, evidence: "D", estMonths: [18, 42],
      description: "1.5× bodyweight held on the front rack — an Olympic-lifting benchmark, and the honest test of whether a big back squat is legs or leverage. ♀ criterion 1.08×BW.",
    }),
    node("overhead_squat.0_5xbw", "OH Squat 0.5×BW", "squat", 1, wreps(1, 0.5), ["barbell_squat.1_0xbw"], {
      evidence: "D",
      description: "Bar locked overhead, arms straight, squat to depth. At first this is almost entirely a shoulder and thoracic mobility problem, not a strength one.",
    }),
    node("overhead_squat.0_75xbw", "OH Squat 0.75×BW", "squat", 2, wreps(1, 0.75), ["overhead_squat.0_5xbw"], {
      evidence: "D", description: "The same lift with a real load overhead.",
    }),
    node("overhead_squat.bw", "Bodyweight OH Squat", "squat", 3, wreps(1, 1), ["overhead_squat.0_75xbw"], {
      isStunt: true, evidence: "D", estMonths: [18, 48],
      description: "Your own bodyweight held overhead at the bottom of a full squat. One of the best-looking lifts there is, and the hardest mobility standard in the app. ♀ criterion 0.72×BW.",
    }),
    node("barbell.zercher_squat", "Zercher Squat BW", "squat", 2, wreps(1, 1), ["barbell_squat.1_5xbw"], {
      evidence: "D",
      description: "Bar carried in the crook of the elbows. Brutal on the upper back, and the only squat variant that actively fights spinal flexion. The bruises are part of it.",
    }),

    // ------------------------------------------- on-ramp lateral variants
    // Stance and tempo variations on the air squat: same difficulty, different demand,
    // and a way to spend useful weeks at the bottom of the sector.
    node("squat_base.sumo_squat", "Sumo Air Squat", "squat", -2.8, reps(15, 3), ["squat.air_squat"], {
      evidence: "D",
      description: "Wide stance, toes out — more adductor and glute, and far kinder to stiff ankles than a narrow squat.",
    }),
    node("squat_base.narrow_squat", "Narrow Air Squat", "squat", -2.8, reps(15, 3), ["squat.air_squat"], {
      evidence: "D", description: "Feet together. Quad-dominant, and a real ankle-mobility test.",
    }),
    node("squat_base.heels_elevated", "Heels-Up Squat", "squat", -2.8, reps(15, 3), ["squat.air_squat"], {
      evidence: "D",
      description: "Heels on a book or a plate. Lets a stiff ankle reach depth today while the mobility catches up.",
    }),
    node("squat_base.tempo_squat", "Tempo Air Squat", "squat", -2.7, reps(8, 3), ["squat.air_squat"], {
      evidence: "D",
      description: "3 s down, 1 s pause, 1 s up — 3×8. Time under tension with no load, and the fastest way to find where the squat actually fails.",
    }),
  ],

  // Splice the new easier work beneath the hubs that skills.ts already owns.
  rewire: {
    // doc 01 §3.9 baseline: 20 BW squats + ankle DF ≥10 cm + single-leg balance 30 s,
    // which static_lunge (via reverse lunge + balance) and deep_squat_hold now encode.
    "pistol_squat.split_squat": ["squat_base.static_lunge", "squat_base.deep_squat_hold"],
    "pistol_squat.counterbalance_pistol": ["pistol_squat.heel_elev_pistol"],
    "pistol_squat.pistol": ["pistol_squat.pistol_negative"],
    "pistol_squat.weighted_pistol": ["pistol_squat.pistol_10pct"],
    "shrimp_squat.assisted": ["shrimp_squat.kneel_to_stand"],
    "shrimp_squat.advanced": ["shrimp_squat.overhead"],
    "barbell_squat.1_0xbw": ["barbell_squat.0_75xbw"],
  },
};
