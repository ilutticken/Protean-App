// Extension nodes for the "pull_levers" sector — the beginner on-ramp beneath the
// existing hubs plus intermediate rungs inside the oversized gaps.
//
// WHY: skills.ts enters this sector at `one_arm_pullup.pullup10` (10 strict dead-hang
// pull-ups) and `back_lever.german_hang` (3×30 s). Both are months-to-years of work for
// an untrained adult, so the sector had no floor at all. This file adds:
//   (1) a day-one floor (dead hang, band pull, incline row) at the sector's new lowest ring;
//   (2) two parallel on-ramps — horizontal rows, and assisted → negative → partial-ROM
//       vertical pulling — that converge on a first chin-up, then a first pull-up, then the
//       3 / 5 / 8-rep ladder that feeds the existing ×10 hub;
//   (3) a skin-the-cat branch beneath the German hang (doc 01 §3.3's stated prerequisite);
//   (4) tuck-front-lever sub-steps beneath the authored 3×20 s tuck gate;
//   (5) mid-line fills: +10% / +35% / +70% BW weighted pull-ups, chest-to-bar, L-sit
//       pull-up, typewriter, and a 10 s one-arm negative.
//
// Sources: docs/research/01-skill-progressions.md §3.2 (front-lever prerequisite baseline),
// §3.3 (german hang / skin-the-cat gate), §3.5 (muscle-up rep thresholds), §3.8 (the
// weighted-pull-up gate table + the ordered OAP chain), §3.13 (rope-climb pull-up base);
// docs/research/06-addendum-2.md §3 pull-day slots (pull-01…pull-09), whose exercise ids are
// reused verbatim as node ids below so logged sets auto-feed these nodes.
//
// RINGS: -2.5 is this sector's new floor (buildSkills normalizes it to 0). That value is
// NOT free — it deliberately MATCHES the dips_planche_hs floor, because two pre-existing
// cross-sector edges in skills.ts couple the two sectors' normalization shifts
// (M = pull_levers shift, D = dips_planche_hs shift):
//   muscle_up_rings.false_grip_hang ← dip.ring_dip   requires  M > D − 1
//   maltese.lean ← iron_cross.iron_cross             requires  M < D + 1
// so M must stay within 1 of D. M = D = 2.5 keeps a full ring of margin on both sides.
// >>> If the dips_planche_hs floor ever moves, move this sector's floor with it (rescale
// >>> the ten negative levels below; their ORDER is all that matters structurally). <<<
// On-ramp levels are spaced 0.25 apart; fractional positive rings insert between the
// authored integer rings. Every prereq's ring is strictly smaller than its dependent's,
// including the spliced `rewire` edges.

import type { SectorExtension } from "../skill-helpers";
import { hold, node, reps, wreps } from "../skill-helpers";

const S = "pull_levers" as const;

