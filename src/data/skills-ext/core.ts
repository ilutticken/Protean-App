// Extension nodes for the "core" sector — the beginner on-ramp plus the missing
// intermediate rungs beneath / between the authored hubs in src/data/skills.ts.
//
// Sources: docs/research/01-skill-progressions.md §3.4 (dragon flag), §3.10 (L-sit →
// V-sit → manna, incl. "compression is the V-sit limiter, not strength"),
// docs/research/06-addendum-1.md §1.1 (G-HOLLOW trunk gate), §1.3 (60 s side plank
// prereq), docs/research/06-addendum-2.md §4 + seed slots legs-05/legs-09/legs-10/
// push-04 (exercise ids reused verbatim as node ids so logging auto-feeds the tree).
//
// RINGS. Before this file the core sector started at 3×30 s parallette support holds
// and a 30 s hollow body — no day-one entry at all. New true-beginner work therefore
// sits at NEGATIVE rings and new in-between rungs at fractional rings; buildSkills
// normalizes the sector afterwards.
//
// The lowest ring here is deliberately -1.8, NOT -2 or lower: normalization is
// per-sector, and three cross-sector edges read core rings from OUTSIDE this sector —
//   rope_climb.lsit_rope_climb (pull_levers ring 5) <- l_sit_manna.l_sit (core ring 3)
//   backflip.set_drills        (balance ring 3)     <- dragon_flag.hollow (core ring 0)
//   frontflip.tuck_jump_punch  (balance ring 5)     <- dragon_flag.hollow (core ring 0)
// A core shift of +2 or more would push l_sit_manna.l_sit to ring >= 5 and break the
// strict-ring invariant against rope_climb.lsit_rope_climb if pull_levers is not itself
// shifted. Keeping the shift at 1.8 is safe no matter what the other sectors do.

import type { SectorExtension } from "../skill-helpers";
import { hold, node, reps } from "../skill-helpers";

const SECTOR = "core" as const;

