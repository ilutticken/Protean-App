// Extension nodes for the "pushup" sector (horizontal press).
//
// WHY: skills.ts starts this sector at 3×20 full push-ups (`one_arm_pushup.pushup`) and
// 0.75×BW bench — both are intermediate. An untrained beginner had nothing to stand on.
// This file adds a true on-ramp (wall → counter → knee → incline → partial → negative →
// first rep → 3×10 → the 3×20 hub), fills the oversized gaps above the hub, and adds
// equal-difficulty side branches (fingertip, knuckle, decline, deficit, plyo, unilateral).
//
// Sources:
//  - doc 01 §3.7 (one-arm push-up line, prereq baseline "20 clean push-ups; 30 s rigid
//    high plank") and §0.3 R-DYN (3×5 → 3×8 rep-based advance rule);
//  - doc 06-addendum-3 §3.2/§3.3 + doc 02 §5.1 load fractions, which give the objective
//    ORDERING of the on-ramp (Ebben 2011 peak GRF, one consistent convention):
//      hands 61 cm 41% < knees 49% < hands 30 cm 55% < flat 64% < feet 30 cm 70% <
//      feet 61 cm 75%  — i.e. a counter-height incline really is easier than knee
//      push-ups, and a bench-height incline is harder than them. The wall is an
//      unmeasured extrapolation below 41% (tier D placement, tier C as a coaching step).
//    The rep NUMBERS on each node are coaching consensus / interpolation → evidence C/D.
//
// RINGS: buildSkills() normalizes per sector by subtracting the sector minimum, so the
// shift applied to this sector is |min ring|. Two dips_planche_hs nodes at ring 1
// (`hspu.pike_pushup`, `planche.lean`) take `one_arm_pushup.pushup` as a prereq, and the
// strict-ring test compares ACROSS sectors — so the pushup shift must stay < 1 or those
// edges invert. Hence the on-ramp uses fractional negative rings in (-1, 0) rather than
// -1/-2/-3, and intermediate rungs use x.5 between existing integer rings.
// (See the openIssues note: a dense-rank normalization would allow integer rings.)

import type { SectorExtension } from "../skill-helpers";
import { e1rmRatio, hold, node, reps } from "../skill-helpers";

const S = "pushup" as const;

