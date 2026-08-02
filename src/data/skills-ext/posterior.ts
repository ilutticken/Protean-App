// Extension nodes for the "posterior" sector (hamstrings / glutes / calves).
// Sources: docs/research/01-skill-progressions.md §2.4 + §3.11 (Nordic ladder and its
// tissue caution), §4.1 + docs/research/06-addendum-3.md §4.1 (StrengthLevel deadlift and
// hip-thrust ×BW standards, tier B), docs/research/06-addendum-2.md §3/§4 (seed slot ids:
// legs-03 hinge, legs-04-alt swings, legs-07 glute bridge, legs-08 calf raises).
//
// The authored tree started at "Hamstring bridge / single-leg RDL 3×10 per side" and the
// Nordic ladder above it — nothing an untrained beginner can stand on, and 6 huge steps
// from there to a full Nordic. This file adds:
//   1. a day-one on-ramp at NEGATIVE rings (-7 … -1): glute bridge hold -> feet-elevated
//      bridge -> single-leg bridge -> hip thrust; seated -> standing -> single-leg calf
//      raises; good morning -> RDL -> 1.0×BW deadlift; slider/towel leg curls + walkouts;
//   2. Nordic rungs at FRACTIONAL rings (0.5 … 4.5): high-assist -> low-assist ->
//      3 s / 8 s eccentrics -> partial concentric -> arms-crossed;
//   3. side branches for breadth: 45° back extension, glute-ham raise, kettlebell swings,
//      weighted single-leg RDL, barbell hip thrust, deadlift interpolation rungs.
// Node ids reuse the seed's exercise ids wherever the routine already logs the movement
// (hinge.*, squat.calf_raise, squat.deficit_calf_raise, barbell.hip_thrust) so logged sets
// auto-feed the tree; everything else is namespaced "posterior_base.*".
// buildSkills() normalizes the sector so the lowest ring (-7) becomes 0.

import type { SectorExtension } from "../skill-helpers";
import { e1rmRatio, hold, node, reps, wreps } from "../skill-helpers";