export const coreExt: SectorExtension = {
  nodes: [
    // ---------------------------------------------------------------- ring -1.8
    // Day one. Four unconnected entry points, all doable untrained, all logged by
    // the seed routine or requiring nothing but a floor.
    node("core.dead_bug", "Dead Bug", SECTOR, -1.8, reps(10, 3, true), [], {
      description:
        "3×10 slow alternating reps per side, opposite arm + leg, low back pressed flat to the floor the whole time. The day-one entry to the hollow-body line.",
    }),
    node("core.knee_plank", "Knee Plank", SECTOR, -1.8, hold(30, 3), [], {
      description: "3×30 s from the knees: straight line knee→hip→shoulder, ribs down, glutes on.",
    }),
    node("core.elbow_to_knee", "Knee-to-Elbow Crunch", SECTOR, -1.8, reps(15, 3), [], {
      description: "3×15 alternating. Logged directly by the routine (legs-09 / full-07, easiest band).",
    }),
    node("core.floor_support", "Floor Support Hold", SECTOR, -1.8, hold(15, 3), [], {
      description:
        "Sit with legs straight, hands flat beside the hips, press the hips off the floor and hold 3×15 s. Heels may stay down. Teaches the shoulder depression the parallette support hold gates on (doc 01 §3.10 step 1).",
    }),

    // --------------------------------------------------------------- ring -1.35
    node("core.hollow_tuck", "Tuck Hollow Hold", SECTOR, -1.35, hold(20, 3), ["core.dead_bug"], {
      description: "3×20 s with hips and knees at 90°, arms alongside the shins, lumbar spine glued down.",
    }),
    node("core.plank_30s", "Front Plank 30 s", SECTOR, -1.35, hold(30), ["core.knee_plank"], {
      evidence: "B",
      description:
        "One 30 s forearm plank, strict hips — the Poor/Fair boundary of the plank norms (doc 04 §3.3). Stop the clock on sag or pike.",
    }),
    node("core.lying_leg_raise", "Lying Leg Raise", SECTOR, -1.35, reps(12, 3), ["core.dead_bug"], {
      description:
        "3×12 straight legs to vertical, lowered to a hover without the lumbar spine leaving the floor. Logged by legs-10.",
    }),
    node("core.side_plank_knee", "Knee Side Plank", SECTOR, -1.35, hold(20, 2), ["core.knee_plank"], {
      description: "2×20 s per side, bottom knee down, hips fully stacked.",
    }),

    // ---------------------------------------------------------------- ring -0.9
    node("core.hollow_one_leg", "One-Leg Hollow Hold", SECTOR, -0.9, hold(20, 3), ["core.hollow_tuck"], {
      description: "3×20 s with one leg extended and one tucked; swap legs halfway through each set.",
    }),
    node("core.plank_60s", "Front Plank 60 s", SECTOR, -0.9, hold(60), ["core.plank_30s"], {
      evidence: "B",
      description: "60 s strict — the Average band of the plank norms (doc 04 §3.3). Add time, never sag.",
    }),
    node("core.side_plank_45s", "Side Plank 45 s", SECTOR, -0.9, hold(45, 2), ["core.side_plank_knee"], {
      description:
        "2×45 s per side, feet stacked. Anti-lateral-flexion capacity is co-limiting for archer / one-arm push-ups (doc 01 §3.7) and the aerial wants 60 s per side (addendum-1 §1.3).",
    }),
    node("core.x_up", "X-Up", SECTOR, -0.9, reps(15, 3), ["core.elbow_to_knee"], {
      description: "3×15. Hardest band of the routine's legs-09 crunch slot, so it is logged automatically.",
    }),
    node("core.seated_leg_raise", "Seated Leg Raise", SECTOR, -0.9, reps(10, 3), ["core.floor_support"], {
      description:
        "Seated, hands pressed into the floor beside the hips: lift both straight legs clear and lower under control, 3×10. Logged by legs-05 (easiest band).",
    }),
    node("core.wall_rollout", "Wall Roll-Out", SECTOR, -0.9, reps(12, 3), ["core.plank_30s"], {
      sa: true,
      description:
        "Standing an arm's length from a wall, wheel or bar against it: roll to full overhead reach and back, 3×12. Straight-arm loading — tendon pacing applies from the very first rung.",
    }),

    // --------------------------------------------------------------- ring -0.45
    node("core.hollow_15s", "Hollow Hold 15 s", SECTOR, -0.45, hold(15), ["core.hollow_one_leg"], {
      description:
        "Both legs straight, arms overhead, low back flat — half of the 30 s G-HOLLOW gate (addendum-1 §1.1). Feet drop the instant the back lifts.",
    }),
    node("core.long_lever_plank", "Long-Lever Plank", SECTOR, -0.45, hold(45, 3), ["core.plank_60s"], {
      description: "3×45 s with the forearms shifted well ahead of the shoulders — the plank ladder's top rung.",
    }),
    node("core.hanging_frog_kick", "Hanging Knee Raise", SECTOR, -0.45, reps(10, 3), [
      "core.lying_leg_raise",
      "core.seated_leg_raise",
    ], {
      description:
        "3×10 knees to chest from a dead hang, no swing. Assumes a 30 s two-arm hang. Logged as the routine's Hanging Frog Kick step (legs-05, middle band).",
    }),
    node("core.rollout_knees_partial", "Knee Roll-Out (part)", SECTOR, -0.45, reps(10, 3), ["core.wall_rollout"], {
      sa: true,
      description:
        "From the knees, roll out to roughly two-thirds reach — stop at the point where the low back would arch, 3×10. A box or wall in front caps the distance.",
    }),

    // ----------------------------------------------------------------- ring 0.4
    node("core.tuck_hold", "Tuck Support Hold", SECTOR, 0.4, hold(20, 3), ["l_sit_manna.support"], {
      description:
        "On parallettes: both knees pulled to the chest, feet clear of the floor, shoulders depressed, 3×20 s. The missing rung between a support hold and the one-leg L-sit.",
    }),

    // ----------------------------------------------------------------- ring 0.5
    node("core.df_negative", "Dragon Flag Negative", SECTOR, 0.5, reps(5, 3), ["dragon_flag.hollow"], {
      description:
        "3×5 tucked descents at ~5 s each, hips never touching down — doc 01 §3.4 accepts 3×8 slow negatives as the tuck-flag criterion, so this is the honest half-step into it.",
    }),
    node("core.ab_rollout_knees", "Knee Roll-Out", SECTOR, 0.5, reps(8, 3), [
      "core.rollout_knees_partial",
      "core.plank_60s",
    ], {
      sa: true,
      description: "3×8 full-reach roll-outs from the knees, hips extended throughout. Logged by push-04.",
    }),
    node("core.hanging_leg_raise", "Hanging Leg Raise", SECTOR, 0.5, reps(10, 3), ["core.hanging_frog_kick"], {
      description: "3×10 straight legs to horizontal, lowered under control. Hardest band of legs-05.",
    }),

    // ----------------------------------------------------------------- ring 1.5
    node("core.df_one_leg", "One-Leg Dragon Flag", SECTOR, 1.5, hold(8, 3), ["dragon_flag.tuck"], {
      description: "3×8 s per side, one leg extended and one tucked — the standard rung between tuck and straddle.",
    }),
    node("core.toes_to_bar", "Toes-to-Bar", SECTOR, 1.5, reps(8, 3), ["core.hanging_leg_raise"], {
      description: "3×8 strict, toes touching the bar, no kip and no swing between reps.",
    }),
    node("core.rollout_standing_part", "Standing Roll-Out ½", SECTOR, 1.5, reps(8, 3), ["core.ab_rollout_knees"], {
      sa: true,
      description:
        "3×8 from the feet with a wall or a stack of plates limiting the roll to about half reach. Straight-arm: hold each new distance for weeks, not sessions.",
    }),

    // ----------------------------------------------------------------- ring 2.2
    node("core.lsit_5s", "L-Sit 5 s", SECTOR, 2.2, hold(5, 3), ["l_sit_manna.tuck_l"], {
      description:
        "First legs-straight holds on parallettes, 3×5 s. Tuck L-sit 3×30 s straight to L-sit 3×30 s is the single largest gap in the authored line; this and the 15 s rung split it.",
    }),

    // ----------------------------------------------------------------- ring 2.5
    node("core.lsit_15s", "L-Sit 15 s", SECTOR, 2.5, hold(15, 3), ["core.lsit_5s"], {
      description: "3×15 s, knees locked and heels above hip height. Accumulate 60 s/day as practice (doc 01 §3.10).",
    }),
    node("core.df_full_negative", "Full DF Negative", SECTOR, 2.5, reps(5, 3), ["dragon_flag.straddle"], {
      description: "3×5 straight-body descents at ~5 s each — the bridge from the straddle to the full 3×10 s hold.",
    }),
    node("core.ab_rollout", "Standing Roll-Out", SECTOR, 2.5, reps(5, 3), ["core.rollout_standing_part"], {
      sa: true,
      estMonths: [6, 18],
      description: "3×5 full-reach roll-outs from the feet, chest close to the floor. Logged by push-04.",
    }),

    // ----------------------------------------------------------------- ring 4.5
    // Name kept to 2 hex-map lines of <=15 chars: "Pike Compression Lift" packs as
    // "Pike" / "Compression" and StuntMap silently DROPS the trailing "Lift".
    node("core.pike_compression", "Pike Heel Lift", SECTOR, 4.5, reps(10, 3), ["l_sit_manna.straddle_l"], {
      description:
        "Seated in a full pike on blocks: lift both heels off the floor and hold 2 s, 3×10. Doc 01 §3.10 is explicit that active pike compression — not strength — is the V-sit limiter, so it gets its own gate.",
    }),

    // ------------------------------------------- conditioning slots (core)
    // Nodes for routine exercises that previously credited nothing. Ids are the
    // canonical exercise ids, so logged sets auto-feed the tree.
    //
    // The rotational four (halo → gama cast → bag spin) sit here rather than in
    // `balance`, where the exercise catalog files them: the catalog gives an
    // exercise its SLOT's sector (full-04 is a balance slot), but every balance
    // node is attestation-only by locked decision #10 — acrobatics never
    // auto-unlock. Rotational core work is not acrobatics and should credit
    // automatically, so the tree files it by movement. crossref.test.ts carries
    // the documented exception.
    node("power.halo", "Halo", SECTOR, -1.4, reps(10, 2, true), ["core.floor_support"], {
      evidence: "D",
      description: "Circle a plate or light bag around the head, hips and ribs locked — 2×10 per direction. Seed exercise (full-04). Trains anti-rotation and overhead shoulder range at a load the neck and spine can tolerate.",
    }),
    node("power.kb_halo", "Kettlebell Halo", SECTOR, -1.15, reps(10, 2, true), ["power.halo"], {
      evidence: "D",
      description: "2×10 per direction with a kettlebell — the offset mass makes the same circle harder to keep honest. Seed exercise (full-04).",
    }),
    node("power.band_woodchopper", "Band Woodchopper", SECTOR, -1.1, reps(12, 3, true), ["core.elbow_to_knee"], {
      evidence: "D",
      description: "3×12 per side, high-to-low or low-to-high. Seed exercise (full-07). Rotation driven by the hips, with the spine along for the ride.",
    }),
    node("core.walkout_plank", "Walk-Out to Plank", SECTOR, -1.2, reps(8, 3), ["core.plank_30s"], {
      evidence: "D",
      description: "From standing, walk the hands out to a plank and back — 3×8. Seed exercise (push-04, band 2).",
    }),
    node("core.bicycle_situp", "Bicycle Sit-Up", SECTOR, -1.3, reps(20, 3), ["core.elbow_to_knee"], {
      evidence: "D",
      description: "20 alternating elbow-to-knee reps. Seed exercise (legs-09).",
    }),
    node("core.lying_leg_flutter", "Lying Leg Flutter", SECTOR, -1, hold(30, 3), ["core.lying_leg_raise"], {
      evidence: "D",
      description: "3×30 s of small alternating leg flutters with the low back pinned down. Seed exercise (legs-10).",
    }),
    node("power.medball_slam", "Medicine Ball Slam", SECTOR, -0.7, reps(10, 3), ["core.x_up"], {
      evidence: "D",
      description: "3×10 overhead slams. Seed exercise (full-07). One of the few places in the plan to express force fast with no eccentric to control.",
    }),
    node("power.sledgehammer", "Sledgehammer", SECTOR, -0.6, reps(10, 3, true), ["power.band_woodchopper"], {
      evidence: "D",
      description: "3×10 per side onto a tyre. Seed exercise (full-07).",
    }),
    node("power.gama_cast", "Gama Cast", SECTOR, -0.5, reps(8, 2, true), ["power.kb_halo"], {
      evidence: "D",
      description: "Bag cast around one shoulder and caught on the other — 2×8 per side. Seed exercise (full-04).",
    }),
    node("power.bulgarian_bag_spin", "Bulgarian Bag Spin", SECTOR, -0.3, reps(10, 2, true), ["power.gama_cast"], {
      evidence: "D",
      description: "2×10 spins per direction. Seed exercise (full-04) and the hardest rung of that chain — a full 360° swing of the bag around the body under control.",
    }),
    node("core.hanging_frog_kick_weighted", "Weighted Frog Kick", SECTOR, -0.2, reps(10, 3), [
      "core.hanging_frog_kick",
    ], {
      evidence: "D",
      description: "3×10 with a dumbbell held between the feet or an ankle weight. Seed exercise (pull-06, band 0).",
    }),
    node("core.lalanne_pushup", "LaLanne Push-Up", SECTOR, 0.8, reps(8, 3), [
      "core.long_lever_plank",
      "core.ab_rollout_knees",
    ], {
      sa: true,
      evidence: "C",
      description: "Push-up with the arms extended out in front of the shoulders — 3×8. Seed exercise (push-04, band 1). A straight-arm lever, so it loads the elbow like a rollout rather than like a push-up.",
    }),
    node("core.lalanne_pushup_one_arm", "1-Arm LaLanne Push-Up", SECTOR, 2, reps(3, 3, true), [
      "core.lalanne_pushup",
      "core.rollout_standing_part",
    ], {
      sa: true,
      isStunt: true,
      evidence: "D",
      estMonths: [12, 30],
      description:
        "3×3 per side. Seed exercise (push-04, band 0) and the hardest rung of that chain. A one-arm straight-arm lever against a full-length body — closer to a one-arm rollout than to a push-up, and the most tendon-demanding thing in the conditioning slots.",
    }),
  ],

  // Splice the new work beneath the existing hubs (skills.ts stays untouched).
  rewire: {
    // hollow line: 15 s before the 30 s G-HOLLOW gate.
    "dragon_flag.hollow": ["core.hollow_15s"],
    "dragon_flag.tuck": ["core.df_negative"],
    "dragon_flag.straddle": ["core.df_one_leg"],
    "dragon_flag.full_hold": ["core.df_full_negative"],
    // L-sit line: floor support before parallette support, tuck hold before one-leg L,
    // a duration ladder before the owned 3×30 s L-sit, compression before the V-sit.
    "l_sit_manna.support": ["core.floor_support"],
    "l_sit_manna.one_leg_l": ["core.tuck_hold"],
    "l_sit_manna.l_sit": ["core.lsit_15s"],
    "l_sit_manna.v_sit": ["core.pike_compression"],
  },
};