export const pushupExt: SectorExtension = {
  nodes: [
    // ------------------------------------------------------------------ on-ramp
    // Day-one entries (no prereqs): the two things an untrained adult can always do.
    node("pushup_base.wall_pushup", "Wall Push-Up", S, -0.9, reps(20, 3), [], {
      estMonths: [0, 1],
      description:
        "Hands on a wall at chest height, feet one step back, body one line from ear to heel. Lower until the nose touches. 3×20 before moving to a lower surface.",
    }),
    node("pushup_base.high_plank", "High Plank", S, -0.9, hold(30, 3), [], {
      description:
        "3×30 s rigid straight-arm plank — ribs down, glutes on. Doc 01 §3.7 names this as the position gate for the whole push-up line.",
    }),

    // Barbell on-ramp for the bench line. Kept at the sector MINIMUM ring so it normalizes
    // to ring 0: the bench chain has no other root and skills.test.ts requires every
    // isStunt node (here barbell_bench.1_5xbw) to be reachable from a ring-0 node.
    node("barbell_bench.0_5xbw", "Bench Press 0.5×BW", S, -0.9, e1rmRatio("bench", 0.5), [], {
      evidence: "D",
      description:
        "On-ramp below the existing 0.75×BW node: half-bodyweight bench with a coached setup (feet planted, bar to sternum, no bounce, full lockout).",
    }),

    node("pushup_base.counter_pushup", "Counter Push-Up", S, -0.8, reps(15, 3), ["pushup_base.wall_pushup"], {
      description:
        "Hands on a kitchen counter / waist-high rail (~60 cm): ≈41% BW vs 64% flat (Ebben 2011, doc 02 §5.1). 3×15 full ROM, chest to hands.",
    }),

    node("push.pushup_knees", "Knee Push-Up", S, -0.7, reps(15, 3), [
      "pushup_base.counter_pushup",
      "pushup_base.high_plank",
    ], {
      description:
        "≈49% BW (Ebben 2011). Knees, hips and shoulders in ONE line — no hip hinge — chest to the floor. Feeds slot push-05/push-06.",
    }),

    node("push.pushup_incline", "Incline Push-Up", S, -0.6, reps(15, 3), ["push.pushup_knees"], {
      description:
        "Hands on a bench/box ~30 cm high: ≈55% BW, harder than knees, the last rung before the floor. Drop the box height every 2–3 weeks.",
    }),

    node("pushup_base.band_pushup", "Banded Push-Up", S, -0.5, reps(12, 3), ["push.pushup_incline"], {
      evidence: "D",
      description:
        "Side branch: resistance band across the hips, ends pinned under both hands — it unloads the bottom exactly where you fail. 3×12, then use a thinner band.",
    }),
    node("pushup_base.partial_pushup", "Partial-ROM Push-Up", S, -0.5, reps(10, 3), ["push.pushup_incline"], {
      evidence: "D",
      description:
        "Floor push-up stopping on a 10–15 cm block or folded cushion under the chest. 3×10, then remove one layer.",
    }),
    node("pushup_base.pushup_negative", "Negative Push-Up", S, -0.4, reps(5, 3), ["pushup_base.partial_pushup"], {
      description:
        "3×5 with a 5 s descent from the top plank to the floor, then reset onto the knees to come up. The eccentric is what builds the first full rep.",
    }),
    node("qi.incline_pushup", "Quasi-Iso Incline", S, -0.4, hold(60), ["push.pushup_incline"], {
      evidence: "D",
      description: "60 s continuous quasi-isometric descent/hold on a bench — slot push-09, band 1.",
    }),

    node("pushup_base.first_pushup", "First Full Push-Up", S, -0.3, reps(1), ["pushup_base.pushup_negative"], {
      estMonths: [1, 4],
      description:
        "ONE clean rep from the floor: chest touches, elbows ~45°, hips locked, no worm. The single milestone this sector was missing.",
    }),
    node("push.band_press_staggered", "Staggered Band Press", S, -0.3, reps(15, 3, true), ["push.pushup_incline"], {
      evidence: "D",
      description:
        "Standing single-arm band press in a staggered stance — the beginner-accessible unilateral press (slot push-07, band 2). 3×15 per side.",
    }),

    node("pushup_base.pushup_10", "Push-Up ×10", S, -0.2, reps(10, 3), ["pushup_base.first_pushup"], {
      description: "3×10 clean full-ROM push-ups — half the hub's requirement, and the honest gate for it.",
    }),

    node("qi.pushup", "Quasi-Iso Push-Up", S, -0.1, hold(60), ["pushup_base.pushup_10", "qi.incline_pushup"], {
      evidence: "D",
      description: "60 s quasi-isometric push-up on the floor — slot push-09, band 0.",
    }),
    node("push.fingertip_pushup_knees", "Fingertip Knee Push-Up", S, -0.1, reps(10, 3), ["pushup_base.pushup_10"], {
      description:
        "Side branch: knees down, weight on five slightly-bent fingertips. 3×10. Build slowly — stop at any finger-joint pain, tendons lag muscle here.",
    }),

    // -------------------------------------------- breadth just above the 3×20 hub
    node("pushup_base.wide_pushup", "Wide Push-Up", S, 0.5, reps(15, 3), ["one_arm_pushup.pushup"], {
      description: "Hands ~1.5× shoulder width, elbows out to ~60°. 3×15 — more pec, less triceps.",
    }),
    node("pushup_base.close_pushup", "Close-Grip Push-Up", S, 0.5, reps(12, 3), ["one_arm_pushup.pushup"], {
      description: "Hands inside shoulder width, elbows brushing the ribs. 3×12 — the missing rung before the diamond.",
    }),
    node("pushup_base.tempo_pushup", "Tempo Push-Up (3-1-1)", S, 0.5, reps(8, 3), ["one_arm_pushup.pushup"], {
      description: "3 s down, 1 s dead-stop on the floor, 1 s up. 3×8 — builds control without adding reps.",
    }),
    node("push.fingertip_pushup", "Fingertip Push-Up", S, 0.5, reps(10, 3), [
      "one_arm_pushup.pushup",
      "push.fingertip_pushup_knees",
    ], { description: "3×10 from the feet on fingertips (slot push-06, band 0). Progress by months, not weeks." }),
    // NOTE (integration): a knuckle push-up node was authored here as
    // `pushup_base.knuckle_pushup`, but the dips_planche_hs sector owns the whole knuckle
    // ladder (push.knuckle_pushup_wall -> _incline -> _knees -> push.knuckle_pushup) using
    // the CATALOG exercise ids, so those nodes auto-feed from logged push-03 sets while a
    // pushup-sector copy never could. The duplicate was removed at integration; use
    // `push.knuckle_pushup` (dips_planche_hs) for knuckle work.
    node("pushup_decline.feet_30cm", "Decline Push-Up", S, 0.5, reps(12, 3), ["one_arm_pushup.pushup"], {
      description: "Feet on a ~30 cm box: ≈70% BW vs 64% flat (Ebben 2011). 3×12.",
    }),

    // ------------------------------------------------- intermediate rungs (ring 1.5)
    node("pushup_decline.feet_61cm", "High Decline Push-Up", S, 1.5, reps(10, 3), ["pushup_decline.feet_30cm"], {
      description: "Feet on a ~60 cm bench: ≈75% BW. 3×10 — shoulders now take a real share of the load.",
    }),
    node("pushup_base.deficit_pushup", "Deficit Push-Up", S, 1.5, reps(10, 3), ["pushup_base.close_pushup"], {
      description:
        "Hands on parallettes / two low blocks so the chest sinks well below the hands. 3×10 at a range the floor cannot give you.",
    }),
    node("push.explosive_pushup", "Explosive Push-Up", S, 1.5, reps(8, 3), [
      "one_arm_pushup.pushup",
      "pushup_base.tempo_pushup",
    ], { description: "3×8 where both hands leave the floor at lockout (slot push-05, band 0). Land soft, elbows unlocked." }),
    node("pushup_uni.uneven_pushup", "Uneven Push-Up", S, 1.5, reps(8, 3, true), ["one_arm_pushup.diamond"], {
      description:
        "One hand on a 10–15 cm block, one on the floor. 3×8 per side — the first genuinely asymmetric load, and the entry to the archer line.",
    }),

    // -------------------------------------------------- ring 2.5: plyo + one-arm prep
    node("pushup_base.clap_pushup", "Clap Push-Up", S, 2.5, reps(5, 3), ["push.explosive_pushup"], {
      estMonths: [2, 6],
      description: "3×5 with a full clap at the top. Requires a push-up you can already do explosively for 8.",
    }),
    node("pushup_uni.typewriter", "Typewriter Push-Up", S, 2.5, reps(5, 3, true), ["one_arm_pushup.archer"], {
      description:
        "Stay low and slide side-to-side between the archer end positions. 3×5 per side, chest skimming the floor throughout.",
    }),
    node("pushup_uni.oap_box", "One-Arm Box Push-Up", S, 2.5, reps(5, 3, true), ["one_arm_pushup.archer"], {
      evidence: "D",
      description:
        "True one-arm push-up with the working hand on a high box/bar — the incline trick applied to the one-arm. 3×5 per side, then lower the box.",
    }),

    // ------------------------------------------------ ring 3.5 / 4.5: one-arm assists
    node("pushup_uni.oap_band", "Banded One-Arm Push-Up", S, 3.5, reps(5, 3, true), [
      "one_arm_pushup.elevated_archer",
    ], {
      evidence: "D",
      description: "3×5 per side with a band across the chest anchored overhead; step down a band size every few weeks.",
    }),
    node("pushup_uni.oap_partial", "One-Arm Partial ROM", S, 4.5, reps(5, 3, true), ["one_arm_pushup.oap_negative"], {
      evidence: "D",
      description:
        "3×5 per side to a block under the chest — the concentric half the negative never trains. Remove one block layer at a time.",
    }),
  ],

  // Splice the new easier work beneath the already-authored hubs. Every added prereq has a
  // strictly smaller ring than its target (checked in skills.test.ts).
  rewire: {
    "one_arm_pushup.pushup": ["pushup_base.pushup_10"], //           -0.2 < 0
    "one_arm_pushup.diamond": ["pushup_base.close_pushup"], //        0.5 < 1
    "one_arm_pushup.archer": ["pushup_uni.uneven_pushup"], //         1.5 < 2
    "one_arm_pushup.elevated_archer": ["pushup_uni.oap_box"], //      2.5 < 3
    "one_arm_pushup.oap_negative": ["pushup_uni.oap_band"], //        3.5 < 4
    "one_arm_pushup.oap": ["pushup_uni.oap_partial"], //              4.5 < 5
    "barbell_bench.0_75xbw": ["barbell_bench.0_5xbw"], //            -0.5 < 0
  },
};
