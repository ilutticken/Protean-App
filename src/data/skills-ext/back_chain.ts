// Extension nodes for the "back_chain" sector (posterior chain: hinge, spinal extension,
// bridging, and the olympic-lift power line).
//
// WHY: the shipped sector had 10 nodes and two ring-0 hubs with NO on-ramp —
// `bridge.glute_bridge` (3×15) and, absurdly for a beginner, `power_stunts.bw_power_clean`
// (a BODYWEIGHT power clean with zero prerequisites). This file adds a day-one hinge
// on-ramp beneath both, fills the oversized rungs of the doc 01 §3.12 bridge ladder, and
// adds two side lines (spinal-extension endurance, loaded hinge/row) so the sector has
// breadth instead of one chain.
//
// Sources: docs/research/01-skill-progressions.md §3.12 (bridge ladder, tier C) and §4
// (StrengthLevel BW-ratio table, tier B: ♂ deadlift beginner 1.00×, power clean novice
// 0.75×); docs/research/06-addendum-2.md §4 (`power.sandbag_snatch` credits
// `power_stunts.bw_snatch` at session load ≥0.5×BW; `hinge.glute_bridge_weighted` gate).
//
// RING CONVENTION — read before re-spacing:
// buildSkills() normalizes rings PER SECTOR (min ring -> 0), but the strict-ring test in
// skills.test.ts compares rings ACROSS sectors too, and back_chain has two OUTGOING
// cross-sector edges whose dependents this file cannot edit:
//   bridge.glute_bridge (raw 0) -> hinge.glute_bridge_weighted (posterior, raw 1)
//   bridge.full_bridge  (raw 3) -> back_handspring.jump_back   (balance,   raw 4)
// So this sector's normalization shift is bounded by the OTHER two sectors' shifts:
// shift(back_chain) < 1 + shift(posterior) and shift(back_chain) < 1 + shift(balance).
// The six true-beginner levels below therefore sit at -3 … -0.5 in 0.5 steps: shift = 3,
// which currently clears both bounds with room to spare (posterior shifts 7, balance 4).
// If either of those sectors is ever re-authored with a SMALLER on-ramp, compress these
// six levels into (-1, 0) (e.g. -0.9 … -0.15, shift 0.9) — the ordering is already
// correct and nothing else has to move.
//
// Reused ids: nodes that correspond to a catalog exercise reuse that exercise id so
// logged sets auto-feed the tree — but ONLY where the catalog's sector is already
// back_chain (crossref.test.ts pins catalog/tree sector agreement). That is why the
// bodyweight good morning, RDL, KB swing and glute-bridge variants below use NEW ids:
// their catalog entries (hinge.good_morning, hinge.rdl, hinge.kb_swing,
// hinge.glute_bridge_unilateral) are posterior-sector rows.

import type { SectorExtension } from "../skill-helpers";
import { composite, hold, node, reps, wreps } from "../skill-helpers";

const S = "back_chain" as const;

