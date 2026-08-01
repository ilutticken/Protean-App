# 06 — Addendum 2: The Protean Routine, Fully Enumerated (Authoritative Seed Plan)

Fills the reviewer gap: "the seed plan is referenced everywhere but never enumerated." This doc is **source acquisition + transcription**, not literature research. Primary source obtained and verified: `reference_mat/Printable-Routines.pdf` (6 pages, read in full 2026-08-01) [Protean Routine PDF, author = the user, reference_mat/Printable-Routines.pdf]. Cross-checked against the repo transcription [protean-routine-source.md, 2026, docs/protean-routine-source.md] — transcription is faithful. External citations appear only where app defaults fill holes the PDF leaves open (rest, angles), carried from docs 01/03.

## 0. Source fidelity notes (PDF → seed)

| PDF artifact | Ruling for seed |
|---|---|
| "Famers' Walk" (p.5) | Typo → `Farmers' Walk` |
| Prayer Squat "30 minute" (p.6) | Typo → **30 s** (all neighbors are 30 s) |
| "(Alternative: 2 x 50: Overspeed KB Swing…)" (p.2) | A true alternative slot for `legs-04`, single rep number |
| "2 x 20 Planche Push Ups > …" (p.4) | Single rep number, no tiers — see §1.4 conflict |
| Overcoming Isometric listed **inside The Warm-Up** (p.1), not on any training day | Correction to doc 03 §14's placement: it is a **daily warm-up finisher**, parameterized by day pattern (§5). Doc 03's in-session placement is a *recommendation*, not the source |
| No day-of-week order, no rest periods, no tempo, no "each side" markers except Full-Body carries/skipping and warm-up items | All are app defaults, flagged `authorConfirmed:false` (§7) |

## 1. Rep-tier semantics — the load-bearing ruling (author question a)

### 1.1 Evidence on record