export const posteriorExt: SectorExtension = {
  nodes: [
    // ---------------------------------------------------------------- ring -7
    // Day one. No equipment, no hinge competence assumed, nothing to fall out of.
    node("posterior_base.glute_bridge_hold", "Glute Bridge Hold", "posterior", -7, hold(30, 2), [], {
      description:
        "2×30 s supine bridge: heels under knees, ribs down, squeeze the glutes — the hips do the lifting, not the low back. The sector's day-one entry point.",
    }),
    node("posterior_base.calf_raise_seated", "Seated Calf Raise", "posterior", -7, reps(20, 3), [], {
      description: "3×20 seated (knee bent ~90°) — soleus-biased and the gentlest possible Achilles entry.",
    }),

    // ---------------------------------------------------------------- ring -6
    node("posterior_base.feet_elev_bridge", "Feet-Elevated Bridge", "posterior", -6, reps(15, 3), [
      "posterior_base.glute_bridge_hold",
    ], { description: "3×15 with heels on a chair or step — longer lever, more hamstring than the floor bridge." }),
    node("hinge.good_morning", "Good Morning", "posterior", -6, reps(15, 2), [
      "posterior_base.glute_bridge_hold",
    ], {
      description:
        "2×15 bodyweight hip hinge, hands behind the head, back flat, knees soft — teaches the hinge before any load (seed slot legs-03, easiest step).",
    }),
    node("squat.calf_raise", "Standing Calf Raise", "posterior", -6, reps(20, 3), [
      "posterior_base.calf_raise_seated",
    ], { description: "3×20 double-leg standing, full range, 1 s pause at the top (seed slot legs-08)." }),

    // ---------------------------------------------------------------- ring -5
    node("hinge.glute_bridge_unilateral", "1-Leg Glute Bridge", "posterior", -5, reps(12, 2, true), [
      "posterior_base.feet_elev_bridge",
    ], { description: "2×12 per side, hips level — the first genuinely unilateral posterior step (seed slot legs-07)." }),
    node("posterior_base.calf_raise_single", "1-Leg Calf Raise", "posterior", -5, reps(15, 3, true), [
      "squat.calf_raise",
    ], { description: "3×15 per side, fingertips on a wall for balance only." }),
    node("hinge.good_morning_weighted", "Weighted Good Morning", "posterior", -5, wreps(12, 0.2, 2), [
      "hinge.good_morning",
    ], { description: "2×12 @ +20% BW across the upper back (seed slot legs-03, middle step)." }),

    // ---------------------------------------------------------------- ring -4
    node("posterior_base.hip_thrust_bw", "Bench Hip Thrust", "posterior", -4, reps(15, 3), [
      "hinge.glute_bridge_unilateral",
    ], { description: "3×15 bodyweight, shoulder blades on a bench, chin tucked, full lockout — the loading position for everything above." }),
    node("posterior_base.slider_curl_double", "Slider Leg Curl", "posterior", -4, reps(10, 3), [
      "hinge.glute_bridge_unilateral",
    ], {
      evidence: "D",
      description: "3×10 from a bridge, heels on towels/sliders on a smooth floor: extend out and drag back with the hamstrings, hips up throughout.",
    }),
    node("hinge.rdl", "Romanian Deadlift", "posterior", -4, wreps(10, 0.5, 3), ["hinge.good_morning_weighted"], {
      description: "3×10 @ 0.5×BW, bar close, knees fixed, stop where the back would round (seed slot legs-03, hardest step).",
    }),

    // ---------------------------------------------------------------- ring -3
    node("posterior_base.slider_curl_single", "1-Leg Slider Curl", "posterior", -3, reps(8, 3, true), [
      "posterior_base.slider_curl_double",
    ], { evidence: "D", description: "3×8 per side. Roughly double the per-leg hamstring demand of the two-leg version — expect DOMS for a week." }),
    node("posterior_base.ham_walkout", "Hamstring Walkout", "posterior", -3, reps(8, 3), [
      "posterior_base.slider_curl_double",
    ], { evidence: "D", description: "3×8: from a bridge, walk the heels out to near-straight legs and back without letting the hips drop. Equipment-free slider substitute." }),
    node("squat.deficit_calf_raise", "Weighted Deficit Raise", "posterior", -3, wreps(12, 0.25, 3), [
      "posterior_base.calf_raise_single",
    ], { description: "3×12 double-leg off a step (heels below the toes) holding +25% BW — full stretch is the point (seed slot legs-08, hardest step)." }),
    node("posterior_base.hyper_45", "45° Back Extension", "posterior", -3, reps(15, 3), ["hinge.rdl"], {
      description: "3×15 on a 45° hyper bench, rounding from the hips not the lumbar spine; hold the top 1 s. Glute-ham volume that costs nothing in recovery.",
    }),
    node("hinge.kb_swing", "Kettlebell Swing", "posterior", -3, wreps(20, 0.2, 2), ["hinge.rdl"], {
      description: "2×20 @ ~20% BW — the hinge made ballistic; the bell floats, the hips snap (seed slot legs-04-alt).",
    }),

    // ---------------------------------------------------------------- ring -2
    node("barbell.hip_thrust", "Barbell Hip Thrust", "posterior", -2, wreps(8, 0.75, 3), [
      "posterior_base.hip_thrust_bw",
    ], { description: "3×8 @ 0.75×BW on the bar (bar included, addendum-3 §4.1 convention) — just past the beginner 1RM standard of 0.70×BW." }),
    node("posterior_base.calf_single_deficit", "1-Leg Deficit Raise", "posterior", -2, wreps(10, 0.2, 3), [
      "squat.deficit_calf_raise",
    ], { evidence: "D", description: "3×10 per side off a step holding +20% BW in one hand. The end of the calf line: single leg, full deficit, loaded." }),
    node("hinge.kb_swing_overspeed", "Overspeed KB Swing", "posterior", -2, wreps(20, 0.25, 2), ["hinge.kb_swing"], {
      evidence: "D",
      description: "2×20 @ ~25% BW with a band pulling the bell down — forces a faster hip snap than gravity alone (seed slot legs-04-alt, hardest step).",
    }),

    // ---------------------------------------------------------------- ring -1
    node("barbell_deadlift.1_0xbw", "Deadlift 1.0×BW", "posterior", -1, e1rmRatio("deadlift", 1.0), ["hinge.rdl"], {
      evidence: "B",
      description: "StrengthLevel beginner standard (doc 01 §4.1: ♂ 1.00 / ♀ 0.75 ×BW) — the first real deadlift milestone under the existing 1.5×BW node.",
    }),
    node("barbell_deadlift.1_25xbw", "Deadlift 1.25×BW", "posterior", -0.5, e1rmRatio("deadlift", 1.25), [
      "barbell_deadlift.1_0xbw",
    ], { evidence: "D", description: "Halfway between the beginner (1.00) and novice (1.50) standards — an interpolated rung, not a published tier." }),

    // ------------------------------------------------- Nordic ladder infill
    // doc 01 §2.4: hamstring musculotendinous junction is the tissue at risk; extreme DOMS
    // in weeks 1–2 is expected. Cap at 2 sessions/wk and 12–24 reps/wk initially, and never
    // add volume and depth in the same week.
    node("nordic_curl.high_assist_nordic", "High-Assist Nordic", "posterior", 0.5, reps(6, 3), [
      "nordic_curl.bridge_slr",
    ], { description: "3×6 with a heavy band anchored overhead (or a partner's hands at the chest): the assistance should make the whole descent feel controlled, not just the last 30°." }),
    node("posterior_base.slr_rdl_weighted", "Weighted 1-Leg RDL", "posterior", 1, wreps(8, 0.3, 3), [
      "nordic_curl.bridge_slr",
    ], { description: "3×8 per side holding ~30% BW. Loaded unilateral hinge — the strength side-branch off the hamstring hub." }),
    node("nordic_curl.low_assist_nordic", "Low-Assist Nordic", "posterior", 1.5, reps(6, 3), [
      "nordic_curl.assisted_nordic",
    ], { description: "3×6 with a light band or fingertips on a box — assistance only past ~60°, the rest unaided." }),
    node("posterior_base.ghr", "Glute-Ham Raise", "posterior", 1.5, reps(8, 3), ["nordic_curl.assisted_nordic"], {
      description: "3×8 on a GHD/glute-ham bench. Hip flexion shortens the lever, so it trains the same tissue below Nordic loads — equipment side-branch.",
    }),
    node("nordic_curl.ecc_3s", "Nordic Negative 3 s", "posterior", 2.5, reps(5, 3), ["nordic_curl.ecc_nordic"], {
      evidence: "D",
      description: "3×5 unassisted descents timed at 3 s to the floor, hands catching. First tempo rung above 'controlled to floor'.",
    }),
    node("nordic_curl.ecc_8s", "Nordic Negative 8 s", "posterior", 3.5, reps(5, 3), ["nordic_curl.slow_ecc_nordic"], {
      evidence: "D",
      description: "3×5 at an 8 s descent — the deepest eccentric rung before any concentric attempt.",
    }),
    node("nordic_curl.partial_concentric", "Partial-ROM Nordic", "posterior", 3.7, reps(3, 3), [
      "nordic_curl.ecc_8s",
    ], { description: "3×3: descend to ~45°, then pull back up with the hamstrings alone. The concentric appears here first, over a short range." }),
    node("nordic_curl.arms_crossed", "Arms-Crossed Nordic", "posterior", 4.5, reps(3, 3), [
      "nordic_curl.full_nordic",
    ], { evidence: "D", description: "3×3 full Nordics with the arms folded across the chest — no hand catch available, so the descent must be genuinely owned." }),

    // -------------------------------------------------- upper-end side rungs
    node("posterior_base.hip_thrust_2x", "Hip Thrust 2×BW", "posterior", 1.5, wreps(5, 2.0, 3), [
      "barbell.hip_thrust",
    ], { evidence: "D", description: "3×5 @ 2.0×BW on the bar ≈ a 2.3×BW single, between the intermediate (1.86) and advanced (2.66) 1RM standards of addendum-3 §4.1." }),
    node("barbell_deadlift.2_25xbw", "Deadlift 2.25×BW", "posterior", 1.5, e1rmRatio("deadlift", 2.25), [
      "barbell_deadlift.2_0xbw",
    ], { evidence: "D", description: "Halfway between the intermediate (2.00) and advanced (2.50) standards — a year-scale gap otherwise." }),

    // ---------------------------------------------- loaded feats (deadlift kin)
    // Breadth around the deadlift ladder: three old-time variants plus one circus lift.
    node("barbell.suitcase_deadlift", "Suitcase Deadlift", "posterior", -0.5, wreps(3, 0.5), [
      "barbell_deadlift.1_0xbw",
    ], { evidence: "D", description: "One bar, one hand, at your side — 3 reps per side at half bodyweight. Anti-lateral-flexion work disguised as a deadlift; the obliques quit long before the grip does." }),
    node("barbell.jefferson_deadlift", "Jefferson Deadlift", "posterior", 0.5, wreps(1, 1.5), [
      "barbell_deadlift.1_5xbw",
    ], { evidence: "D", description: "Straddle the bar, one hand in front of the leg and one behind, and stand. Asymmetric and rotational — it loads the hips in a plane nothing else here touches." }),
    node("barbell.hack_lift", "Hack Lift BW", "posterior", 0.5, wreps(1, 1), ["barbell_deadlift.1_5xbw"], {
      evidence: "D",
      description: "Deadlift with the bar BEHIND the legs, as George Hackenschmidt did it. Quad-dominant, and the bar scrapes up the hamstrings the whole way.",
    }),
    node("barbell.steinborn", "Steinborn Lift", "posterior", 2.5, wreps(1, 1), [
      "barbell_deadlift.2_0xbw",
      "barbell_squat.1_5xbw",
    ], {
      isStunt: true, evidence: "D", estMonths: [24, 48],
      description: "Stand a loaded bar on one end, tip it onto your back, squat it, and reverse the whole thing — no rack at any point. Henry Steinborn's lift, and probably the most spectacular thing a barbell can be made to do. ♀ criterion 0.78×BW.",
    }),
  ],

  // Splice the new easier work beneath the already-authored hubs (skills.ts is untouchable).
  rewire: {
    // The hamstring hub now sits on top of the slider-curl and single-leg-bridge on-ramp.
    "nordic_curl.bridge_slr": ["posterior_base.slider_curl_single", "hinge.glute_bridge_unilateral"],
    // Nordic ladder: each existing rung gets the new intermediate step below it.
    "nordic_curl.assisted_nordic": ["nordic_curl.high_assist_nordic"],
    "nordic_curl.ecc_nordic": ["nordic_curl.low_assist_nordic"],
    "nordic_curl.slow_ecc_nordic": ["nordic_curl.ecc_3s"],
    "nordic_curl.full_nordic": ["nordic_curl.partial_concentric"],
    "nordic_curl.weighted_nordic": ["nordic_curl.arms_crossed"],
    // Barbell deadlift ladder: entry milestone + the 2.0 -> 2.5 interpolation.
    "barbell_deadlift.1_5xbw": ["barbell_deadlift.1_25xbw"],
    "barbell_deadlift.2_5xbw": ["barbell_deadlift.2_25xbw"],
    // The flagged weighted glute bridge now also sits above the bodyweight hip thrust.
    "hinge.glute_bridge_weighted": ["posterior_base.hip_thrust_bw"],
  },
};