export const pullLeversExt: SectorExtension = {
  nodes: [
    // ================================================================== ring -2.5
    // Day one. No pull-up strength assumed; a bar (or just a band) is all that is needed.
    node("pull.dead_hang", "Dead Hang", S, -2.5, hold(30), [], {
      description:
        "30 s relaxed two-arm hang, shoulders loose, full grip. Build toward the routine's pull-08 target of 60 s. Grip, not lats, is the limiter here (doc 04 §3.4).",
    }),
    node("pull.band_pull", "Band Pull", S, -2.5, reps(15, 2), [], {
      evidence: "D",
      description:
        "2×15 seated or standing band row: elbows to the ribs, shoulder blades finishing together. The zero-equipment entry to the whole sector (seed slot pull-03, band 2).",
    }),

    // ================================================================ ring -2.25
    node("pull_base.scap_pull", "Scapular Pull-Up", S, -2.25, reps(8, 3), ["pull.dead_hang"], {
      description:
        "3×8 straight-arm scapular pulls from a dead hang — elbows locked, chest rises 5–8 cm on shoulder depression alone. Doc 01 §3.2/§3.8 name this the prehab gate for the whole sector.",
    }),
    node("pull.row_incline", "Incline Row", S, -2.25, reps(12, 3), ["pull.band_pull"], {
      evidence: "D",
      description:
        "Bar or rings at chest height, torso steep (~60° from horizontal), feet under you — the elevated/easy row, ≈0.55×BW. Walk the feet out to lower the angle.",
    }),

    // ================================================================ ring -2
    node("pull_base.active_hang", "Active Hang 45 s", S, -2, hold(45), ["pull_base.scap_pull"], {
      description:
        "45 s hanging with the shoulders actively packed (scapulae depressed, ribs down) — doc 01 §3.8's 30–45 s active-hang support gate.",
    }),
    node("pull.scap_row", "Scapula Row", S, -2, reps(10, 3), ["pull.row_incline"], {
      evidence: "D",
      description:
        "3×10 in the incline-row position: arms stay straight, only the shoulder blades move (retract, hold 1 s). Teaches the scapular half of every pull.",
    }),
    node("pull.row_bodyweight", "Bodyweight Row", S, -2, reps(10, 3), ["pull.row_incline"], {
      description:
        "3×10 horizontal row: body in one line, heels on the floor, chest touches the bar. ≈0.72×BW (doc 02 inverted-row load fractions).",
    }),
    node("pull.pullup_assisted", "Band-Assisted Pull-Up", S, -2, reps(8, 3), [
      "pull_base.scap_pull",
      "pull.row_incline",
    ], {
      evidence: "D",
      description:
        "3×8 with a loop band under the feet (or an assist machine). Step down one band thickness roughly every 2–3 weeks; the chin clears the bar on every rep or the assistance stays.",
    }),

    // ================================================================ ring -1.75
    node("pull_base.inverted_hang", "Inverted Hang", S, -1.75, hold(20, 3), ["pull_base.active_hang"], {
      sa: true,
      evidence: "D",
      description:
        "3×20 s hanging upside-down from rings or a bar, hips above the hands, arms straight. The shoulder position every lever is built on.",
    }),
    node("pull.row_decline", "Decline Row", S, -1.75, reps(10, 3), ["pull.row_bodyweight"], {
      description: "3×10 with the feet elevated to bar height — ≈0.85×BW, the hardest unloaded row.",
    }),
    node("pull.one_arm_row_rotation", "One-Arm Row + Rotate", S, -1.75, reps(8, 2, true), [
      "pull.row_bodyweight",
    ], {
      evidence: "D",
      description:
        "2×8 per side, rotating the free shoulder open at the top. First unilateral pulling exposure — years before the one-arm line, but the pattern starts here (seed slot pull-03).",
    }),
    node("pull.pullup_negative", "Pull-Up Negative 5 s", S, -1.75, reps(5, 3), ["pull.pullup_assisted"], {
      description:
        "3×5 eccentrics: jump or step to chin-over-bar, lower under control for 5 s. Extend to 8 s and then 10 s before expecting a concentric rep.",
    }),
    node("pull_base.top_hold", "Chin-Over-Bar Hold", S, -1.75, hold(20, 3), ["pull.pullup_assisted"], {
      evidence: "D",
      description:
        "3×20 s isometric at the top of the pull-up: chin clear of the bar, elbows pinned to the ribs. Jump or step up into position.",
    }),

    // ================================================================ ring -1.5
    node("back_lever.skin_cat_assisted", "Assisted Skin-the-Cat", S, -1.5, reps(5, 3), [
      "pull_base.inverted_hang",
    ], {
      sa: true,
      evidence: "D",
      description:
        "3×5 slow rotations through inversion with the feet on a box or a band under the hips. Stop at the first hint of medial-elbow discomfort — the most-reported calisthenics tendon injury (doc 01 §2.4).",
    }),
    node("pull.row_decline_weighted", "Weighted Decline Row", S, -1.5, wreps(8, 0.2, 3), ["pull.row_decline"], {
      evidence: "D",
      description: "3×8 feet-elevated row with +20% BW in a vest or on the hips — the top of the row branch.",
    }),
    node("pull_base.jumping_pullup", "Jumping Pull-Up", S, -1.5, reps(8, 3), ["pull.pullup_negative"], {
      evidence: "D",
      description:
        "3×8 with the legs contributing only the first third of the pull, then a 3 s controlled descent. Reduce the leg drive every block.",
    }),
    node("pull_base.half_rom_pullup", "Half-ROM Pull-Up", S, -1.5, reps(5, 3), ["pull_base.top_hold"], {
      evidence: "D",
      description:
        "3×5 from a 90° elbow bend to chin-over-bar. Lengthen the range by about a hand-width every 2 weeks until it is a full-ROM rep.",
    }),

    // ================================================================ ring -1.25
    node("back_lever.skin_cat", "Skin-the-Cat", S, -1.25, reps(5, 3), ["back_lever.skin_cat_assisted"], {
      sa: true,
      description:
        "3×5 slow and unassisted, into the German-hang position and back out. Doc 01 §3.3 names this the prerequisite for any back-lever work.",
    }),
    node("pull_base.chinup1", "First Chin-Up", S, -1.25, reps(1), [
      "pull_base.half_rom_pullup",
      "pull_base.jumping_pullup",
    ], {
      estMonths: [1, 4],
      description:
        "One strict supinated chin-up from a full dead hang, no kip. Supination gives the biceps a better line, so this arrives before the pronated rep (doc 01 §3.8).",
    }),

    // ================================================================ ring -1
    node("pull_base.pullup1", "First Pull-Up", S, -1, reps(1), ["pull_base.chinup1"], {
      estMonths: [2, 6],
      description: "One strict pronated dead-hang pull-up, chin fully over the bar, no swing.",
    }),

    // ================================================================ ring -0.75
    node("pull_base.pullup3", "Strict Pull-Ups ×3", S, -0.75, reps(3), ["pull_base.pullup1"], {
      evidence: "D",
      description: "3 strict reps in one set — the first rep milestone that turns into real training volume.",
    }),

    // ================================================================ ring -0.5
    node("pull_base.pullup5", "Strict Pull-Ups ×5", S, -0.5, reps(5), ["pull_base.pullup3"], {
      description: "5 strict reps — doc 01 §3.5's stated entry threshold for muscle-up work.",
    }),

    // ================================================================ ring -0.25
    node("pull_base.pullup8", "Strict Pull-Ups ×8", S, -0.25, reps(8), ["pull_base.pullup5"], {
      description:
        "8 strict reps — doc 01 §3.13's rope-climb base and the last rung below the authored ×10 hub.",
    }),

    // ================================================================ ring 0.25
    node("front_lever.tuck_hang", "Tuck FL Hang", S, 0.25, hold(20, 3), [
      "pull_base.pullup5",
      "pull_base.inverted_hang",
    ], {
      sa: true,
      evidence: "D",
      description:
        "3×20 s hanging with the knees tucked to the chest and the hips under the bar, arms straight. The shape rehearsal before any front-lever load.",
    }),

    // ================================================================= ring 0.5
    node("pull_base.wpu_10pct", "Weighted Pull-Up +10%", S, 0.5, wreps(5, 0.1, 3), [
      "one_arm_pullup.pullup10",
    ], {
      description: "3×5 at +10% BW — the first loaded rung of doc 01 §3.8's ordered chain (+10 / 20 / 30%).",
    }),
    node("pull_base.c2b_pullup", "Chest-to-Bar Pull-Up", S, 0.5, reps(5, 3), ["one_arm_pullup.pullup10"], {
      description:
        "3×5 pulling until the sternum touches the bar. Doc 01 §3.5 makes 5 chest-to-bar reps the stated gate for both muscle-up lines.",
    }),
    node("pull.towel_pullup_assisted", "Assisted Towel Pull-Up", S, 0.5, reps(8, 2), ["pull_base.pullup5"], {
      evidence: "D",
      description:
        "2×8 on towels with the feet on the floor or the bar declined. Grip-specific bridge into the full towel pull-up (seed slot pull-01, band 2).",
    }),

    // ================================================================ ring 0.75
    node("front_lever.tuck_10s", "Tuck Front Lever 10 s", S, 0.75, hold(10, 3), ["front_lever.tuck_hang"], {
      sa: true,
      evidence: "D",
      description:
        "3×10 s tuck front lever — the halfway rung to the authored 3×20–30 s tuck gate (doc 01 §3.2 step 1). Straight arms; advance no faster than one step per 21 days.",
    }),

    // ================================================================= ring 1.5
    node("pull_base.wpu_35pct", "Weighted Pull-Up +35%", S, 1.5, wreps(3, 0.35), [
      "one_arm_pullup.wpu_25pct",
    ], {
      description:
        "3 reps @ +35% BW — the top of doc 01 §3.8's +25–45% 'sensible entry' band, halfway to the +50% checkpoint.",
    }),
    node("pull_base.lsit_pullup", "L-Sit Pull-Up", S, 1.5, reps(5, 3), ["pull_base.c2b_pullup"], {
      evidence: "D",
      description:
        "3×5 pull-ups holding the legs parallel to the floor throughout. Pairs naturally with an owned L-sit (core sector) but is gated here on chest-to-bar strength only.",
    }),

    // ================================================================= ring 3.5
    node("pull_base.typewriter_pullup", "Typewriter Pull-Up", S, 3.5, reps(3, 3, true), [
      "one_arm_pullup.archer_pullup",
    ], {
      evidence: "D",
      description:
        "3×3 per side: pull to one hand, then travel across the bar at chin height before lowering. The archer's dynamic sibling and the last bilateral step before uneven work.",
    }),

    // ================================================================= ring 4.5
    node("pull_base.wpu_70pct", "Weighted Pull-Up +70%", S, 4.5, wreps(1, 0.7), ["one_arm_pullup.wpu_50pct"], {
      description:
        "1 rep @ +70% BW. Doc 01 §3.8: +70–80% BW is the strength equivalent of an actual one-arm pull-up — expect the OAP shortly after this once the unilateral and grip work is done.",
    }),

    // ================================================================= ring 5.5
    node("pull_base.oap_negative_10s", "OAP Negative 10 s", S, 5.5, reps(3, 3, true), [
      "one_arm_pullup.oap_negative",
    ], {
      evidence: "D",
      description:
        "3×3 per side at a 10 s descent (doc 01 §3.8 asks 5–8 s). Own the slower eccentric before spending months on band-assisted attempts.",
    }),
  ],

  // Splice the new easier work underneath the already-authored hubs. Every id on the
  // right has a strictly smaller ring than its target on the left.
  rewire: {
    // The sector's two ring-0 hubs now sit on top of the on-ramp.
    "one_arm_pullup.pullup10": ["pull_base.pullup8"],
    "back_lever.german_hang": ["back_lever.skin_cat"],
    // Front-lever tuck sub-steps feed the ADVANCED tuck, not `front_lever.tuck` itself:
    // skills.test.ts pins that achieving the ×10 hub alone makes the tuck front lever available.
    "front_lever.adv_tuck": ["front_lever.tuck_10s"],
    // Towel pull-up keeps its doc prereq (5 strict pull-ups + towel hang) via the assisted step.
    "pull.towel_pullup": ["pull.towel_pullup_assisted"],
    // Weighted-pull-up ladder: +10% → +25% → +35% → +50% → +70%.
    "one_arm_pullup.wpu_25pct": ["pull_base.wpu_10pct"],
    "one_arm_pullup.wpu_50pct": ["pull_base.wpu_35pct"],
    // One-arm line: typewriter before uneven; +70% BW and the 10 s negative before assisted OAP.
    "one_arm_pullup.uneven_pullup": ["pull_base.typewriter_pullup"],
    "one_arm_pullup.assisted_oap": ["pull_base.oap_negative_10s", "pull_base.wpu_70pct"],
    // Doc 01 §3.5 gates both muscle-up lines on 5 chest-to-bar reps.
    "muscle_up_bar.explosive_pullup": ["pull_base.c2b_pullup"],
    "muscle_up_rings.false_grip_hang": ["pull_base.c2b_pullup"],
    // Rope/towel hang inherits the plain dead hang as its base.
    "rope_climb.rope_hang": ["pull.dead_hang"],
  },
};