- **Doc 03 §1.3 (interpretation A):** `[15,20,35]` = T1 entry / T2 work / T3 exit **within the current chain step**.
- **Doc 01 §0.3 (interpretation B):** "the three numbers are rep targets for the same slot at three difficulty tiers" — reps keyed to **chain position**.
- **Source doc header (closest thing to author intent on record):** "The athlete picks the hardest variant they can perform for the tier's rep count; **rep tiers correspond to chain position (harder variant = fewer reps)**" and "Tiers are keyed to chain difficulty, **not per-variant double progression**" [protean-routine-source.md, 2026].
- Physical sanity check: 35 weighted pistols (A's exit) is implausible; 15 weighted pistols vs 35 lunge walks (B) is coherent.

### 1.2 Ruling encoded in the seed

**Interpretation B wins for multi-step chains.** Because chains have 2–7 steps but always ≤3 numbers, the tiers are **difficulty bands**, and every step carries a band index:

```
band(i, N) = (N == 1) ? 1 : roundHalfUp(2*i / (N-1))   // i = 0 (hardest) … N-1 (easiest)
workTarget(step) = repTiers[band(step)]                 // reps per set, at slot's set count
```

Band arrays this produces: N=2→[0,2] · N=3→[0,1,2] · N=4→[0,1,1,2] · N=5→[0,1,1,2,2] · N=6→[0,0,1,1,2,2] · N=7→[0,0,1,1,1,2,2]. Every step's computed band is materialized in the seed JSON (§3) so the engineer can hand-override without touching the formula. Bands are evidence tier `[D]` (deterministic default, not author-confirmed).

**Interpretation A survives for single-step slots** (`full-04..06, full-08`: halos, dumbbell runners, overhand curls, face pulls): with one step, "three difficulty bands" is meaningless and `[10,25,30]` can only be an in-step rep ladder — exactly doc 03's T1/T2/T3. The two docs are not contradictory; they describe the two slot shapes.

### 1.3 What survives of doc 03 §1.4's engine

All rules survive with one indirection — replace "tier target" with `repTiers[band(currentStep)]`:

| Rule | Rewritten trigger |
|---|---|
| `R-REP` | unchanged (+1 rep toward `workTarget(step)`) |
| `R-STEP` | all sets ≥ `workTarget(step)` for `confirmSessions` (2) → `currentStepIndex -= 1`; new target = new step's band target (drops automatically when crossing a band boundary) |
| `R-LOAD` | steps with `load:true`: oscillate reps at band target, progress kg (+2.5 lower / +1.25 upper); chain-exit via load anchor (e.g. pistol @ +25% BW) per doc 03 §1.4 hybrid rule |
| `R-LAND` | reps < 60% of band target on ≥ half the sets → revert one step, 14-day cooldown (60% ≈ doc 01 §0.3's "miss by >25% twice" made per-session-strict) |
| `R-STALL`/`R-REGRESS` | unchanged |

**Naming collision to fix in code:** doc 05 logs `(chainId, exerciseIndex, tier, …)` where "tier" means *chain position*; doc 03 "tier" means *rep number*. Rename: `stepIndex` (chain position) and `repBand` (0/1/2). Log record becomes `(slotId, stepIndex, repBand, weightKg|null, reps|seconds)`.

### 1.4 Skill-step conflict rule

Where a chain step IS a doc 01 skill-line step, band targets can exceed doc 01 unlock criteria by an order of magnitude (planche push-up: slot says 2×20, doc 01 says 3×3 unlocks it; weighted pistol: 2×15 vs 3×5@+25%BW). Ruling: **slot progression uses band targets; skill-tree credit uses doc 01 criteria** (`min` gate — the tree node unlocks at doc 01's number even mid-slot-progression). For band-0 straight-arm steps the engine should additionally cap the working target at doc 01's criteria ×1.5 and mark the PDF's number aspirational (`PENDING-Q3`, §7).

## 2. Slot schema (extends doc 03 §1.3)

| Field | Type / default | Meaning |
|---|---|---|
| `id` | `"legs-02"` | stable slot key; day prefix + PDF order |
| `type` | `"chain"` (default) \| `"quasi_iso"` \| `"timed_hold"` \| `"iso_overcoming"` \| `"rounds"` \| `"warmup_item"` \| `"mobility_item"` | dispatch for logger UI (doc 05 §1) |
| `sets` | int | PDF's leading number |
| `tiers` | `[T0,T1,T2]` or `[T]` | rep numbers as printed, hardest-band first |
| `unit` | `"reps"` (default) \| `"steps"` \| `"seconds"` \| `"skips"` | see `_note`s |
| `perSide` | bool, default false | only where PDF prints "each side" |
| `sector` | one of 9 hex sectors (doc 05 §4) | skill-tree credit routing |
| `chain[]` | ordered **hardest→easiest** (index 0 = hardest, matches doc 03) | |
| step `n` / `ex` | display name / canonical exercise id | ids containing a doc 01 skill prefix (`planche.`, `pistol_squat.`, `hspu.`, `one_arm_pushup.`, `one_arm_pullup.`, `front_lever.`, `l_sit_manna.`, `rope_climb.`, `bridge.`, `muscle_up_*.`) are doc 01-mapped; **all other namespaces (`squat. hinge. core. pull. push. dip. power. carry. cond. qi. mob. wu.`) are NEW = flagged** (§4) |
| step `band` | 0/1/2 | §1.2 formula, materialized |
| step `load` | true when the step takes external load (omit when false); `loadOpt` = load optional | the "load channel" |
| step `sa` | true = straight-arm/long-lever elbow stress → doc 03 §12 rate limiter (1 step advance / 21 days) + tendon-block gating | |
| step `uni` | unilateral (reps are **per side**); `alt` = alternating (reps are **total**) | default rule, `PENDING-Q6` |
| step `opts[]` | slash-separated equivalents in the PDF = same difficulty, equipment choice; athlete picks one, logged by `optIndex` | |

Rest defaults (PDF specifies rest only for `full-11`): band 0 → **150 s**, band 1 → **120 s**, band 2 → **90 s**, quasi-iso/timed → 60 s, iso-overcoming per §5 [doc 03 §7; Schoenfeld 2016, https://pubmed.ncbi.nlm.nih.gov/26605807/].

## 3. The seed (authoritative JSON)

```json
{
  "schemaVersion": "protean-seed-1.0",
  "source": {"pdf": "reference_mat/Printable-Routines.pdf", "verified": "2026-08-01", "transcript": "docs/protean-routine-source.md"},
  "config": {
    "tierSemantics": "band", "bandFormula": "N==1?1:roundHalfUp(2i/(N-1))",
    "confirmSessions": 2, "landingFailPctOfTarget": 60, "chainCooldownDays": 14,
    "saStepRateLimitDays": 21, "quasiIsoMaxPerSession": 3,
    "restSecByBand": [150, 120, 90], "restSecIso": 60, "restSecTimed": 60,
    "loadIncKg": {"lower": 2.5, "upper": 1.25},
    "unilateralRepsPerSide": true, "alternatingRepsTotal": true,
    "weekOrder": ["legs", "pull", "mobility", "push", "fullbody"],
    "warmupBeforeEveryTrainingDay": true, "mobilityAsDailyBookendOptional": true
  },
  "warmup": [
    {"id": "wu-01", "n": "Body Scan Meditation", "dose": {"min": 5}},
    {"id": "wu-02", "n": "Knee Circles", "dose": {"reps": 10, "perDirection": true}},
    {"id": "wu-03", "n": "Arm Windmills (opposite directions)", "dose": {"reps": 10, "perDirection": true}},
    {"id": "wu-04", "n": "Alternating Toe Touches", "dose": {"reps": 5, "perSide": true}},
    {"id": "wu-05", "n": "High Kicks", "dose": {"reps": 5, "perSide": true, "_note": "5 straight up + 5 sideways per leg"}},
    {"id": "wu-06", "n": "Anterior / CLA Reach", "dose": {"reps": 5, "perSide": true}},
    {"id": "wu-07", "n": "Posterior Reach", "dose": {"reps": 5, "perSide": true}},
    {"id": "wu-08", "n": "Bird Dog", "dose": {"reps": 5, "perSide": true}},
    {"id": "wu-09", "n": "Deep Squat", "dose": {"reps": 5}},
    {"id": "wu-10", "n": "Balance Board", "optional": true, "dose": {"min": 2}},
    {"id": "wu-11", "n": "Reaction Ball-Wall / Juggling / Skipping", "opts": 3, "dose": {"min": 2}},
    {"id": "wu-12", "n": "Skater Hops", "ex": "squat.skater_hop", "dose": {"reps": 10, "perSide": true}},
    {"id": "wu-13", "type": "iso_overcoming", "n": "Overcoming Isometric", "sets": 4, "holdSec": 7, "angles": 3,
     "intent": "max", "minPctMVC": 70, "restRepSec": 30, "restAngleSec": 60,
     "patternByDay": {"legs": "squat", "pull": "pullup", "push": "dip_press", "fullbody": "hinge", "mobility": null},
     "anglePresetsDeg": {"squat": {"joint": "knee", "angles": [90, 115, 140]},
                          "pullup": {"joint": "elbow", "angles": [150, 110, 70]},
                          "dip_press": {"joint": "elbow", "angles": [90, 120, 150]},
                          "hinge": {"joint": "hip", "angles": [45, 90, 135]}},
     "authorConfirmed": false}
  ],
  "days": {
    "legs": [
      {"id": "legs-01", "sets": 2, "tiers": [10, 30, 50], "sector": "squat", "chain": [
        {"n": "One-Legged Jump Squat w/ Knee Thrust (alt.)", "ex": "squat.olj_knee_thrust", "band": 0, "alt": true},
        {"n": "Lunge Scissor Jump", "ex": "squat.lunge_scissor_jump", "band": 1, "alt": true},
        {"n": "Reverse Lunge", "ex": "squat.reverse_lunge", "band": 2, "alt": true}]},
      {"id": "legs-02", "sets": 2, "tiers": [15, 20, 35], "sector": "squat", "chain": [
        {"n": "Weighted Pistol Squat", "ex": "pistol_squat.weighted_pistol", "band": 0, "load": true, "uni": true},
        {"n": "Pistol Squat", "ex": "pistol_squat.pistol", "band": 1, "uni": true},
        {"n": "Weighted Lunge Walk", "ex": "squat.lunge_walk_weighted", "band": 1, "load": true, "alt": true},
        {"n": "Lunge Walk", "ex": "squat.lunge_walk", "band": 2, "alt": true}]},
      {"id": "legs-03", "sets": 2, "tiers": [10, 20, 25], "sector": "posterior", "chain": [
        {"n": "Romanian Deadlift", "ex": "hinge.rdl", "band": 0, "load": true},
        {"n": "Weighted Good Morning", "ex": "hinge.good_morning_weighted", "band": 1, "load": true},
        {"n": "Bodyweight Good Morning", "ex": "hinge.good_morning", "band": 2}]},
      {"id": "legs-04", "sets": 2, "tiers": [10, 25, 50], "sector": "squat", "chain": [
        {"n": "Goblet Jump Squat", "ex": "squat.goblet_jump_squat", "band": 0, "load": true},
        {"n": "Jump Squat", "ex": "squat.jump_squat", "band": 1},
        {"n": "Air Squat", "ex": "squat.air_squat", "band": 1},
        {"n": "Assisted Squat", "ex": "squat.assisted_squat", "band": 2}]},
      {"id": "legs-04-alt", "alternativeTo": "legs-04", "sets": 2, "tiers": [50], "sector": "posterior", "chain": [
        {"n": "Overspeed Kettlebell Swing", "ex": "hinge.kb_swing_overspeed", "band": 0, "load": true},
        {"n": "Kettlebell Swing", "ex": "hinge.kb_swing", "band": 1, "load": true},
        {"n": "Jump Squat", "ex": "squat.jump_squat", "band": 1},
        {"n": "Air Squat", "ex": "squat.air_squat", "band": 2},
        {"n": "Assisted Squat", "ex": "squat.assisted_squat", "band": 2}]},
      {"id": "legs-05", "sets": 2, "tiers": [25, 50, 100], "sector": "squat", "chain": [
        {"n": "Hindu Squat", "ex": "squat.hindu_squat", "band": 0},
        {"n": "Bunny Hop", "ex": "squat.bunny_hop", "band": 1},
        {"n": "Backward Jogging", "ex": "cond.backward_jog", "band": 1, "_note": "count steps"},
        {"n": "Backward Walking", "ex": "cond.backward_walk", "band": 2, "_note": "count steps"}]},
      {"id": "legs-06", "sets": 2, "tiers": [20, 30, 50], "sector": "squat", "chain": [
        {"n": "Weighted Cossack Squat", "ex": "squat.cossack_weighted", "band": 0, "load": true, "uni": true},
        {"n": "Weighted Side Lunge", "ex": "squat.side_lunge_weighted", "band": 1, "load": true, "uni": true},
        {"n": "Side Lunge", "ex": "squat.side_lunge", "band": 1, "uni": true},
        {"n": "Skater Hop", "ex": "squat.skater_hop", "band": 2, "alt": true}]},
      {"id": "legs-07", "sets": 2, "tiers": [20, 30, 35], "sector": "posterior", "chain": [
        {"n": "Weighted Glute Bridge", "ex": "hinge.glute_bridge_weighted", "band": 0, "load": true},
        {"n": "Unilateral Glute Bridge", "ex": "hinge.glute_bridge_unilateral", "band": 1, "uni": true},
        {"n": "Glute Bridge", "ex": "bridge.glute_bridge", "band": 2}]},
      {"id": "legs-08", "sets": 2, "tiers": [20, 30, 35], "sector": "posterior", "chain": [
        {"n": "Deficit Calf Raise", "ex": "squat.deficit_calf_raise", "band": 0, "loadOpt": true},
        {"n": "Calf Raise", "ex": "squat.calf_raise", "band": 2}]},
      {"id": "legs-09", "sets": 2, "tiers": [15, 25, 50], "sector": "core", "chain": [
        {"n": "X-Up", "ex": "core.x_up", "band": 0},
        {"n": "Bicycle Sit-Up", "ex": "core.bicycle_situp", "band": 1, "alt": true},
        {"n": "Elbow to Knee", "ex": "core.elbow_to_knee", "band": 2, "alt": true}]},
      {"id": "legs-10", "sets": 2, "tiers": [20, 30, 50], "sector": "core", "chain": [
        {"n": "L-Sit Flutter", "ex": "core.lsit_flutter", "band": 0},
        {"n": "Lying Leg Raise", "ex": "core.lying_leg_raise", "band": 1},
        {"n": "Lying Leg Flutter", "ex": "core.lying_leg_flutter", "band": 2}]},
      {"id": "legs-11", "sets": 2, "tiers": [50, 100, 150], "unit": "steps", "sector": "run_martial", "chain": [
        {"n": "Bilateral Loaded Carry", "ex": "carry.bilateral_carry", "band": 0, "load": true},
        {"n": "100-Up Major", "ex": "cond.100up_major", "band": 1, "_note": "unit reps"},
        {"n": "100-Up Minor", "ex": "cond.100up_minor", "band": 2, "_note": "unit reps"}]},
      {"id": "legs-12", "type": "quasi_iso", "sets": 1, "holdSec": 60, "sector": "squat", "chain": [
        {"n": "Quasi-Isometric Air Squat", "ex": "qi.air_squat", "band": 0},
        {"n": "Quasi-Isometric Assisted Air Squat", "ex": "qi.assisted_air_squat", "band": 2}]}
    ],
    "pull": [
      {"id": "pull-01", "sets": 2, "tiers": [15, 25, 30], "sector": "pull_levers", "_note": "unit ambiguity: 15 weighted L-sit rope-climb 'reps' likely = hand-pulls, not ascents. PENDING-Q5", "chain": [
        {"n": "Weighted L-Sit Rope Climb", "ex": "rope_climb.weighted_climb", "band": 0, "load": true},
        {"n": "L-Sit Rope Climb", "ex": "rope_climb.lsit_rope_climb", "band": 1},
        {"n": "Wall Climb", "ex": "pull.wall_climb", "band": 1},
        {"n": "Towel Pull-Up", "ex": "pull.towel_pullup", "band": 2},
        {"n": "Decline/Assisted Towel Pull-Up", "ex": "pull.towel_pullup_assisted", "band": 2}]},
      {"id": "pull-02", "sets": 2, "tiers": [20, 50, 75], "sector": "pull_levers", "chain": [
        {"n": "Weighted Decline Row", "ex": "pull.row_decline_weighted", "band": 0, "load": true},
        {"n": "Decline Row", "ex": "pull.row_decline", "band": 1},
        {"n": "Bodyweight Row", "ex": "pull.row_bodyweight", "band": 1},
        {"n": "Incline Row", "ex": "pull.row_incline", "band": 2},
        {"n": "Reverse Plank w/ Leg Raise", "ex": "core.reverse_plank_leg_raise", "band": 2}]},
      {"id": "pull-03", "sets": 2, "tiers": [15, 25, 50], "sector": "pull_levers", "chain": [
        {"n": "One-Arm BW Row w/ Rotation", "ex": "pull.one_arm_row_rotation", "band": 0, "uni": true},
        {"n": "Band Pull", "ex": "pull.band_pull", "band": 2}]},
      {"id": "pull-04", "sets": 2, "tiers": [10, 20, 30], "sector": "pull_levers", "chain": [
        {"n": "Front Lever Flutter", "ex": "front_lever.fl_flutter", "band": 0, "sa": true},
        {"n": "Tuck Front Lever Kick", "ex": "front_lever.tuck_fl_kick", "band": 1, "sa": true},
        {"n": "Bodyweight Scapula Row", "ex": "pull.scap_row", "band": 1},
        {"n": "Band Scapula Row", "ex": "pull.scap_row_band", "band": 2}]},
      {"id": "pull-05", "sets": 2, "tiers": [15, 25, 35], "sector": "pull_levers", "chain": [
        {"n": "Weighted Explosive Pull-Up", "ex": "pull.explosive_pullup_weighted", "band": 0, "load": true},
        {"n": "Weighted Pull-Up / Explosive Pull-Up", "band": 0,
         "opts": [{"n": "Weighted Pull-Up", "ex": "one_arm_pullup.wpu_25pct", "load": true},
                   {"n": "Explosive Pull-Up", "ex": "muscle_up_bar.explosive_pullup"}]},
        {"n": "Pull-Up", "ex": "one_arm_pullup.pullup10", "band": 1},
        {"n": "Kipping Pull-Up", "ex": "pull.kipping_pullup", "band": 1},
        {"n": "Pull-Up Negative", "ex": "pull.pullup_negative", "band": 2},
        {"n": "Assisted Pull-Up", "ex": "pull.pullup_assisted", "band": 2}]},
      {"id": "pull-06", "sets": 2, "tiers": [20, 30, 50], "sector": "core", "chain": [
        {"n": "Hanging Leg Raise / Weighted Hanging Frog Kick", "band": 0,
         "opts": [{"n": "Hanging Leg Raise", "ex": "core.hanging_leg_raise"},
                   {"n": "Weighted Hanging Frog Kick", "ex": "core.hanging_frog_kick_weighted", "load": true}]},
        {"n": "Hanging Frog Kick", "ex": "core.hanging_frog_kick", "band": 1},
        {"n": "Seated Leg Raise", "ex": "core.seated_leg_raise", "band": 2}]},
      {"id": "pull-07", "sets": 2, "tiers": [20, 30, 50], "sector": "pull_levers", "chain": [
        {"n": "Curl", "ex": "pull.curl", "band": 0, "load": true},
        {"n": "Hammer Curl", "ex": "pull.hammer_curl", "band": 1, "load": true},
        {"n": "Drag Curl", "ex": "pull.drag_curl", "band": 1, "load": true},
        {"n": "Cheat Curl", "ex": "pull.cheat_curl", "band": 2, "load": true}]},
      {"id": "pull-08", "type": "timed_hold", "sets": 1, "holdSec": 60, "sector": "pull_levers", "chain": [
        {"n": "Dead Hang", "ex": "pull.dead_hang", "band": 1}]},
      {"id": "pull-09", "type": "quasi_iso", "sets": 1, "holdSec": 60, "sector": "pull_levers", "chain": [
        {"n": "Quasi-Iso Pull-Up / Bodyweight Row", "band": 0,
         "opts": [{"n": "Quasi-Iso Pull-Up", "ex": "qi.pullup"}, {"n": "Quasi-Iso Bodyweight Row", "ex": "qi.row"}]},
        {"n": "Quasi-Iso Band Row", "ex": "qi.band_row", "band": 2}]}
    ],
    "push": [
      {"id": "push-01", "sets": 2, "tiers": [15, 30, 50], "sector": "dips_planche_hs", "chain": [
        {"n": "Weighted Ring Dip", "ex": "dip.ring_dip_weighted", "band": 0, "load": true},
        {"n": "Ring Dip", "ex": "dip.ring_dip", "band": 0},
        {"n": "Weighted Dip", "ex": "dip.dip_weighted", "band": 1, "load": true},
        {"n": "Dip", "ex": "dip.dip", "band": 1},
        {"n": "Assisted Dip", "ex": "dip.dip_assisted", "band": 1},
        {"n": "Tricep Dip", "ex": "dip.tricep_dip", "band": 2},
        {"n": "Assisted Tricep Dip", "ex": "dip.tricep_dip_assisted", "band": 2}]},
      {"id": "push-02", "sets": 2, "tiers": [15, 25, 50], "sector": "dips_planche_hs", "chain": [
        {"n": "Handstand Push-Up", "ex": "hspu.free_hspu", "band": 0},
        {"n": "Assisted Handstand Push-Up", "ex": "hspu.wall_hspu_full", "band": 1},
        {"n": "Decline Pike Press", "ex": "hspu.elevated_pike", "band": 1},
        {"n": "Pike Press", "ex": "hspu.pike_pushup", "band": 2},
        {"n": "Shoulder Press", "ex": "push.shoulder_press", "band": 2, "load": true}]},
      {"id": "push-03", "sets": 2, "tiers": [20], "sector": "dips_planche_hs", "_note": "PENDING-Q3: 2x20 impossible at band 0; skill-tree credit gates at doc 01 criteria (planche_pushup 3x3)", "chain": [
        {"n": "Planche Push-Up", "ex": "planche.planche_pushup", "band": 0, "sa": true},
        {"n": "Straddle Planche Push-Up", "ex": "planche.straddle_planche_pushup", "band": 0, "sa": true},
        {"n": "Tuck Planche Push-Up", "ex": "planche.tuck_planche_pushup", "band": 1, "sa": true},
        {"n": "Pseudo Planche Push-Up", "ex": "planche.pseudo_planche_pushup", "band": 1, "sa": true},
        {"n": "Knuckle Push-Up", "ex": "push.knuckle_pushup", "band": 1},
        {"n": "Knuckle Push-Up on Knees", "ex": "push.knuckle_pushup_knees", "band": 2},
        {"n": "Wall Knuckle Push-Up", "ex": "push.knuckle_pushup_wall", "band": 2}]},
      {"id": "push-04", "sets": 2, "tiers": [10, 15, 30], "sector": "core", "chain": [
        {"n": "One-Arm LaLanne Push-Up", "ex": "core.lalanne_pushup_one_arm", "band": 0, "sa": true, "uni": true},
        {"n": "LaLanne Push-Up", "ex": "core.lalanne_pushup", "band": 1, "sa": true},
        {"n": "Ab Roll-Out", "ex": "core.ab_rollout", "band": 1, "sa": true},
        {"n": "Ab Roll-Out on Knees", "ex": "core.ab_rollout_knees", "band": 2, "sa": true},
        {"n": "Walk-Out to Plank", "ex": "core.walkout_plank", "band": 2}]},
      {"id": "push-05", "sets": 2, "tiers": [30, 50, 100], "sector": "pushup", "chain": [
        {"n": "Explosive Push-Up", "ex": "push.explosive_pushup", "band": 0},
        {"n": "Push-Up", "ex": "one_arm_pushup.pushup", "band": 1},
        {"n": "Push-Up on Knees", "ex": "push.pushup_knees", "band": 1},
        {"n": "Incline Push-Up", "ex": "push.pushup_incline", "band": 2}]},
      {"id": "push-06", "sets": 2, "tiers": [15, 20, 50], "sector": "pushup", "chain": [
        {"n": "Fingertip Push-Up", "ex": "push.fingertip_pushup", "band": 0},
        {"n": "Fingertip Push-Up on Knees", "ex": "push.fingertip_pushup_knees", "band": 1},
        {"n": "Push-Up", "ex": "one_arm_pushup.pushup", "band": 1},
        {"n": "Push-Up on Knees", "ex": "push.pushup_knees", "band": 2}]},
      {"id": "push-07", "sets": 2, "tiers": [15, 25, 50], "sector": "pushup", "chain": [
        {"n": "Weighted One-Arm Push-Up", "ex": "push.oap_weighted", "band": 0, "load": true, "uni": true},
        {"n": "One-Arm Push-Up", "ex": "one_arm_pushup.oap", "band": 1, "uni": true},
        {"n": "Staggered-Stance Band Press", "ex": "push.band_press_staggered", "band": 2, "uni": true}]},
      {"id": "push-08", "sets": 2, "tiers": [20, 50, 100], "unit": "steps", "sector": "balance", "chain": [
        {"n": "Sandbag Tug Crawl / Slow Lizard Crawl", "band": 0,
         "opts": [{"n": "Sandbag Tug Crawl", "ex": "cond.sandbag_tug_crawl", "load": true},
                   {"n": "Slow Lizard Crawl", "ex": "cond.lizard_crawl_slow"}]},
        {"n": "Lizard Crawl", "ex": "cond.lizard_crawl", "band": 1},
        {"n": "Foot-Hand Crawl", "ex": "cond.foot_hand_crawl", "band": 2}]},
      {"id": "push-09", "type": "quasi_iso", "sets": 1, "holdSec": 60, "sector": "pushup", "chain": [
        {"n": "Quasi-Iso Push-Up", "ex": "qi.pushup", "band": 0},
        {"n": "Quasi-Iso Incline Push-Up", "ex": "qi.incline_pushup", "band": 1},
        {"n": "Quasi-Iso Band Press", "ex": "qi.band_press", "band": 2}]}
    ],
    "fullbody": [
      {"id": "full-01", "sets": 2, "tiers": [10, 25, 30], "sector": "squat", "chain": [
        {"n": "Cross-Body KB Clean & Press", "ex": "power.kb_clean_press_crossbody", "band": 0, "load": true, "uni": true},
        {"n": "Squat Press", "ex": "power.squat_press", "band": 1, "load": true},
        {"n": "Dumbbell Squat", "ex": "squat.dumbbell_squat", "band": 1, "load": true},
        {"n": "Assisted Squat", "ex": "squat.assisted_squat", "band": 2}]},
      {"id": "full-02", "sets": 2, "tiers": [10, 15, 30], "sector": "back_chain", "chain": [
        {"n": "Sandbag Snatch", "ex": "power.sandbag_snatch", "band": 0, "load": true},
        {"n": "Sandbag Clean", "ex": "power.sandbag_clean", "band": 1, "load": true},
        {"n": "Sandbag Bent Row", "ex": "power.sandbag_bent_row", "band": 1, "load": true},
        {"n": "Bent Dumbbell Row", "ex": "pull.bent_db_row", "band": 2, "load": true}]},
      {"id": "full-03", "sets": 2, "tiers": [10, 25, 50], "sector": "run_martial", "chain": [
        {"n": "Man Maker", "ex": "power.man_maker", "band": 0, "load": true},
        {"n": "Devil Press", "ex": "power.devil_press", "band": 1, "load": true},
        {"n": "Burpee", "ex": "cond.burpee", "band": 1},
        {"n": "Incline Push-Up", "ex": "push.pushup_incline", "band": 2}]},
      {"id": "full-04", "sets": 2, "tiers": [10, 25, 50], "sector": "balance", "chain": [
        {"n": "Bulgarian Bag Spin / Gama Cast / Halo / KB Halo", "band": 1, "load": true,
         "opts": [{"n": "Bulgarian Bag Spin", "ex": "power.bulgarian_bag_spin"}, {"n": "Gama Cast", "ex": "power.gama_cast"},
                   {"n": "Halo", "ex": "power.halo"}, {"n": "Kettlebell Halo", "ex": "power.kb_halo"}]}]},
      {"id": "full-05", "sets": 2, "tiers": [15, 20, 30], "sector": "run_martial", "chain": [
        {"n": "Dumbbell Runner", "ex": "power.db_runner", "band": 1, "load": true}]},
      {"id": "full-06", "sets": 2, "tiers": [15, 20, 30], "sector": "pull_levers", "chain": [
        {"n": "Overhand Curl", "ex": "pull.overhand_curl", "band": 1, "load": true}]},
      {"id": "full-07", "sets": 2, "tiers": [15, 25, 50], "sector": "core", "chain": [
        {"n": "Med-Ball Slam / Sledgehammer / Band Woodchopper", "band": 0, "load": true,
         "opts": [{"n": "Medicine Ball Slam", "ex": "power.medball_slam"}, {"n": "Sledgehammer", "ex": "power.sledgehammer"},
                   {"n": "Band Woodchopper", "ex": "power.band_woodchopper"}]},
        {"n": "X-Up", "ex": "core.x_up", "band": 1},
        {"n": "Knee-to-Elbow Crunch", "ex": "core.elbow_to_knee", "band": 2}]},
      {"id": "full-08", "sets": 2, "tiers": [10, 15, 20], "sector": "back_chain", "chain": [
        {"n": "Bodyweight / Band Face Pull", "band": 1,
         "opts": [{"n": "Bodyweight Face Pull", "ex": "pull.face_pull_bw"}, {"n": "Band Face Pull", "ex": "pull.face_pull_band"}]}]},
      {"id": "full-09", "sets": 1, "tiers": [50, 150, 200], "unit": "steps", "perSide": true, "sector": "run_martial", "chain": [
        {"n": "Farmers' Walk Briefcase Carry / Briefcase Carry 100-Up", "band": 1, "load": true,
         "opts": [{"n": "Farmers' Walk Briefcase Carry", "ex": "carry.briefcase_carry"},
                   {"n": "Briefcase Carry 100-Up", "ex": "carry.briefcase_100up"}]}]},
      {"id": "full-10", "sets": 1, "tiers": [50, 100, 150], "unit": "skips", "perSide": true, "sector": "run_martial", "chain": [
        {"n": "Single-Leg Skipping", "ex": "cond.single_leg_skip", "band": 0, "uni": true},
        {"n": "Skipping", "ex": "cond.skip", "band": 1},
        {"n": "Skipping (No Rope)", "ex": "cond.skip_no_rope", "band": 2}]},
      {"id": "full-11", "type": "rounds", "sets": 5, "workSec": 60, "restSec": 30, "sector": "run_martial", "chain": [
        {"n": "Bag Work / Shadow Boxing", "band": 1,
         "opts": [{"n": "Bag Work", "ex": "cond.bag_work"}, {"n": "Shadow Boxing", "ex": "cond.shadow_boxing"}]}]}
    ],
    "mobility": [
      {"id": "mob-01", "n": "Split Squat", "holdSec": 30, "perSide": true},
      {"id": "mob-02", "n": "Cossack Squat", "holdSec": 30, "perSide": true},
      {"id": "mob-03", "n": "Deep Squat", "holdSec": 30, "perSide": true},
      {"id": "mob-04", "n": "Prayer Squat (Namaskarasana)", "holdSec": 30, "_note": "PDF says 30 minute; typo-corrected"},
      {"id": "mob-05", "n": "Squatting Internal Rotation", "holdSec": 30, "perSide": true},
      {"id": "mob-06", "n": "Cobra Stretch", "holdSec": 30},
      {"id": "mob-07", "n": "Downward Dog", "holdSec": 30},
      {"id": "mob-08", "n": "Overhead Squat", "holdSec": 30},
      {"id": "mob-09", "n": "Crab Reach", "holdSec": 30, "perSide": true},
      {"id": "mob-10", "n": "Half Bridge OR Full Bridge", "holdSec": 30, "ex": "bridge.full_bridge"},
      {"id": "mob-11", "n": "Hakalau Meditation", "dose": {"min": 5}}
    ]
  }
}
```

Totals: **42 loggable slots** (12 legs + 1 alt, 9 pull, 9 push, 11 full body) + 13 warm-up + 11 mobility items; **~140 chain-step entries**, ~95 distinct exercises.

## 4. Doc 01 mapping coverage and flagged steps

**Mapped directly to doc 01 §6 lines (14 steps):** `pistol_squat.weighted_pistol/.pistol`, `rope_climb.weighted_climb/.lsit_rope_climb`, `one_arm_pullup.wpu_25pct/.pullup10`, `muscle_up_bar.explosive_pullup`, `hspu.free_hspu/.wall_hspu_full/.elevated_pike/.pike_pushup`, `planche.planche_pushup`, `one_arm_pushup.pushup/.oap`, `bridge.glute_bridge`. Ring/bar dips additionally feed `muscle_up_rings` prerequisites ("3–5 strict ring dips") though doc 01 has **no dip line** — a real gap; the `dip.*` chain in `push-01` should be promoted to a skill line in the tree.

**Flagged (no doc 01 counterpart).** Default unlock criteria for any flagged rep-based step: *hold band position by hitting `sets × repTiers[band]`* (per-side if `uni`). Exceptions that need explicit criteria:

| New id | Unlock criteria | Prerequisite |
|---|---|---|
| `planche.pseudo_planche_pushup` | 3×8, shoulders ≥10 cm past hands | `planche.lean` 3×30 s @25° |
| `planche.tuck_planche_pushup` | 3×5 | `planche.adv_tuck` 3×12 s |
| `planche.straddle_planche_pushup` | 3×3 | `planche.straddle` 3×10 s |
| `front_lever.tuck_fl_kick` | 3×10 controlled | `front_lever.tuck` 3×20 s |
| `front_lever.fl_flutter` | 3×10 small-amplitude | `front_lever.straddle` 3×10 s |
| `core.lsit_flutter` | 20 flutters without dropping legs | `l_sit_manna.l_sit` 3×20 s |
| `push.oap_weighted` | 3×5/side @ +10% BW | `one_arm_pushup.oap` 3×5/side |
| `pull.towel_pullup` | 2×8 | 5 strict pull-ups + 30 s towel hang |
| `pull.wall_climb` | 2 clean ascents | ambiguous in PDF — PENDING-Q5 |
| `dip.ring_dip` | 3×8 with turned-out lockout | `dip.dip` 3×12 |
| `hinge.glute_bridge_weighted` | band target @ +25% BW | `bridge.glute_bridge` 3×15 |
| `power.sandbag_snatch` | technique-gated; credits `power_stunts.bw_snatch` when session load ≥0.5×BW | coached form |

All `sa:true` steps (11: 4 planche-chain, 2 front-lever, 4 LaLanne/roll-out, plus `core.lsit_flutter` borderline-false) trigger doc 03 §12's straight-arm guard: ≤1 chain-step advance per 21 days and tendon-block gating.

## 5. Isometric protocols (author question c — seeded defaults)

The PDF prescribes only "4 x 7 seconds at 3 joint angles" (warm-up, daily) and "1 Minute" quasi-iso finishers; **no angles are specified anywhere**. Seed defaults (in `wu-13.anglePresetsDeg`) follow angle-specificity evidence — transfer window ±15–30°, so 3 angles spaced 25–40° apart cover the ROM; bias long muscle length + sticking point [Oranchuk et al., 2019, https://pubmed.ncbi.nlm.nih.gov/30580468/] `[A]`:

| Day pattern | Joint | Angles (180° = straight) | Rationale |
|---|---|---|---|
| Legs → squat | knee | 90 / 115 / 140° | deep (long length) / sticking / quarter |
| Pull → pull-up | elbow | 150 / 110 / 70° | near-dead-hang (long) / sticking / top |
| Push → dip-press | elbow | 90 / 120 / 150° | bottom (long) / sticking / near-lockout |
| Full body → hinge | hip flexion | 45 / 90 / 135° | mid-thigh / knee / floor pull positions |

Execution: max intent ramped 2–3 s, ≥70% MVC for tendon adaptation, rest 30 s between reps / 60 s between angles in warm-up context (doc 03 §11's 60/90 s applies when run as a main-session block; both knobs are in config). Quasi-iso: 1×60 s at ~50–70% effort, long muscle length, log seconds achieved on early failure (doc 05 §1); hard cap `quasiIsoMaxPerSession: 3` (doc 03 §14.5). Dead hang (`pull-08`): passive 60 s, `sa:false`.

## 6. Duplicate exercises across days (author question b)

The PDF never schedules the same *slot* twice; duplicates are the same *exercise* appearing in different slots' chains. Seed policy (`authorConfirmed:false`): **slots are independent state machines; exercise identity is shared** for volume accounting (fractional sets, doc 03 §3) and skill-tree credit. No cross-day exclusions. Deduplicated ids:

| Exercise id | Appears in |
|---|---|
| `squat.skater_hop` | wu-12 (dose), legs-06 band 2 |
| `core.x_up` | legs-09 band 0, full-07 band 1 |
| `core.elbow_to_knee` | legs-09 band 2, full-07 band 2 ("Knee-to-Elbow Crunch" = same movement, canonicalized) |
| `squat.assisted_squat` / `squat.air_squat` / `squat.jump_squat` | legs-04, legs-04-alt, full-01, qi variants |
| `push.pushup_incline` | push-05 band 2, full-03 band 2 |
| `one_arm_pushup.pushup` / `push.pushup_knees` | push-05 and push-06 (different bands!) |
| `cond.100up_major/minor` | legs-11, full-09 option |
| `pull.row_bodyweight` | pull-02 band 1, pull-09 quasi-iso option |

Note the band conflict: Push-Up is band 1 in both push-05 (target 50) and push-06 (target 25). This is correct under §1.2 — the target belongs to the **slot**, not the exercise. Analytics comparing "push-up performance" must group by `(exerciseId)` but never merge slot targets.

## 7. Open author questions recorded in the seed (`authorConfirmed:false` items)

| # | Question | Seed default (ships as-is until answered) |
|---|---|---|
| Q1 | Tier semantics: bands-by-difficulty (B) confirmed? | Yes per source-doc header; §1.2 band model |
| Q2 | Week ordering / rest days? | `legs, pull, mobility, push, fullbody` per doc 03 §14; warm-up daily, mobility bookend |
| Q3 | `push-03` "2 × 20" at planche level — aspirational or per-band? | Treat 20 as band-1/2 target; band-0 gated by doc 01 criteria (§1.4) |
| Q4 | Overcoming-iso: which exercise + which 3 angles? | Day-pattern presets, §5 table |
| Q5 | Units: rope-climb "reps" (pulls vs ascents), crawl distance, wall climb meaning | pulls; steps; wall-bar ascent |
| Q6 | Unilateral reps per side, alternating total? | Yes / yes (config flags) |
| Q7 | Same-exercise-two-days policy | Independent slots, shared volume ids (§6) |
| Q8 | legs-04 vs legs-04-alt: choose per session or per block? | Per mesocycle block, user-switchable |

**Engineering bottom line:** the seed JSON in §3 is complete and directly loadable — every one of the 42 slots has sets, tiers, materialized per-step bands, load channels, straight-arm flags, units, sector routing, and iso parameters; doc 03's engine runs on it after the one-line `workTarget = repTiers[band]` indirection; the 8 open questions all have shipping defaults and a first-run confirmation screen can burn down the `authorConfirmed:false` list.
