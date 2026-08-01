# 06 — Addendum 1: Skill-Tree Content for the Three Missing Hex Sectors

**Purpose:** fills the reviewer-identified gap — doc 01 contains no progression chains for (1) the **Balance–Acrobatics** sector (flips, rolls, cartwheel line), (2) a **ring-strength** line beyond the muscle-up (support → dips → iron cross → maltese), or (3) the **Locomotion** sector (running/swimming milestone ladders). This doc supplies those nodes/edges/gates in the exact machine-readable format of doc 01 §6 so the engineer can author the remaining ~third of the tree.
**Date compiled:** 2026-08-01. **Companion docs:** 01 (§0 conventions, §3 skill lines, §6 table format), 03 (§9 concurrent-training rules, §10 skill-work spec, §12 TendonBlock), 04 (§3.6 vertical-jump norms), 05 (§4 hex-map spec, §7.1 sector colors).

---

## 0. Conventions — inherited plus three new node flags

Evidence tiers A–D and units (`hold_s`, `sets`, `reps`, `+%BW`) are exactly as doc 01 §0. Everything airborne-acrobatic below is tier **C** (coaching consensus) or **D** (single coach's rep counts); there are no RCTs on tumbling progressions. New flags the schema needs:

| Flag | Meaning | Enforcement |
|---|---|---|
| `NO_AUTO_UNLOCK` | App criteria alone can **never** unlock this node. Advancing requires a user attestation checkbox: "performed with a qualified coach/spotter on an appropriate surface." | Hard. Every airborne salto node (back tuck, front tuck, aerial, back handspring) carries it. Every coaching source surveyed — gymnastics, cheer, parkour — independently states coach supervision is mandatory for first attempts [TumblingCoach, 2024, https://tumblingcoach.com/blog/standing-backtuck-guide/; GymnasticsHQ, 2024, https://gymnasticshq.com/how-to-do-a-front-tuck/; CityLegends, 2024, https://www.citylegends.io/blog/how-to-backflip] (tier C, unanimous) |
| `SURFACE:x` | Minimum surface for the step: `pit` > `resi` (8 in/20 cm mat) > `tumbltrak` (trampoline/tumble-track) > `spring_floor` > `firm_mat`. **Never** concrete, hardwood, tile, or unchecked grass [CityLegends, 2024, https://www.citylegends.io/blog/how-to-backflip] (tier C) | Display + attestation; app cannot sense surface |
| `TENDON_GATE_12WK` | Node locked until a 12-week TendonBlock (doc 03 §12) is logged complete | Hard; applies to band-cross entry and all maltese-specific work |

**Sector mapping (doc 05 §4/§7.1):** §1 below → Balance–Acrobatics sector (`#7F4BB1`); §2 → nodes inside the dips/planche and pull/lever sectors (ring sub-branch); §3 → Locomotion sector (`#D1649C`).

---

## 1. Acrobatics — Balance–Acrobatics sector

### 1.1 Sector-wide hard gates (encode once, reference from every salto node)

| Gate | Value | Source / tier |
|---|---|---|
| **G-JUMP** vertical jump (CMJ, arm swing) | ≥ **0.25 × height** (recommended 0.33×) → ≈45–50 cm for a 175–185 cm ♂, ≈40–45 cm for a 160–170 cm ♀. Practical floor constant: `cmj_min_cm = max(0.25 * height_cm, 40)` | coaches' rule of thumb for a standing back tuck [CrossFit Discussion Board, 2009, https://board.crossfit.com/archive/index.php/t-48269.html] (tier D); calibrate against doc 04 §3.6 norms (M 20–29 "good" = 48–53 cm) — the gate sits at "good," not "excellent" |
| **G-TUCKJUMP** proxy when no jump-mat | tuck jump with knees above waist height, 10 clean reps landing quietly | [Position Is Everything, 2024, https://www.positioniseverything.net/how-to-do-a-backflip-15-steps/] (tier C) |
| **G-HOLLOW** trunk gate | hollow-body hold 30 s (doc 01 §3.4 step 1 — reuse that node) | tier C |
| **G-ROLL** orientation gate | 5 consecutive clean backward rolls (back line) / forward rolls (front line) | [GMB, n.d., https://gmb.io/tumbling/] (tier C) |
| **G-POWER** scheduling guard | salto practice sessions must be ≥24 h from hard endurance and placed first in session (doc 03 §9 rule: explosive output drops ~28% under concurrent fatigue; §10: skill before strength) | tier A for the interference number |

### 1.2 Roll line (sector hub — everything branches from here)

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Forward roll (tucked, chin to chest) | 5 consecutive, stand up without hands | head contact ~zero; roll on shoulders/upper back [GMB, n.d., https://gmb.io/tumbling/; Elevate Gymnastics, 2024, https://elevategymnasticsut.com/how-to-do-a-forward-roll-a-beginners-guide-for-gymnasts/] |
| 2 | Backward shoulder roll | 5 consecutive, no neck loading (chin tucked, roll over one shoulder) | [GMB, n.d., https://gmb.io/tumbling/] |
| 3 | Backward roll (symmetric, hands push) | 5 consecutive to feet | [NRG Gymnastics teaching progressions, 2018, https://www.nrgq.co.uk/wp-content/uploads/2018/12/Foundation_Teaching-Progressions-BACKWARD-ROLL.pdf] |
| 4 | Roll combinations (fwd→back→fwd) | 3 × 4-roll sequences without pausing | orientation/vestibular capacity [GMB] |
| 5 | Dive roll (safety roll over low obstacle) | 5 clean over knee-height obstacle, silent hands | direct front-flip prep [GymnasticsHQ, 2024, https://gymnasticshq.com/how-to-do-a-front-tuck/] |
| 6 | Back extension roll (roll to handstand snap) | 3 × 3 | optional; feeds back-handspring line [ATA Gymnastics, https://www.atagymnastics.com/blog/tumbling-progressions-pt2-from-backward-roll-to-back-tuck] |

All tier C. Prerequisite: none (this is the sector's easiest hub). Est. months: 1–3 untrained.

### 1.3 Cartwheel → roundoff → aerial line

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Cartwheel (lunge entry, both sides) | 5 clean per side, legs straight, lands in lunge | needle-kick quality drives everything downstream [TumblingCoach, https://tumblingcoach.com/blog/round-off/] |
| 2 | Power/dive cartwheel (reach far, hands late) | 5 per dominant side with visible flight to hands | trains the aerial trajectory [GymnasticsHQ, https://gymnasticshq.com/how-to-do-an-aerial-cartwheel/] |
| 3 | One-handed cartwheel (near-hand, then far-hand) | 3 × 3 each variant | forces leg-drive/hip-snap [Flipz Academy, 2024, https://www.flipz.au/2024/07/20/how-to-master-gymnastics-cartwheel-from-basic-drills-to-advanced-techniques/] |
| 4 | Roundoff (snap-down to two-foot rebound) | 5 with immediate vertical rebound jump; handstand snap-down drill 3 × 5 | gateway to all power tumbling [TumblingCoach, https://tumblingcoach.com/blog/round-off/; Synergy Gymnastics, https://www.synergygymnastics.co.uk/how-to-do-a-round-off/] |
| 5 | Aerial (side aerial, no hands) — `NO_AUTO_UNLOCK`, `SURFACE:resi` | first: 1 clean spotted/soft; owned at 3 per side on firm mat | prereq adds: 60 s side plank per side, cartwheel "without conscious thought" [GymnasticsHQ, https://gymnasticshq.com/how-to-do-an-aerial-cartwheel/; ExplainThat, https://explainthat.org/how-to-do-an-aerial-step-by-step-technique-drills/] |

Tier C. Prerequisite: roll line step 1. Est. months: cartwheel 1–2; roundoff 2–4; aerial 6–18.

### 1.4 Back flip (standing back tuck) line

**Prerequisites (all must hold):** G-JUMP, G-TUCKJUMP, G-HOLLOW, G-ROLL(back), and ideally roundoff (step 1.3-4). Cheer/gymnastics tradition wants roundoff-back-tuck before standing tuck [TumblingCoach, https://tumblingcoach.com/blog/standing-backtuck-guide/]; for adult parkour-style learners the pit/trampoline route below substitutes (tier C).

| # | Step | Unlock criteria (rep counts are one coach's published program — tier D) | Flags |
|---|---|---|---|
| 1 | Set drills: "eagle" arm-swing → straight jump | 15 clean reps, full-height jump, arms finish by ears | — |
| 2 | Eagle → tucked candlestick (jump back onto flat mat stack, roll to candlestick) | 30 reps | `SURFACE:firm_mat` |
| 3 | Eagle → dead-bug jump-back onto elevated soft mat | 30 reps | `SURFACE:resi` |
| 4 | Rebound back tuck on trampoline/tumble-track | 50 reps unspotted after 10 spotted | `SURFACE:tumbltrak`, `NO_AUTO_UNLOCK` (first spotted reps) |
| 5 | Standing back tuck from raised surface into pit/soft | 30 reps | `SURFACE:pit` |
| 6 | Standing back tuck into leveled pit / on resi | 50 reps | `SURFACE:pit` |
| 7 | Standing back tuck on floor **with spot** | 15 reps | `NO_AUTO_UNLOCK` |
| 8 | Standing back tuck, floor, unspotted | 3 consecutive, landed on feet, no hand-down | `NO_AUTO_UNLOCK` |

[TumblingCoach, 2024, https://tumblingcoach.com/blog/standing-backtuck-guide/] (step order tier C — converges with parkour sources [Berg Movement, https://www.bergmovement.com/calisthenics-blog/how-to-backflip; LiveAbout, https://www.liveabout.com/gymnastics-back-flip-1715056]; exact rep counts tier D).

**Timeline:** 2–6 months for an adult with no acro background training 2×/week in a facility; 1–3 weeks with prior gymnastics/diving/tricking background [HowLongFor, 2024, https://howlongfor.com/general/learn-to-do-a-backflip] (tier C). Common errors to surface in-app: grabbing hamstrings instead of shins, throwing the head back, dropping arms mid-rotation [TumblingCoach].

### 1.5 Back handspring line (parallel branch; optional feeder for tumbling passes)

**Prerequisites:** 60 s straight-body wall handstand (**reuse doc 01 handstand node `wall_60s`**); bridge with shoulders stacked over hands 10–20 s (**reuse doc 01 bridge node `full_bridge`**) [GymnasticsHQ, 2024, https://gymnasticshq.com/backhandspring/] (tier C).

| # | Step | Unlock criteria | Flags |
|---|---|---|---|
| 1 | Jump-back drill (sit-to-jump-back onto stacked soft) | 3 × 10 | `SURFACE:resi` |
| 2 | Bridge pop-rocks + bridge kickover | 3 × 5 kickovers | — |
| 3 | Handstand snap-down | 3 × 8 with rebound | — |
| 4 | Back handspring over barrel/on tumble-track, spotted | 10 spotted, then 10 unspotted on soft | `SURFACE:tumbltrak`, `NO_AUTO_UNLOCK` |
| 5 | Back handspring, floor | 3 consecutive, straight arms | `NO_AUTO_UNLOCK` |

[GymnasticsHQ, https://gymnasticshq.com/backhandspring/; ChalkBucket coaching threads, https://chalkbucket.com/threads/round-off-and-handspring-progressions.15131/] (tier C). Est. months: 3–9 with coaching.

### 1.6 Front flip (front tuck) line

Note for UX copy: the front tuck lands **blind** — it is usually attempted earlier than back tuck (less fear) but landed cleanly later (tier C).

| # | Step | Unlock criteria | Flags |
|---|---|---|---|
| 1 | Tuck jump + medicine-ball punch drills | 10 tuck jumps knees-above-waist; punch = stiff ankle bounce | — |
| 2 | Dive roll over trapezoid/elevated block | 5 clean, silent hands | `SURFACE:firm_mat` |
| 3 | Trampoline front tuck | 10 clean to feet | `SURFACE:tumbltrak` |
| 4 | Punch front tuck **onto** elevated resi, finishing seated | 10 reps — the seated finish proves upward set, not forward throw | `SURFACE:resi` |
| 5 | Punch front into foam pit | 10 to feet | `SURFACE:pit` |
| 6 | Punch front onto 8-inch (20 cm) mat with spot | 10 reps | `NO_AUTO_UNLOCK` |
| 7 | Standing/punch front tuck, floor | 3 consecutive to feet | `NO_AUTO_UNLOCK` |

[GymnasticsHQ, 2024, https://gymnasticshq.com/how-to-do-a-front-tuck/; TumblingCoach, https://tumblingcoach.com/blog/front-tuck-guide/2/; GymDrills4Profs, http://www.gymdrills4profs.com/gymnastics-events/skill-drills-floor/gymnastics-floor-front-flip.php] (tier C; step 4's elevated-mat seated-finish drill is standard coaching practice). Prereqs: G-JUMP, G-HOLLOW, roll line step 5. Est. months: 2–6 with facility access.

---

## 2. Ring strength — iron cross and maltese branch

### 2.1 Entry chain: ring support → RTO → ring dips (the missing rungs below the existing ring muscle-up node)

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Ring support hold (rings neutral) | 3 × 30 s, culminating **60 s single hold** before any dip/lever work on rings | "minimum 60-second hold before moving on" [Antranik, n.d., https://antranik.org/support-hold/] (tier C) |
| 2 | RTO support hold (rings turned out ~45°) | 3 × 20–30 s, elbow pits forward | external-rotation base for all cross work [Antranik; Low, *Overcoming Gravity* 2nd ed. charts, https://www.calisthenics-101.co.uk/wp-content/uploads/2020/05/Overcoming-Gravity-2nd-Edition-Exercise-Charts.pdf] (tier C) |
| 3 | Ring dips | 3 × 8 full ROM (shoulder below elbow) | prereq for existing ring-MU node (doc 01 §3.5) — draw the edge |
| 4 | RTO dips (turned out at bottom+top) | 3 × 8; Low's cross-prep spec is dips with rings turned out to **75°** | [Low, 2011, https://stevenlow.org/ironcross/] (tier C) |
| 5 | Weighted ring dips | 3 × 5 @ +20–30% BW | strength headroom for cross pullouts (tier C) |

Est. months: 3–9 from first ring session.

### 2.2 Iron cross line

**Prerequisites (Low's published list — tier C):** full **supinated back lever** (**edge from doc 01 back-lever node `full`**); half-lay/one-leg front lever; rings advanced-tuck planche; RTO-75° dips; strap-assisted ring HSPU; ~8–10 strict pull-ups; "good conditioning of the elbows and shoulders." Timeline quoted for a light athlete (≤68 kg / 150 lb): **12–36 months** from prerequisites met; heavier athletes materially longer [Low, 2011, https://stevenlow.org/ironcross/, also at https://www.performancemenu.com/article/403/Developing-the-Iron-Cross/] (tier C).

**Gate:** `TENDON_GATE_12WK` before step 3 below — doc 03 §12 names iron cross explicitly as a TendonBlock trigger; the 12-week clock is anchored on tendon-adaptation timelines (tier B). Also inherit doc 01 §2.1's rule: max 1 step per 3 weeks, +10–15%/week TUT cap.

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Ring flies ladder (standing → on knees → full) | 3 × 8 at each rung | scapular/pec prep [Low] |
| 2 | Box/block-assisted cross pullouts, high box → low box | 5 × 5 at each height | feet/shins take load; lower the box to raise %BW [Low; The Bodyweight Tribe, https://www.thebodyweighttribe.com/blog/IronCrossBreakdown] |
| 3 | Theraband / dream-machine (pulley) cross pullouts — **`TENDON_GATE_12WK` here** | Phase I: 3×5 → 4×5 → 5×5 → 5×6 → 5×7 → 5×8, 3 d/wk, 3–5 min rest; slow eccentric, fast concentric; deload week every 5–6 weeks | best-ranked assistance methods: spotter/counterweight pulley > weighted-band or dream-machine pullouts > block+weight > band pulls [Low] (tier C). Commercial pulley systems offer 8–15 graded assistance levels [Gravity Force Training, https://gravityforcetraining.com/collections/all/products/bundle-rings-master-iron-cross-machine-ring-dream-machine] |
| 4 | Heavy pullouts ≥90% BW | 5 × 5 at assistance ≤10% BW | the published switch point to isometric work [Bodyweight Tribe, https://www.thebodyweighttribe.com/blog/IronCrossBreakdown] (tier C) |
| 5 | Cross isometric holds (minimal band) | 5 × 3–5 s at ≤5% assistance; Phase III volume: 10–12 → 15–18 → 21–25 total reps/session, 5 d/wk | [Low] Phase III; "cross within a few months at most" once here (tier C) |
| 6 | **Iron cross** | 1 × 3 s clean → owned at 3 × 5 s, elbows locked, rings still | elbows MUST stay locked at all times — the #1 published fault [Low] |

**Non-negotiable coaching constants to encode:** elbows locked on every rep of every step; persistent (not transient) elbow/shoulder pain ⇒ auto-regress one step and offer the TendonBlock; some elbow grumpiness is expected even with perfect technique [Low] (tier C).

### 2.3 Maltese line

**Prerequisites (converged across 3 sources — tier C):** straddle planche (**edge from doc 01 planche node `straddle`**); strong/supinated full back lever; iron cross achieved or ≥90% pullouts (many systems treat the cross as non-negotiable before maltese [GymnastGem, https://gymnastgem.com/iron-cross-maltese/]); 15+ ring dips; 60 s ring support; adv-tuck planche 20 s; mobility: 45° shoulder extension, 90° external rotation, 90° wrist extension [Calisthenics 101, https://www.calisthenics-101.co.uk/maltese-calisthenics] (tier C). Difficulty ≈ **2–3× the iron cross** in leverage terms [GymnastGem, https://gymnastgem.com/iron-cross-maltese/] (tier C/D).

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Maltese lean (parallettes/rings, feet supported) | 4 × 10–15 s | [Calisthenics 101] |
| 2 | Band-assisted / dream-machine maltese — `TENDON_GATE_12WK` | 5–6 × 5–8 s, reduce assistance stepwise | 2–3 d/wk max; ≥48 h between sessions [Calisthenics 101] |
| 3 | Negative maltese (from support, controlled descent) | 4–5 × 3–5 controlled negatives | |
| 4 | Straddle maltese | 3 × 5 s | |
| 5 | **Full maltese** | first 1–2 s; owned at 3 × 5 s | "a clean 5 s beats a shaky 10 s" [Calisthenics 101] |

**Timeline:** 2–5 years of specific work *after* prerequisites [Calisthenics 101; GymnastGem, https://gymnastgem.com/maltese-tutorial/] (tier C). Deload every 4–6 weeks (−40–50% volume); rotator-cuff work 2–3×/wk alongside (tier C).

### 2.4 k-coefficients for ring statics (extends doc 01 §1.4 model — all tier D)

Cross torque acts in shoulder **adduction** with the moment arm = full arm length, so per-arm torque `τ_arm = 0.5 × BW × g × L_arm` — i.e., **k_effective ≈ 1.0 on the arm lever** (vs planche's 0.87 on the trunk lever, but through a far weaker adduction line). Seed values for the comparison engine: `iron_cross k=1.00 (arm-lever basis)`, `maltese k≈2.2 (arm+trunk combined, midpoint of the 2–3× practitioner ratio)`. Mark tier D, never gate on them.

---

## 3. Locomotion sector — running and swimming milestone ladders

### 3.1 Run distance ladder (completion milestones — the sector's spine)

| # | Node | Unlock criteria | Prereq / build rule | Est. months (from sedentary) |
|---|---|---|---|---|
| 1 | Run 1.6 km (1 mi) continuous | 1 completion, conversational pace | — | 0–1 |
| 2 | Run 5 km continuous | 1 completion | C25K-style: 9 weeks × 3 sessions/wk walk-run to 30 min continuous (tier C, canonical program) | 2–3 |
| 3 | Run 10 km | 1 completion | ≥3 runs/wk for 6+ weeks post-5K; weekly volume increase ≤10% (practitioner rule; injury-prevention evidence weak — tier C) | 4–6 |
| 4 | Half marathon (21.1 km) | 1 finish | long run ≥15 km logged; 10–12 wk block | 8–12 |
| 5 | Marathon (42.2 km) | 1 finish | half done; 16–18 wk block; long run ≥28–30 km | 14–24 |

Scheduling constraint from doc 03 §9: run sessions ≥24 h from Legs day; accept the documented power cost if marathon is an active goal (tier A).

### 3.2 Sex-specific run finish-time tiers (RunRepeat global race dataset, n≈107.9M results — tier B)

Percentiles = "top X% of race finishers." Encode as `run_tiers[distance][sex] = {T1_finisher, T2_median, T3_top30, T4_top10, T5_top1}` [RunRepeat percentile calculator, 2019/updated, https://runrepeat.com/how-do-you-masure-up-the-runners-percentile-calculator; dataset described at https://runrepeat.com/state-of-running]:

| Distance | Tier | ♂ | ♀ |
|---|---|---|---|
| 5K | T2 median | 31:28 | 37:28 |
| 5K | T3 top 30% | 27:58 | 33:19 |
| 5K | T4 top 10% | 23:26 | 28:24 |
| 5K | T5 top 1% | 17:30 | 21:39 |
| 10K | T2 median | 57:15 | 1:06:54 |
| 10K | T3 top 30% | 52:28 | 1:01:02 |
| 10K | T4 top 10% | 45:11 | 53:35 |
| 10K | T5 top 1% | 34:24 | 41:12 |
| Half | T2 median | 1:59:48 | 2:24:03 |
| Half | T3 top 30% | 1:55:03 | 2:12:25 |
| Half | T4 top 10% | 1:40:35 | 1:57:01 |
| Half | T5 top 1% | 1:18:37 | 1:35:55 |
| Marathon | T2 median | 4:14:29 | 4:42:09 |
| Marathon | T3 top 30% | 3:53:07 | 4:20:24 |
| Marathon | T4 top 10% | 3:22:40 | 3:49:22 |
| Marathon | T5 top 1% | 2:44:18 | 3:11:35 |

Caveats to display: finishers-only (survivor bias — slower than the general public would produce, faster than "anyone who signed up"); race-day data, mostly 2016–2019 vintage; no age split in this table — use §3.3 for age fairness.

### 3.3 Age-graded scoring (WMA) — the cross-age/cross-sex comparison layer

`AG% = 100 × WMA_standard_time(age, sex, distance) / athlete_time`. Store the WMA factor tables (2023 edition is current; available via any of the calculators below) and band the result [Marathon Handbook, 2025, https://marathonhandbook.com/age-grade-calculator/; RunBikeCalc, https://www.runbikecalc.com/age-graded-calculator; runbundle, https://runbundle.com/tools/age-grading-calculator] (tier B — the factors are official WMA; the band labels are convention):

| AG% | Band label |
|---|---|
| <60% | Recreational |
| 60–69% | Local class |
| 70–79% | Regional class |
| 80–89% | National class |
| ≥90% | World class |

This one formula solves the app's two-athlete fairness problem for the whole locomotion sector: a 34-year-old woman's 5K and a 29-year-old man's 10K land on one comparable 0–100 axis. Recommend AG% as the sector's radar-chart input (doc 05 §3.3) rather than raw times.

### 3.4 Swim ladder

Distance milestones (tier C — assembled from triathlon norms and masters-swim practice; science is thin here and the population is self-selected):

| # | Node | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Water competence | 100 m continuous, any stroke, rested at neither wall | baseline; below this, gate all swim nodes behind lessons (drowning risk — display, don't gamify) |
| 2 | 400 m continuous freestyle | 1 completion, no wall rests | the standard "can actually swim" threshold |
| 3 | 750 m (sprint-tri distance) | 1 completion; time tiers: beginner 14–20 min | [Chase the Water, https://chasethewater.com/what-is-a-good-triathlon-beginner-swim-time-data-included/; MyMottiv, https://www.mymottiv.com/triathlon-swimming/sprint-triathlon-swim-distance] (tier C) |
| 4 | 1000 m continuous | 1 completion | |
| 5 | 1500 m / "the mile" (Olympic-tri distance) | 1 completion; beginner 30–40 min, advanced 20–25 min | [T100 Triathlon, https://t100triathlon.com/articles/triathlon/average-triathlon-times-for-beginners/] (tier C); masters "mile" = 1500 m/1650 y [USMS forum, https://community.usms.org/swimming/f/general/13072/beginner-swimmer---looking-to-improve-1500-m-time] |
| 6 | 2 km continuous | 1 completion | endurance-swimmer tier |
| 7 | 3.8 km (Ironman distance) | 1 completion any venue | elite-endurance capstone |

Pace tiers per 100 m freestyle (encode as `swim_pace_tiers`, tier C — practitioner benchmarks, not sex-split; apply ♀ ≈ +7–10% to thresholds if a split is needed, mirroring elite gaps):

| Tier | Pace /100 m |
|---|---|
| Beginner | 2:30–3:30 |
| Recreational | 1:45–2:15 |
| Club/competitive | 1:15–1:40 |
| Elite | <1:05 |

[SwimmingLevel, https://swimminglevel.com/; Fitness Health, https://fitnesshealth.co/blogs/strength-fitness/average-100m-freestyle-time-what-39-s-a-good-swim-pace-by-age-amp-gender; dincalculator, https://www.dincalculator.com/swim/pace] (tier C). Expectation constant for UX: breaking 2:00/100 m sustainably takes ≈6–12 months at 2–3 swims/wk from beginner (tier C).

---

## 4. Machine-readable summary table (doc 01 §6 format)

`skill | steps (easiest→hardest) | unlock criteria per step | prerequisite | est. months (untrained → trained)`

| skill | steps | unlock criteria per step | prerequisite | est. months |
|---|---|---|---|---|
| rolls | fwd_roll; back_shoulder_roll; back_roll; roll_combos; dive_roll; back_extension_roll | 5 clean; 5; 5; 3×4-seq; 5 over obstacle; 3×3 | none (sector hub) | 1–3 → <1 |
| cartwheel_line | cartwheel; power_cartwheel; one_hand_cartwheel; roundoff; aerial | 5/side; 5; 3×3 each; 5 w/ rebound + snapdown 3×8; 1 spotted → 3/side | fwd_roll; aerial adds 60s side plank | 6–18 → 3–9 |
| back_handspring | jump_back; bridge_kickover; hs_snapdown; bhs_spotted_soft; bhs_floor | 3×10; 3×5; 3×8; 10+10; 3 consecutive | handstand.wall_60s + bridge.full_bridge; NO_AUTO_UNLOCK steps 4–5 | 3–9 (coached) |
| backflip | set_drills; candlestick_jumpback; elevated_jumpback; tramp_backtuck; raised_to_pit; pit_backtuck; floor_spotted; standing_backtuck | 15; 30; 30; 10 spotted+50; 30; 50; 15; 3 consecutive | G-JUMP (CMJ ≥0.25×ht, floor 40cm) + G-TUCKJUMP + hollow 30s + 5 back rolls; NO_AUTO_UNLOCK 4/7/8 | 2–6 (coached) → 0.5–1 |
| frontflip | tuck_jump_punch; dive_roll_block; tramp_fronttuck; punch_to_elevated_resi_seated; punch_into_pit; resi_8in_spotted; floor_fronttuck | 10; 5; 10; 10; 10; 10; 3 consecutive | G-JUMP + hollow 30s + dive_roll; NO_AUTO_UNLOCK 6–7 | 2–6 (coached) |
| ring_base | support_60s; rto_support; ring_dips; rto75_dips; weighted_ring_dips | 60s single; 3×20-30s; 3×8; 3×8; 3×5 @+20-30%BW | none; feeds muscle_up_rings + iron_cross | 3–9 → 2–4 |
| iron_cross | ring_flies; box_cross_pullouts; band_or_dreammachine_pullouts; pullouts_90pctBW; cross_iso_holds; iron_cross | 3×8/rung; 5×5/height; 3×5→5×8 (3d/wk); 5×5 @≤10% assist; 5×3-5s; 3×5s locked elbows | back_lever.full (supinated) + rings adv-tuck planche + rto75_dips + 8-10 pullups; TENDON_GATE_12WK at step 3; ≤1 step/3wk | 12–36 from prereqs |
| maltese | maltese_lean; band_maltese; negative_maltese; straddle_maltese; full_maltese | 4×10-15s; 5-6×5-8s; 4-5×3-5; 3×5s; 1-2s → 3×5s | planche.straddle + iron_cross (or ≥90% pullouts) + 15 ring dips + 45° shld-ext/90° ER/90° wrist-ext; TENDON_GATE_12WK at step 2 | 24–60 from prereqs |
| run_distance | mile; 5k; 10k; half; marathon | 1 completion each; build ≤+10%/wk; half needs 15km long run; marathon needs half + 16-18wk block + 28-30km long run | ≥24h from Legs day (doc 03 §9) | 5k: 2-3; marathon: 14-24 |
| run_speed | T2_median; T3_top30; T4_top10; T5_top1 | sex-specific times per §3.2 table (e.g. 5K ♂ 31:28/27:58/23:26/17:30; ♀ 37:28/33:19/28:24/21:39) | matching run_distance node | open-ended |
| run_age_graded | recreational; local; regional; national; world | AG% <60; 60-69; 70-79; 80-89; ≥90 | any logged race time + WMA factor table | open-ended |
| swim | competence_100m; 400m; 750m; 1000m; 1500m_mile; 2km; 3800m | continuous completion each; pace tiers 2:30-3:30 / 1:45-2:15 / 1:15-1:40 / <1:05 per 100m | none; <100m ⇒ recommend lessons, do not gamify | 400m: 1-3; mile: 6-12 |

### 4.1 Safety-flag assignments (separate table so the 5-column schema above stays clean)

| Node(s) | Flags |
|---|---|
| backflip 4,7,8; frontflip 6,7; aerial 5; bhs 4,5 | `NO_AUTO_UNLOCK` (+`SURFACE` per §1 tables) |
| iron_cross 3+; maltese 2+ | `TENDON_GATE_12WK`, max 1 step/3 wk, +10–15%/wk TUT cap (doc 01 §2.1, doc 03 §12) |
| swim, all nodes | never award streak/pressure mechanics; open-water attempts flagged "with lifeguard/buddy only" |

---

## 5. Where this addendum must be honest

1. **Acrobatics rep counts (§1.4) are one coach's published program** (tier D inside a tier-C consensus structure). The *ordering* converges across gymnastics, cheer, and parkour sources; the numbers 15/30/50 do not. Make them editable defaults.
2. **The app cannot verify a spotter, a foam pit, or a coach.** `NO_AUTO_UNLOCK` + attestation is the ceiling of what software can responsibly do; the UI copy should say plainly that no app criterion makes a first backflip safe.
3. **Ring-strength content rests heavily on the Steven Low / Overcoming Gravity lineage** — the richest and most internally consistent source, but a single lineage (tier C). No peer-reviewed literature addresses cross/maltese progression at all.
4. **RunRepeat percentiles are finishers-only and pre-2020 vintage** (tier B); WMA factors are official but measure age-adjusted performance, not health. Swim tiers are the thinnest data in the doc (tier C, self-selected populations) — label them "benchmarks," not "standards."
5. **Timelines for coached-facility skills assume facility access.** For the two target athletes (home/local-gym setting), acrobatics timelines should display with a "requires gym sessions" badge rather than a countdown.
