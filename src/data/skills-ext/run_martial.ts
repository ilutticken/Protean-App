// Extension nodes for the "run_martial" (locomotion / conditioning) sector.
//
// WHY: skills.ts starts this sector at "Run 1 Mile Continuous" and "Water Competence
// (100 m)" — both of which already assume a trained beginner. This file supplies the
// on-ramp beneath those hubs plus the missing breadth the sector brief calls out:
// skipping, loaded carries, running-form drills, sprint work and boxing rounds.
//
// Sources: docs/research/06-addendum-1.md §3.1 (run distance ladder + build rules),
// §3.4 (swim ladder + "gate behind lessons below competence, do not gamify"),
// §4 safety table (open water = lifeguard/buddy only); docs/research/06-addendum-2.md
// §3 seed slots legs-11 / full-03 / full-05 / full-09 / full-10 / full-11 (band targets).
//
// CRITERION CHOICE (deliberate): no timeUnder() anywhere. skills.test.ts requires every
// "time"-criterion node to have a row in `locomotionTimeBySex`, and that table lives in
// skills.ts which an extension may not edit. Run/swim milestones therefore use
// distanceOf() (matching how run_distance.* / swim.* are already authored) with the
// duration or session shape carried in the criterion note; gym-floor conditioning uses
// reps() so logged sets auto-feed the tree.
//
// ID REUSE: where a rung IS an exercise the routine already logs, the node id is that
// exact catalog id (cond.*, carry.*, power.*), so a logged set auto-satisfies the node.
// All reused ids carry catalog sector "run_martial" (crossref.test.ts pins this).
//
// RINGS: true-beginner content sits at NEGATIVE rings; buildSkills() normalizes the
// sector so its lowest ring becomes 0. Ring -4 holds the seven zero-prereq day-one
// entries (including swim_base.water_safety, which must stay at the sector floor so the
// isStunt node swim.3800m still traces back to a ring-0 ancestor after normalization).

import type { SectorExtension } from "../skill-helpers";
import { ATTESTED, distanceOf, node, reps, wreps } from "../skill-helpers";

const S = "run_martial" as const;