export const backChainExt: SectorExtension = {
  nodes: [
    // ===================================================================== on-ramp
    // Level 1 (ring -3): day one, no equipment, no prerequisites.
    node("hinge_ramp.dowel_hinge", "Dowel Hip Hinge", S, -3, reps(10, 3), [], {
      description:
        "3×10 with a dowel touching head, mid-back and sacrum throughout. Push hips back to mid-shin, knees soft, spine neutral — the pattern every deadlift, RDL and clean is built on.",
    }),
    node("hinge_ramp.bird_dog", "Bird Dog", S, -3, reps(10, 3, true), [], {
      description: "3×10 per side, 3 s hold at the top. A cup of water on the low back must not spill.",
    }),
    node("hinge_ramp.superman_hold", "Superman Hold", S, -3, hold(20, 3), [], {
      description: "3×20 s prone, arms and legs off the floor, gaze down. First exposure to spinal extension endurance.",
    }),

    // Level 2 (ring -2.5).
    node("hinge_ramp.good_morning_bw", "BW Good Morning", S, -2.5, reps(15, 3), ["hinge_ramp.dowel_hinge"], {
      description:
        "3×15 hands behind head, hinge to ~90° torso with a flat back. Mirrors the seed's legs-03 band-2 step (catalog id hinge.good_morning is a posterior-sector row, so this node cannot share it).",
    }),
    node("hinge_ramp.glute_bridge_hold", "Glute Bridge Hold", S, -2.5, hold(30, 3), ["hinge_ramp.bird_dog"], {
      description: "3×30 s, ribs down, hips locked out level with knees and shoulders. The step beneath the 3×15 glute bridge.",
    }),
    node("spinal_ext.back_ext_bw", "Back Extension", S, -2.5, reps(15, 3), ["hinge_ramp.superman_hold"], {
      description: "3×15 prone or on a 45° bench, to neutral only — no hyperextension at the top.",
    }),

    // Level 3 (ring -2): first external load.
    node("hinge_ramp.kb_deadlift", "Kettlebell Deadlift", S, -2, wreps(10, 0.25, 3), [
      "hinge_ramp.good_morning_bw",
      "hinge_ramp.glute_bridge_hold",
    ], { description: "3×10 with a bell of ≈25% bodyweight between the feet. Same hinge, now loaded." }),
    node("spinal_ext.back_ext_hold", "Back Ext Hold 60 s", S, -2, hold(60, 2), ["spinal_ext.back_ext_bw"], {
      description: "2×60 s isometric hold at horizontal (Biering-Sørensen position). Extensor endurance, not strength.",
    }),
    node("pull.bent_db_row", "Bent Dumbbell Row", S, -2, wreps(10, 0.25, 3), ["hinge_ramp.good_morning_bw"], {
      description:
        "3×10 per side at ≈25% bodyweight, torso held in the hinge. Reuses the seed's full-02 catalog id, so logged sets feed this node directly.",
    }),

    // Level 4 (ring -1.5): hinge power + heavier hinge.
    node("power_ramp.kb_swing", "Kettlebell Swing", S, -1.5, wreps(15, 0.25, 3), ["hinge_ramp.kb_deadlift"], {
      description: "3×15 hardstyle at ≈25% bodyweight — hips snap, arms are ropes. The hinge becomes ballistic here.",
    }),
    node("hinge_ramp.rdl_half_bw", "RDL 0.5×BW", S, -1.5, wreps(8, 0.5, 3), ["hinge_ramp.kb_deadlift"], {
      description: "3×8 barbell/dumbbell Romanian deadlift at half bodyweight, bar tracking the thighs, no lumbar rounding.",
    }),
    node("power.sandbag_bent_row", "Sandbag Bent Row", S, -1.5, wreps(10, 0.4, 2), ["pull.bent_db_row"], {
      description: "2×10 at ≈40% bodyweight. Seed full-02 band-1 step; logged sets feed this node.",
    }),

    // Level 5 (ring -1): clean prep.
    // NOTE (integration): a `hinge_ramp.deadlift_1_0xbw` node (e1rm deadlift 1.0×BW) was
    // authored here as "the rung the posterior sector's 1.5×BW node has been missing
    // beneath it". The posterior author added exactly that rung in the canonical milestone
    // namespace — `barbell_deadlift.1_0xbw`, rewired under `barbell_deadlift.1_5xbw` — so
    // the two were the SAME criterion under two names and would have lit up together.
    // Per this file's own open issue ("keep one and delete the other") the back_chain copy
    // was removed at integration; the deadlift ladder lives in posterior. The dependents
    // below now hang off `hinge_ramp.rdl_half_bw`, which reads better anyway (RDL 0.5×BW
    // -> RDL 1.0×BW) and keeps the hinge-strength gate under the power clean.
    node("power_ramp.hang_high_pull", "Hang High Pull", S, -1, wreps(5, 0.5, 3), ["power_ramp.kb_swing"], {
      evidence: "D",
      description: "3×5 at ≥50% bodyweight from the hang: violent hip extension, elbows high and outside, bar to sternum.",
    }),
    node("power.sandbag_clean", "Sandbag Clean", S, -1, wreps(10, 0.4, 2), [
      "power_ramp.kb_swing",
      "power.sandbag_bent_row",
    ], { description: "2×10 at ≈40% bodyweight. Seed full-02 band-1 step — a forgiving catch position before a barbell rack." }),

    // Level 6 (ring -0.5): the missing rung under the bodyweight power clean.
    node("power_ramp.power_clean_0_75x", "Power Clean 0.75×BW", S, -0.5, wreps(1, 0.75), [
      "power_ramp.hang_high_pull",
      "power.sandbag_clean",
      "hinge_ramp.rdl_half_bw",
    ], {
      evidence: "B",
      description: "0.75×BW power clean — StrengthLevel ♂ 'novice' (doc 01 §4). Coached technique assumed; ♀ ≈0.60×BW.",
    }),

    // ============================================================ ring 0.5: breadth
    node("bridge_ramp.sl_glute_bridge", "1-Leg Glute Bridge", S, 0.5, reps(12, 3, true), ["bridge.glute_bridge"], {
      description: "3×12 per side, hips level. Exposes the side-to-side deficit the two-leg bridge hides.",
    }),
    node("bridge_ramp.reverse_plank", "Reverse Plank Hold", S, 0.5, hold(30, 3), ["bridge.glute_bridge"], {
      description:
        "3×30 s, legs straight, chest open, hands under shoulders. Builds the shoulder-extension tolerance doc 01 §3.12 names as THE gate before any wall bridge — without it the lumbar spine takes the extension.",
    }),
    node("hinge_ramp.rdl_bw", "RDL 1.0×BW", S, 0.5, wreps(8, 1.0, 3), ["hinge_ramp.rdl_half_bw"], {
      description: "3×8 Romanian deadlift at bodyweight — the hamstring-length work that carries the deadlift past 1.5×BW.",
    }),
    node("spinal_ext.weighted_ext", "Weighted Back Ext", S, 0.5, wreps(10, 0.25, 3), ["spinal_ext.back_ext_hold"], {
      description: "3×10 hugging ≈25% bodyweight, to neutral only, 2 s pause at the top.",
    }),
    node("barbell.row", "Barbell Row 0.75×BW", S, 0.5, wreps(5, 0.75, 3), [
      "power.sandbag_bent_row",
      "pull.bent_db_row",
    ], {
      description:
        "3×5 strict bent-over row at 0.75×bodyweight, torso ≤45°, no heave. Reuses the catalog id, so it also feeds the barbell-row strength standard.",
    }),
    node("power.sandbag_snatch", "Sandbag Snatch", S, 0.5, wreps(10, 0.5, 2), ["power.sandbag_clean"], {
      description:
        "2×10 at ≥50% bodyweight — addendum-2 §4 makes this the technique-gated credit toward the bodyweight snatch. Seed full-02 band-0 step.",
    }),

    // ============================================================ ring 1.5
    node("bridge_ramp.box_bridge", "Elevated Box Bridge", S, 1.5, hold(20, 3), ["bridge.wall_bridge"], {
      description: "3×20 s with hands on a 40 cm box. Halves the shoulder-flexion demand of a floor bridge — the rung between wall bridge and head bridge.",
    }),
    node("spinal_ext.sorensen_120", "Sørensen Hold 2 min", S, 1.5, hold(120, 1), ["spinal_ext.weighted_ext"], {
      description: "1×120 s unloaded horizontal hold. Around the median of the Biering-Sørensen field test and a sensible ceiling for extensor endurance.",
    }),
    node("spinal_ext.reverse_hyper", "Reverse Hyper", S, 1.5, reps(15, 3), ["spinal_ext.weighted_ext"], {
      evidence: "D",
      description: "3×15 over a bench or box, legs driven by the glutes to horizontal only, lowered under control — no lumbar swing.",
    }),
    node("hinge_ramp.rack_pull_1_5x", "Rack Pull 1.5×BW", S, 1.5, wreps(3, 1.5, 3), ["hinge_ramp.rdl_bw"], {
      evidence: "D",
      description: "3×3 from just below the knee at 1.5×bodyweight — supramaximal lockout exposure before chasing a 1.5×BW full-ROM deadlift.",
    }),

    // ============================================================ ring 2.5
    node("bridge_ramp.floor_bridge_10s", "Floor Bridge 10 s", S, 2.5, hold(10, 3), ["bridge.short_bridge"], {
      description: "3×10 s straight-arm floor bridge. The honest first version of the 3×30 s full bridge — a 20 s head bridge to 30 s straight-arm bridge is two moves, not one.",
    }),
    node("spinal_ext.jefferson_curl", "Jefferson Curl", S, 2.5, wreps(5, 0.25, 3), ["spinal_ext.sorensen_120"], {
      evidence: "D",
      description:
        "3×5 at ≤25% bodyweight, segment-by-segment flexion from a raised platform, 4 s down / 4 s up. Deliberately capped: this is a loaded-range-of-motion drill, never a strength lift — add load only after the extensor-endurance nodes are owned.",
    }),

    // ============================================================ ring 3.5+
    node("bridge_ramp.bridge_rocks", "Bridge Rocks", S, 3.5, reps(10, 3), ["bridge.full_bridge"], {
      description: "3×10 rocking shoulders forward past the hands and back. Turns a static bridge into usable range for the gecko/wall-walk steps.",
    }),
    node("bridge_ramp.wall_walk_down", "Wall Walk-Down", S, 4.5, reps(5, 3), ["bridge.gecko_bridge"], {
      description: "3×5 walking the hands DOWN the wall to the floor and back up. The eccentric half of standing up out of a bridge — train it before the concentric.",
    }),
    node("bridge_ramp.drop_to_bridge", "Drop-Back to Bridge", S, 5.5, reps(3, 3), ["bridge.assisted_stand2stand"], {
      estMonths: [4, 10],
      description: "3×3 controlled drop-backs from standing to a floor bridge (spot or a stack of mats for the first sessions). Half of the stand-to-stand, trained on its own.",
    }),

    // ------------------------------------ conditioning slots (upper back)
    // full-08 (face pulls) credited nothing at any step. Ids are the canonical
    // exercise ids, so logged sets auto-feed the tree.
    node("pull.face_pull_bw", "Bodyweight Face Pull", S, -2.9, reps(15, 3), ["hinge_ramp.superman_hold"], {
      evidence: "D",
      description: "3×15 from a bar or rings set high, pulling to the forehead with the elbows above the wrists. Seed exercise (full-08).",
    }),
    node("pull.face_pull_band", "Band Face Pull", S, -2.7, reps(15, 2), ["pull.face_pull_bw"], {
      evidence: "D",
      description: "2×15 with a band anchored at head height — full-08's band-1 target. Seed exercise (full-08). External rotation under low load — the direct counterweight to the pressing and straight-arm volume elsewhere in the week.",
    }),

    // ------------------------------------------------ Olympic depth + Sots press
    // The sector jumped power clean -> clean & press -> snatch with nothing between.
    node("barbell.power_snatch", "Power Snatch 0.75×BW", S, 0.5, wreps(1, 0.75), [
      "power_ramp.power_clean_0_75x",
    ], { evidence: "D", description: "Ground to overhead in one movement, caught above parallel. The rung the bodyweight snatch was missing beneath it." }),
    node("barbell.snatch_balance", "Snatch Balance", S, 1, wreps(1, 0.5), ["barbell.power_snatch"], {
      evidence: "D",
      description: "Bar on the back: drive it up and drop UNDER it into a full overhead squat. Teaches the catch position faster than any amount of pulling.",
    }),
    node("barbell.sots_press", "Sots Press", S, 1.5, wreps(3, 0.25), ["barbell.snatch_balance"], {
      evidence: "D",
      description: "A strict press from the BOTTOM of a squat — 3 reps at 25% bodyweight. Looks impossible the first time you see it, and is almost pure thoracic and shoulder mobility.",
    }),
    node("clean_jerk.bw", "BW Clean & Jerk", S, 2.5, wreps(1, 1), ["power_stunts.bw_clean_and_press"], {
      isStunt: true, evidence: "D", estMonths: [12, 30],
      description: "Your own bodyweight from floor to overhead, split or power jerk. The classic all-round strength benchmark. ♀ criterion 0.80×BW.",
    }),
    node("clean_jerk.1_5xbw", "Clean & Jerk 1.5×BW", S, 3.5, wreps(1, 1.5), ["clean_jerk.bw"], {
      isStunt: true, evidence: "D", estMonths: [36, 72],
      description: "1.5× bodyweight overhead. National-level territory in most weight classes. ♀ criterion 1.2×BW.",
    }),

    // ------------------------------------------------------- hybrid badge
    // Composite: no measurement of its own, achieved when everything under it is.
    node("hybrid.iron_athlete", "Iron Athlete", S, 6, composite(), [
      "barbell_deadlift.2_0xbw",
      "one_arm_pullup.pullup10",
      "barbell_bench.1_0xbw",
    ], {
      isStunt: true, evidence: "D", estMonths: [18, 48],
      description: "Double-bodyweight deadlift, ten strict pull-ups, and a bodyweight bench — all standing at once. The classic proof you skipped neither half of the gym.",
    }),
  ],

  // Splice the new work beneath the shipped hubs so the easier nodes actually gate them.
  rewire: {
    "bridge.glute_bridge": ["hinge_ramp.glute_bridge_hold"],
    "bridge.wall_bridge": ["bridge_ramp.reverse_plank"],
    "bridge.short_bridge": ["bridge_ramp.box_bridge"],
    "bridge.full_bridge": ["bridge_ramp.floor_bridge_10s"],
    "bridge.gecko_bridge": ["bridge_ramp.bridge_rocks"],
    "bridge.assisted_stand2stand": ["bridge_ramp.wall_walk_down"],
    "bridge.stand_to_stand": ["bridge_ramp.drop_to_bridge"],
    "power_stunts.bw_power_clean": ["power_ramp.power_clean_0_75x"],
    "power_stunts.bw_snatch": ["power.sandbag_snatch"],
  },
};