export const runMartialExt: SectorExtension = {
  nodes: [
    // ---------------------------------------------------------------- run on-ramp
    // Four rungs below run_distance.mile. C25K is the canonical beginner program
    // referenced by addendum-1 §3.1 ("9 weeks × 3 sessions/wk walk-run to 30 min").
    node("run_base.walk_30min", "Brisk Walk 30 Min", S, -4, distanceOf(2500, "30 min unbroken brisk walk"), [], {
      estMonths: [0, 1],
      description:
        "The day-one entry to the whole sector: 30 minutes of continuous brisk walking (≈2.5 km) without stopping. No running required.",
    }),
    node("run_base.walk_run_20min", "Walk-Run 20 Min", S, -3, distanceOf(2200, "20 min: jog 60 s / walk 90 s × 8"), [
      "run_base.walk_30min",
    ], { description: "C25K week 1: eight rounds of 60 s jog / 90 s walk after a 5 min walking warm-up (addendum-1 §3.1, tier C canonical program)." }),
    node("run_base.jog_5min", "Jog 5 Min Unbroken", S, -2, distanceOf(700, "5 min continuous jog, conversational"), [
      "run_base.walk_run_20min",
    ], { description: "First unbroken jog — no walk breaks. Pace is whatever lets you hold a conversation; ≈700 m for most beginners." }),
    node("run_base.jog_1k", "Jog 1 km Unbroken", S, -1, distanceOf(1000, "1 km with no walk breaks"), [
      "run_base.jog_5min",
    ], { estMonths: [1, 2], description: "≈8–10 min of continuous jogging. The direct feeder into the existing 1-mile hub." }),

    // -------------------------------------------------- run ladder gap-fillers
    node("run_base.run_2k", "Run 2 km Continuous", S, 0.4, distanceOf(2000, "1 completion, unbroken"), [
      "run_distance.mile",
    ], { estMonths: [1, 2], evidence: "D", description: "Bridges the mile → 5K gap; roughly 2–4 weeks of ≤+10%/wk volume growth past the mile." }),
    node("run_base.long_8k", "Long Run 8 km", S, 1.5, distanceOf(8000, "1 completion; build ≤ +10%/wk"), [
      "run_distance.5k",
    ], { evidence: "D", description: "The 5K → 10K midpoint. Addendum-1 §3.1: ≥3 runs/wk for 6+ weeks post-5K, weekly volume increase ≤10%." }),
    node("run_base.long_15k", "Long Run 15 km", S, 2.5, distanceOf(15000, "longest single run in the block"), [
      "run_distance.10k",
    ], { estMonths: [6, 9], description: "Addendum-1 §3.1 names a ≥15 km logged long run as the gate for a half-marathon block — this makes that gate a node." }),
    node("run_base.long_30k", "Long Run 30 km", S, 3.5, distanceOf(30000, "28–30 km long run"), [
      "run_distance.half",
    ], { estMonths: [12, 18], description: "Addendum-1 §3.1's marathon-block prerequisite (long run ≥28–30 km) — the last rung before the marathon itself." }),

    // ------------------------------------------------- running form (side branch)
    // Seed slot legs-11 logs these directly, so they auto-feed once performed.
    node("cond.100up_minor", "100-Up Minor", S, -4, reps(100), [], {
      description: "100 alternating knee-lifts on the spot, foot rising to the opposite ankle, tall relaxed posture. Zero-impact running-form drill; seed legs-11 band 2.",
    }),
    node("cond.100up_major", "100-Up Major", S, -3, reps(100), ["cond.100up_minor"], {
      description: "Same drill with the knee to hip height and a ball-of-foot landing under the hip. Seed legs-11 band 1 target (100 steps).",
    }),

    // ------------------------------------------------ stride / sprint side branch
    node("run_base.strides", "Strides ×6", S, 0.4, distanceOf(600, "6 × 100 m relaxed strides at mile pace"), [
      "run_distance.mile",
    ], { evidence: "D", description: "Six 100 m accelerations at about mile effort with a full walk-back. Cheapest speed work there is; add to the end of an easy run." }),
    node("run_base.hill_sprints", "Hill Sprints ×10", S, 1.5, distanceOf(800, "10 × 80 m hill sprints, walk-down rest"), [
      "run_base.strides",
    ], { evidence: "D", description: "Ten maximal 10–15 s efforts on a moderate hill with full walk-down recovery. Low soft-tissue risk relative to flat sprinting." }),

    // -------------------------------------------------------------- erg on-ramp
    // skills.ts starts rowing at a 500 m piece. Ring -4 is this sector's floor, so the
    // rowing line needs a root down here or row.marathon cannot trace back to ring 0
    // (locked decision #13, enforced by skills.test.ts).
    node("row_base.stroke_drill", "Erg Stroke Drill", S, -4, reps(20, 3), [], {
      evidence: "D",
      description: "3×20 strokes at quarter pressure, calling the sequence out loud: legs, body, arms — arms, body, legs. Almost everyone rows arms-first for their whole life unless they drill this.",
    }),
    node("row_base.row_250m", "Row 250 m", S, -3, distanceOf(250, "one continuous piece"), [
      "row_base.stroke_drill",
    ], {
      evidence: "D",
      description: "One minute or so of continuous rowing with the sequence intact. The rung beneath the 500 m sprint.",
    }),

    // ------------------------------------------------------------- swim on-ramp
    // addendum-1 §3.4: below water competence, gate behind lessons and DO NOT gamify
    // (drowning risk). The pre-competence node is therefore attestation-only.
    node("swim_base.water_safety", "Water Safety Basics", S, -4, ATTESTED, [], {
      description:
        "Tread water 60 s and back-float 60 s, in a lifeguarded pool. NO_AUTO_UNLOCK by design: addendum-1 §3.4 says gate everything below water competence behind lessons and never gamify it.",
    }),
    node("swim_base.crawl_25m", "Front Crawl 25 m", S, -3, distanceOf(25, "one length, no wall rest"), [
      "swim_base.water_safety",
    ], { description: "One full length of front crawl with side breathing, no stop at the wall mid-length." }),
    node("swim_base.crawl_50m", "Front Crawl 50 m", S, -2, distanceOf(50, "2 lengths continuous"), [
      "swim_base.crawl_25m",
    ], { estMonths: [1, 3], description: "Two lengths unbroken — the rung that makes the existing 100 m competence node reachable rather than an entry gate." }),
    node("swim_base.crawl_200m", "200 m Freestyle", S, 0.5, distanceOf(200, "continuous, no wall rests"), [
      "swim.competence_100m",
    ], { evidence: "D", description: "Halves the 100 m → 400 m jump. Expect 4–7 min at beginner pace (addendum-1 §3.4 beginner band 2:30–3:30 /100 m)." }),
    node("swim_base.open_water_400m", "Open-Water 400 m", S, 1.5, ATTESTED, ["swim.400m"], {
      description:
        "400 m of open water — sighting, no walls, no black line. Attested only: addendum-1 §4 flags every open-water attempt \"with lifeguard/buddy only\", so the app must never auto-unlock it.",
    }),

    // ------------------------------------------------------- skipping / jump rope
    // Seed slot full-10 (unit "skips", tiers [50,100,150]) logs cond.skip_no_rope,
    // cond.skip and cond.single_leg_skip, so those three auto-feed.
    node("cond.skip_no_rope", "Skip, No Rope ×50", S, -4, reps(50), [], {
      evidence: "D",
      description: "50 unbroken rope-less skips (≈30 s) — rehearses the ankle bounce and rhythm before a rope is involved. Seed full-10 band 2.",
    }),
    node("cond.skip", "Jump Rope ×100", S, -3, reps(100), ["cond.skip_no_rope"], {
      description: "100 unbroken single-unders. Seed full-10 band 1 target.",
    }),
    node("skip.skip_500", "Jump Rope ×500", S, -2, reps(500), ["cond.skip"], {
      evidence: "D",
      description: "500 unbroken single-unders, ≈4–5 min of continuous work — the point where skipping becomes a conditioning tool rather than a drill.",
    }),
    node("cond.single_leg_skip", "Single-Leg Skip ×50", S, -1, reps(50, undefined, true), ["skip.skip_500"], {
      description: "50 unbroken skips per leg. Seed full-10 band 0 target (perSide). Big calf/Achilles stiffness demand — build it slowly.",
    }),
    node("skip.double_under_10", "Double-Unders ×10", S, -1, reps(10), ["skip.skip_500"], {
      evidence: "D",
      description: "10 consecutive double-unders. Equal-difficulty sibling of the single-leg branch: this one buys rope speed, that one buys stiffness.",
    }),
    node("skip.double_under_50", "Double-Unders ×50", S, 0.5, reps(50), ["skip.double_under_10"], {
      evidence: "D",
      description: "50 consecutive double-unders without a trip.",
    }),

    // ------------------------------------------------------------- loaded carries
    // Seed legs-11 (unit "steps", tiers [50,100,150]) and full-09 (perSide, [50,150,200]).
    node("carry.bilateral_carry", "Loaded Carry ×50", S, -4, reps(50), [], {
      description: "50 steps with a moderate two-hand load (dumbbells, kettlebells or a loaded bag), ribs down and no lean. Seed legs-11 band 0 target.",
    }),
    node("carry.briefcase_carry", "Briefcase Carry ×50", S, -3, reps(50, undefined, true), [
      "carry.bilateral_carry",
    ], { description: "50 steps per side with the load in one hand only — anti-lateral-flexion work. Seed full-09 band 0 target." }),
    node("carry.briefcase_100up", "Briefcase 100-Up", S, -2, reps(100, undefined, true), ["carry.briefcase_carry"], {
      evidence: "D",
      description: "100 marching 100-Up steps per side while holding a one-hand load — the seed's carry × running-form hybrid (full-09).",
    }),

    // -------------------------------------------------- boxing / bag conditioning
    // Seed full-11 is a rounds slot (5 × 60 s work, 30 s rest); the logger records a
    // round by its work-seconds, so reps(60) == "completed one unbroken 60 s round".
    node("cond.shadow_boxing", "Shadow Boxing Round", S, -4, reps(60), [], {
      description: "One unbroken 60 s round of continuous shadow boxing — hands up, feet moving, no coasting. Seed full-11 (rounds slots log a round by its work-seconds).",
    }),
    node("cond.bag_work", "Bag Work Round", S, -3, reps(60), ["cond.shadow_boxing"], {
      description: "One unbroken 60 s round on a heavy bag. Same slot as shadow boxing, one equipment step up; work toward the full 5 × 60 s prescription.",
    }),

    // ------------------------------------------- burpee / full-body conditioning
    // Seed full-03 (tiers [10,25,50]): burpee band 1, devil press band 1, man maker band 0.
    node("cond.burpee", "Burpees ×15", S, -4, reps(15), [], {
      evidence: "D",
      description: "15 unbroken burpees, chest to floor and a full stand at the top. Deliberately below the seed's band target (25) so it works as a genuine entry rung.",
    }),
    node("power.devil_press", "Devil Press ×25", S, -3, reps(25), ["cond.burpee"], {
      description: "25 unbroken devil presses with light dumbbells — burpee into a two-dumbbell snatch. Seed full-03 band 1 target.",
    }),
    node("power.man_maker", "Man Maker ×10", S, -2, reps(10), ["power.devil_press"], {
      description: "10 unbroken man makers (push-up, two renegade rows, clean to overhead). Seed full-03 band 0 target — the sector's loaded-conditioning capstone.",
    }),

    // ------------------------------------- conditioning slots (loaded + rope)
    // Nodes for routine exercises that previously credited nothing. Ids are the
    // canonical exercise ids, so logged sets auto-feed the tree.
    //
    // cond.sandbag_tug_crawl sits here rather than in `balance`, where the
    // catalog files it (push-08 is a balance slot): every balance node is
    // attestation-only by locked decision #10, and a loaded crawl should credit
    // from a logged set. crossref.test.ts carries the documented exception.
    node("cond.sandbag_tug_crawl", "Sandbag Tug Crawl", S, -2.9, reps(20, 2), ["carry.bilateral_carry"], {
      evidence: "D",
      description: "Crawl forward dragging a sandbag behind you — 2×20 steps (push-08 counts steps; band-0 target is 20).",
    }),
    node("power.db_runner", "Dumbbell Runner", S, -2.8, reps(20, 3), ["carry.briefcase_carry"], {
      evidence: "D",
      description: "Alternating dumbbell drive in a running arm action — 3×20. Seed exercise (full-05).",
    }),
    node("carry.sandbag_bw", "BW Sandbag Carry", S, 0.2, wreps(100, 1), [
      "cond.sandbag_tug_crawl",
      "carry.briefcase_100up",
    ], {
      isStunt: true,
      evidence: "D",
      estMonths: [8, 18],
      description:
        "100 unbroken steps carrying a sandbag of your own bodyweight — push-08's top tier, at 1.0×BW. ♀ criterion 0.75×BW. Grip and trunk fail long before the legs do, which is what makes it a carry stunt rather than a leg one.",
    }),
    node("skip.double_under_100", "Double-Unders ×100", S, 1, reps(100), ["skip.double_under_50"], {
      isStunt: true,
      evidence: "D",
      estMonths: [6, 15],
      description:
        "100 consecutive double-unders, no trips. Almost entirely a timing and calf-endurance problem rather than a strength one — the honest conditioning capstone of the rope line.",
    }),
  ],

  // Splice the new easier work beneath the hubs that skills.ts already authored, and
  // hang the doc-mandated long runs off the distance ladder they gate.
  rewire: {
    // Root the skills.ts rowing ladder on the erg on-ramp above.
    "row.500m": ["row_base.row_250m"],
    "run_distance.mile": ["run_base.jog_1k"],
    "run_distance.5k": ["run_base.run_2k"],
    // NOT rewired: run_distance.10k. The 8 km long run is our own interpolation, not a
    // doc-mandated gate, and skills.test.ts pins "5K achieved ⇒ 10K available". It sits
    // between the two as an optional rung instead. The 15 km / 30 km long runs below ARE
    // spelled out as block prerequisites in addendum-1 §3.1, so those do gate.
    "run_distance.half": ["run_base.long_15k"],
    "run_distance.marathon": ["run_base.long_30k"],
    "swim.competence_100m": ["swim_base.crawl_50m"],
    "swim.400m": ["swim_base.crawl_200m"],
  },
};
