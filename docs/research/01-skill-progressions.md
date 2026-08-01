# 01 — Calisthenics & Barbell "Stunt" Progressions

**Purpose:** encodable reference for Protean's skill-tree, auto-advance engine, and strength-estimation model.
**Date compiled:** 2026-08-01. **Audience:** the engineer writing the progression data tables and unlock logic.

---

## 0. Conventions, and how much to trust each number

### 0.1 Evidence tiers — tag every constant in the DB with one

| Tier | Meaning | Use in app |
|---|---|---|
| **A** | Peer-reviewed, quantified (e.g. isometric carryover, HSR protocol, injury incidence) | Hard-code; safe to surface as "science says" |
| **B** | Large observational dataset, self-reported (StrengthLevel ratio tables) | Use for percentile/level estimation; label "community data" |
| **C** | Practitioner consensus, converged across ≥3 independent coaching sources (Overcoming Gravity lineage, r/bwf, GMB) | Use as default unlock criteria; make user-overridable |
| **D** | Single-source or my own geometric derivation | Show as estimate only; never gate a user on it alone |

Anywhere science is thin — which is *most* of calisthenics skill progression — the numbers below are tier C. State this in the UI. There are essentially **no RCTs on planche or front lever progression**; the field runs on gymnastics coaching tradition codified by Steven Low [Low, *Overcoming Gravity* 2nd ed., 2016, https://stevenlow.org/overcoming-gravity/] and the FIG Code of Points, which is what his progression charts were built from.

### 0.2 Units used in every table

- `hold_s` — seconds of static hold, **per set**, clean form.
- `sets` — number of qualifying sets in one session (criteria must be met on *all* sets).
- `reps` — full-ROM repetitions.
- `+%BW` — external load added, as a fraction of the athlete's bodyweight.
- `k` — **Skill Load Index coefficient** (see §2.4): dimensionless multiplier of bodyweight-equivalent shoulder/hip torque.

### 0.3 The two generic auto-advance rules

These two rules cover ~90% of the tree and should be the engine's defaults.

| Rule | Applies to | Advance when | Regress when | Source |
|---|---|---|---|---|
| **R-DYN (3×5→3×8)** | Any rep-based step | 3 sets × 8 clean reps in one session; restart next step at 3×5 | Cannot hit 3×5 for 2 consecutive sessions | [Reddit BWF Wiki, 2024, https://redditbwf.github.io/wiki/recommended_routine.html] |
| **R-STAT (3×10→3×30)** | Easy/mid static holds (support, L-sit, tuck FL, tuck BL, hollow) | 3 sets × 30 s | <3×10 s for 2 sessions | same |
| **R-STAT-HARD (3×10–15)** | Elite straight-arm statics (adv-tuck planche onward, straddle FL onward) | 3 sets × 10–15 s — **do not** wait for 30 s at these levels; the next step is unreachable that way | <3×5 s for 3 sessions | [GMB, n.d., https://gmb.io/planche/]; [Calisthenics Association, 2025, https://calisthenicsassociation.org/lessons/advanced-tuck-planche] |

**Mapping to The Protean Routine.** The routine's "2 × 15/20/35: hardest > … > easiest" rep-tier format is a variable-difficulty implementation of R-DYN: the three numbers are rep targets for the same slot at three difficulty tiers. Encode a slot as `{chain: [step…], tier_reps: [15,20,35]}` and auto-advance when the athlete hits the tier's rep target for all prescribed sets; auto-regress one chain link when they miss by >25% twice.

---

## 1. The science of straight-arm strength and isometric skill work

### 1.1 Why straight-arm skills are a separate strength quality

In a straight-arm static the elbow cannot share the moment; the entire external moment is resisted at the shoulder (and by the connective tissue crossing the elbow in tension). A full planche imposes a shoulder-flexion moment of roughly **70–80% of bodyweight-equivalent torque**, requiring anterior deltoid, rotator cuff and serratus/scapular protractors to work near-maximally in a lengthened, low-mechanical-advantage position [The Movement Athlete, 2024, https://themovementathlete.com/planche-muscles/] (tier C/D). Practically: bent-arm strength (dips, push-ups, weighted pull-ups) transfers **poorly** to straight-arm skill and cannot be used as a proxy in the estimation model. Model them as separate domains.

### 1.2 Joint-angle specificity — the single most decision-relevant finding

Isometric strength gains are **angle-specific**, and the decay with angular distance is now quantified. In the cleanest study, 6 weeks of isometric knee-extension training at 65° produced:

| Δ from trained angle | Joint angle | ΔMVT | Transfer fraction |
|---|---|---|---|
| 0° | 65° | **+12%** | 1.00 |
| −15° | 50° | +11% | 0.92 |
| +15° | 80° | +7% | 0.58 |
| −30° | 35° | +5% | 0.42 |

[Lanza, Balshaw & Folland, 2019, *Eur J Appl Physiol* 119(11–12):2465–2476, https://pubmed.ncbi.nlm.nih.gov/31522276/] (tier A). Authors concluded angle-specific gains are robust; the neural-activation explanation is weak.

**Codeable transfer kernel** (fit to the four points above; tier D fit of tier A data):

```
transfer(Δdeg) = clamp(1 − Δdeg / 50, 0, 1)
```

So a single trained angle "covers" roughly **±15–25°** usefully and is near-worthless beyond ~45°. Older work reached the same conclusion qualitatively — gains appear at the trained angle and the two adjacent angles only [Thépaut-Mathieu, Van Hoecke & Maton, 1988; summarized at https://europepmc.org/article/med/2737195] (tier A).

**Implication for the Protean Routine's "4×7 s at 3 joint angles":** three angles spaced ~30–40° apart tile a 90–120° arc with ≥0.4 transfer everywhere — the protocol is well-designed for coverage. The *duration* is off-spec for max strength: the review recommendation is **80–100% MVC for 1–5 s per contraction, 30–90 s total contraction time per session, at multiple joint angles** [Lum & Barbosa, 2019, *Int J Sports Med* "Brief Review: Effects of Isometric Strength Training on Strength and Dynamic Performance", https://www.researchgate.net/publication/332206319] (tier A). 4×7 s × 3 angles = 84 s total (in range) but each rep is 7 s (above range), which biases toward fatigue/hypertrophy rather than peak neural drive. **Recommend the app offer two modes:** `strength` = 4 × 3–5 s ramp-to-max at 3 angles; `skill/tissue` = the existing 4 × 7 s.

### 1.3 Overcoming vs yielding isometrics

| | Overcoming (push into immovable object) | Yielding (hold a load against gravity) |
|---|---|---|
| Primary transfer | Concentric / rate of force development | Eccentric control, position tolerance |
| Neural cost | High — treat as heavy work, needs recovery | Lower — usable at higher frequency |
| Best used for | Breaking a sticking point at a specific angle; the routine's 4×7 s slots | Every calisthenics static hold by definition (planche, lever, L-sit); the 1-min quasi-isometric holds |
| Load prescription | 80–100% MVC, 1–5 s | 60–80% of max hold time, accumulate 30–90 s |

[Lum & Barbosa, 2019, as above; PitchSix, n.d., https://pitchsix.com/blogs/blog/overcoming-vs-yielding-isometrics] — the mechanistic table is tier C, the %MVC/duration prescriptions tier A.

**Long-muscle-length bonus:** volume-matched isometric training at **longer muscle lengths** produces greater gains in CSA, architecture, angle-specific strength *and tendon mechanical properties* than short-length training [reviewed in https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11286269/] (tier A). Encode: prefer the *stretched/hardest* joint angle of each chain when the athlete can only train one angle.

### 1.4 A quantitative difficulty model for lever skills (use this for the strength-estimation engine)

Treat each static as a rigid body pivoting at the shoulder (planche/lever) or hip (flag). Torque at each arm:

```
L_cog   = 0.225 × height_m          # CoM-to-shoulder distance, ≈22.5% of height
L_arm   = 0.30  × height_m          # shoulder-to-wrist
τ_arm   = 0.5 × k × L_cog × mass_kg × 9.81      # N·m, per arm
DB_equiv_kg = τ_arm / (L_arm × 9.81)            # kg dumbbell front-raise equivalent, per arm
```

Worked example from the source (102 kg, 1.87 m → L_cog 0.422 m, L_arm 0.56 m) reproduces its published table exactly:

| Planche step | modeled angle | k = cos(angle) | τ/arm (N·m) | DB-equiv/arm |
|---|---|---|---|---|
| Tuck | 60° | 0.500 | 105.5 | 19.2 kg |
| Advanced tuck | 50° | 0.643 | 135.7 | 24.7 kg |
| Straddle | 40° | 0.766 | 161.7 | 29.4 kg |
| Full | 30° | 0.866 | 182.8 | 33.3 kg |

[Rise With Marcus, 2024, https://risewithmarcus.com/blog/a-scientific-approach-to-mastering-the-planche--quantifying-progress-and-setting-clear-goals] (tier D — one practitioner's geometry, but internally consistent and reproducible).

**k coefficients to seed the DB** (planche row is tier D-from-source; the rest are my extrapolations by the same lever geometry — mark tier D, allow tuning):

| Skill | k values, easiest → hardest |
|---|---|
| Planche | lean 0.30 · tuck 0.50 · adv tuck 0.64 · straddle 0.77 · full 0.87 · planche push-up ≈ 0.77–0.87 dynamic |
| Front lever | tuck 0.45 · adv tuck 0.60 · one-leg 0.72 · straddle 0.82 · full 1.00 |
| Back lever | tuck 0.45 · adv tuck 0.60 · one-leg 0.72 · straddle 0.82 · full 1.00 |
| Dragon flag | tuck 0.50 · one-leg 0.70 · straddle 0.80 · full 1.00 |

Key product use: **k lets you compare a female 58 kg athlete's straddle FL against a male 82 kg athlete's adv-tuck FL on one axis** (τ = 0.5·k·L_cog·m·g), which is exactly what the two-athlete comparison view needs.

---

## 2. Connective-tissue preparation (elbows, shoulders, wrists) — non-negotiable gating

### 2.1 Why slow progression is not merely conservative

- Tendon adapts on a much slower clock than muscle: "adaptation time to chronic loading is longer in tendon tissue compared with contractile elements," and gross-dimension change requires very prolonged loading [Kjær et al., 2009, *Scand J Med Sci Sports*, https://pubmed.ncbi.nlm.nih.gov/19706001/] (tier A). Mature tendon core collagen turns over glacially — carbon-dating work implies effectively no turnover of the core after adolescence [Magnusson & Kjær, 2019, *J Physiol*, https://physoc.onlinelibrary.wiley.com/doi/abs/10.1113/JP275450] (tier A).
- Calisthenics injury load is real and upper-limb dominated: **1.288 injuries / 1000 h of training**, >73% at the upper extremity (shoulder, wrist, hand leading), **65.5% causing time loss** (80/124 injuries), mean time loss ≈ **40 days** (CI 29.0–51.3), range 1–220 days [Kaiser, Engeroff, Niederer, Wurm, Vogt & Banzer, 2018, *Dtsch Z Sportmed* 69:299–304, https://www.germanjournalsportsmedicine.com/archive/archive-2018/issue-9/the-epidemiological-profile-of-calisthenics-athletes/] (tier A).

**App rule:** for any straight-arm skill, cap week-over-week increase in *total static time under tension* at **+10–15%**, and require a minimum **dwell time of 3–4 weeks per progression step** even if the rep/hold criterion is met earlier. This is the highest-value safety constant in the system.

### 2.2 Heavy Slow Resistance (HSR) — the load-based tendon protocol

Canonical protocol (Kongsgaard's patellar-tendinopathy trial; generalizable to elbow/shoulder with the same tempo/load logic):

| Parameter | Value |
|---|---|
| Duration | 12 weeks |
| Frequency | 3× / week (48–72 h between sessions) |
| Tempo | **3 s concentric + 3 s eccentric = 6 s per rep** |
| Load progression | week 1–2 at 15RM → week 9–12 at **6RM** (≈70% 1RM ≈ 7RM mid-program) |
| Sets | 3–4 per exercise, 3 exercises for the target tendon |

[Kongsgaard et al., 2009, *Scand J Med Sci Sports*, https://onlinelibrary.wiley.com/doi/full/10.1111/j.1600-0838.2009.00949.x; protocol summary at https://embodiaapp.com/blog/488-heavy-slow-resistance-training-for-tendinopathy-achilles-patellar-elbow] (tier A). HSR matched eccentric training on pain/function at 12 weeks but was the only arm to show increased collagen turnover and reduced neovascularity, and had higher satisfaction at 6 months. HSR also matched eccentric training for Achilles tendinopathy [Beyer et al., 2015, *Am J Sports Med*, https://journals.sagepub.com/doi/abs/10.1177/0363546515584760].

### 2.3 Baar's collagen/isometric protocol (prehab + rehab slot in the app)

| Parameter | Value | Note |
|---|---|---|
| Supplement | **15 g hydrolyzed collagen / gelatin + ~200–250 mg vitamin C** | 5 g was no better than placebo |
| Timing | **30–60 min before** loading | absorption window |
| Loading | short bout of loading; original study used **6 min rope-skipping**; clinically 5–10 min of isometrics, ~10 s–30 s holds, low RPE (~2/10) when painful | more than ~10 min gives no extra stimulus (refractory period) |
| Frequency | **2 sessions/day, ≥6 h apart** | ≥6 h is what lets the second bout count |
| Effect | PINP (collagen-I synthesis marker) at 4 h: +53.9% placebo, +59.2% at 5 g, **+153% at 15 g** | |

[Shaw, Lee-Barthel, Ross, Wang & Baar, 2017, *Am J Clin Nutr* 105(1):136–143, https://academic.oup.com/ajcn/article-abstract/105/1/136/4569849] (tier A for the biomarker result; the ≥6 h refractory and 5–10 min dose are tier A/B from Baar's lab and interviews, e.g. https://tim.blog/2025/02/27/dr-keith-baar-transcript/). **Caveat to display:** PINP is a *blood marker*, not a demonstrated reduction in injuries or gain in tendon strength. Do not over-claim.

### 2.4 Skill-specific tissue cautions

| Skill | Structure at risk | Mitigation to encode as a gate |
|---|---|---|
| Back lever, skin-the-cat, german hang | **Distal biceps tendon, elbow** — the most-reported calisthenics tendon injury | Require 3×30 s comfortable german hang before any back-lever step; train **supinated grip ≥60% of the time**; never straighten the arms fast [The Movement Athlete, 2023, https://themovementathlete.com/how-to-avoid-injuries-when-training-back-lever/] |
| Planche, planche lean | Biceps tendon at elbow, anterior shoulder capsule, **wrist extensors** | Elbow pits forward + locked; wrist prep 3–5 min/session; cap lean-angle increase at ~2–3°/week |
| Front lever | Long head of biceps, lat insertion, medial elbow | Straight-arm scap pulls 3×8 before any tuck FL work |
| Ring muscle-up / false grip | Wrist flexors, ulnar wrist | Expect 2–3 weeks of adaptation discomfort on false-grip hangs; start 3×5 s |
| One-arm pull-up | Medial epicondyle (golfer's elbow), shoulder labrum | Do **not** enter OAP work with pre-existing elbow irritation from normal pull-ups |
| Nordic curl | Hamstring musculotendinous junction (DOMS extreme in week 1–2) | Start eccentric-only, 2×3, and never add volume and depth in the same week |
| Bridge / backbend | Lumbar facets if thoracic ext. is limited; anterior shoulder | Gate on shoulder flexion ROM before floor bridge |

---

## 3. Skill lines — ordered steps, unlock criteria, prerequisites, timelines

> Timelines below are **median-ish practitioner estimates (tier C)** for 3–4 focused sessions/week. Variance is enormous and strongly bodyweight- and limb-length-dependent. Present as ranges, never as a countdown.

### 3.1 Planche line

**Prerequisite baseline:** 30 s straight-arm support hold on parallettes/rings; 10–15 clean push-ups; 30 s+ chest-to-wall handstand; pain-free wrists in extension.

| # | Step | Unlock criteria (advance when) | Notes |
|---|---|---|---|
| 1 | Planche lean (feet down, scap protracted) | 3 × 30 s at ≥25° lean | measure lean angle from vertical at the shoulder; log it |
| 2 | Tuck planche | 3 × 15 s, hips ≥ shoulder height, arms locked | many spend 3–6 months here; flat-back shape set here is used forever |
| 3 | Advanced tuck planche | 3 × 12–15 s, flat back, hips at shoulder height | most common plateau in the whole tree |
| 4 | Straddle planche | 3 × 10 s; entry gate is ~15 s solid adv-tuck | wider straddle = easier; narrow it over time |
| 5 | Full planche | 3 × 5 s → 3 × 10 s to "own" it | |
| 6 | Planche push-up (straddle then full) | 3 × 3 reps full ROM | requires ~straddle planche + weighted dip strength |

Criteria from [GMB, n.d., https://gmb.io/planche/], [Calisthenics Association, 2025, https://calisthenicsassociation.org/lessons/advanced-tuck-planche], [Calisthenics Association, 2025, https://calisthenicsassociation.org/lessons/straddle-planche-training] (tier C, converged).

**Timelines:** untrained → straddle planche **18–24 months**; already-advanced (solid handstand, weighted dips, prior straight-arm work) → straddle **12–18 months**, full **18–24 months**. Full planche from untrained: **1–3 years typical, up to 4+ for tall/heavy athletes; many never get it.** Straddle alone is quoted anywhere from 0.5–4 years depending on height/mass/leg mass [Calisthenics Association, 2025; Fitloop, 2026, https://fitloop.app/skills/planche] (tier C). Because τ ∝ mass × height, **the app should shrink predicted timelines for lighter/shorter athletes and extend for heavier/taller** — use the k-model τ as the covariate.

### 3.2 Front lever line

**Prerequisite baseline:** 10+ strict dead-hang pull-ups; 3×8 straight-arm scapular pulls; 30 s active hang.

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Tuck front lever | 3 × 20–30 s | use R-STAT here |
| 2 | Advanced tuck FL | 3 × 10–15 s | flat back, hips open |
| 3 | One-leg FL | 3 × 8–10 s **per side** (alternate sets) | builds unilateral tolerance |
| 4 | Straddle FL | 3 × 10 s | narrow the straddle as it gets easier |
| 5 | Half-lay FL (optional) | 3 × 8 s | good intermediate for long-limbed athletes |
| 6 | Full front lever | 3 × 5 s → hold 10 s | |
| 7 | FL pull-up / FL raise | 3 × 3 reps at the owned static level | dynamic branch, unlock after full-lever 5 s |

[The Movement Athlete, 2024, https://themovementathlete.com/front-lever-progression/; Club Calisthenics, 2023, https://www.clubcalisthenics.com/post/front-lever-progressions-and-how-to-perform-them-properly] (tier C).

**Timelines:** beginner **18–24 months**; intermediate (10+ pull-ups) **12–18 months**; advanced calisthenics background **6–12 months** [Wellfit Insider, 2025, https://wellfitinsider.com/workout-tips/front-lever-training-routine/] (tier C).

### 3.3 Back lever line

**Prerequisite baseline:** comfortable german hang 3×30 s; skin-the-cat 3×5 slow; no elbow pain.

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 0 | German hang | 3 × 30 s pain-free | **hard gate — do not skip** |
| 1 | Tuck back lever | 3 × 20–30 s | supinated grip preferred |
| 2 | Advanced tuck BL | 3 × 10 s | |
| 3 | One-leg BL | 3 × 8 s per side | |
| 4 | Straddle BL | 3 × 10 s | |
| 5 | Full back lever | 3 × 5 s → 10 s | |

[Calisthenics Hub, 2024, https://www.calisthenics-hub.com/guides/back-lever-tutorial; The Movement Athlete, 2023, https://themovementathlete.com/back-lever-workout/] (tier C).

**Timelines:** tuck 3–6 months; adv tuck/half-lay 6–12 months; straddle/one-leg 12–18 months; full 18+ months. Minimum 4–8 months of progression work before attempting full is the common safety statement. Back lever is **easier than front lever in raw strength but far more dangerous to the elbow** — the app should never auto-advance BL faster than one step per 4 weeks.

### 3.4 Dragon flag / human flag

**Dragon flag prerequisite:** hollow-body hold 30 s clean.

| # | Step | Unlock criteria | Timeline |
|---|---|---|---|
| 1 | Hollow body hold | 1 × 30 s perfect | — |
| 2 | Tuck dragon flag | 3 × 10 s or 3×8 slow negatives | 1–3 months |
| 3 | Straddle dragon flag | 3 × 10 s | 3–6 months |
| 4 | Full dragon flag (hold) | 3 × 10 s | 6–12+ months |
| 5 | Dragon flag reps | 3 × 5 controlled reps | +3–6 months |

[Bodyweight Training Arena, 2026, https://bodyweighttrainingarena.com/dragon-flag-progression/] (tier C).

**Human flag:** separate skill (frontal-plane, push+pull). Progression: vertical-bar support hold → tuck flag → one-leg flag → straddle flag → full flag; **advance at 3 × 15 s per step** [Calisthenics Nerd, 2020, https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/] (tier C). Prerequisite: strong overhead press + lat strength; women frequently reach this earlier than men relative to training age (see §5).

### 3.5 Muscle-up (bar and rings)

| Variant | Prerequisites (converged) | Progression steps | Unlock criteria |
|---|---|---|---|
| **Bar MU** | 5+ strict pull-ups (many coaches say 8–10 chest-to-sternum); comfortable kip | high pull-ups → explosive pull to sternum → band-assisted MU → jumping MU → bar MU → strict bar MU | chest-to-bar pull-up ×5; then 3 × 1 MU; strict when 3 × 3 |
| **Ring MU** | 5 strict chest-to-bar pull-ups; **3–5 strict ring dips from lockout, full ROM**; false-grip tolerance | false-grip dead hang 3×5 s → false-grip pull-up 3×5 → ring transition drills (feet assisted) → ring MU → slow/strict ring MU | 3 × 1 clean; strict when 3 × 3 with no kip |

Some practitioner sources set a much higher bar (20 pull-ups + 20 dips) — that is over-conservative but a good *guarantee* threshold. Ring MU is generally the harder of the two due to instability; most people get bar MU first and ring MU 4–8 weeks later [WODprep, 2024, https://wodprep.com/blog/guide-getting-first-muscle-up-ring-bar/; Calisthenics Association, 2025, https://calisthenicsassociation.org/blog/muscle-up-tutorial-zero-to-hero] (tier C).

**Caution:** false-grip wrist discomfort for 2–3 weeks is expected and normal; sharp ulnar-side pain is not.

### 3.6 Handstand line (wall → freestanding → HSPU → one-arm)

| # | Step | Unlock criteria | Timeline (from untrained) |
|---|---|---|---|
| 1 | Wrist prep + plank/pike shapes | 3 × 45 s pike hold, wrists pain-free | wks 0–4 |
| 2 | Chest-to-wall handstand | **60 s** straight arms, flat back | 1–3 months |
| 3 | Wall-facing → toe pulls / weight shifts | 10 × 3 s free balance out of the wall | 3–6 months |
| 4 | Freestanding handstand (brief) | 3–5 s unassisted | 4–9 months (~90 days of 5–6×/wk practice for first 3–5 s) |
| 5 | Freestanding 30 s | 30 s × 3 | 9–18 months |
| 6 | Pike push-up → elevated pike push-up | 3 × 8 each | parallel track |
| 7 | Wall HSPU (partial → full ROM) | 3 × 5 full ROM | 1–2 years |
| 8 | Deficit / parallette HSPU | 3 × 5 with 10 cm deficit | +6 months |
| 9 | Freestanding HSPU | 3 × 3 | 2–3 years |
| 10 | One-arm handstand work | gate: **consistent 45–60 s freestanding** + clean straight/tuck/straddle shape changes | 3–5+ years; step-wise 20–30 s per sub-progression |

[Odin Fitness, 2026, https://odin.fitness/blog/handstand-progression-90-day-plan; Calisthenics Association, 2025, https://calisthenicsassociation.org/blog/handstand-training-complete-guide; GMB, n.d., https://gmb.io/oahs/] (tier C). Gate for loading the press: **30 s+ chest-to-wall with elevated shoulders** before HSPU work [The Barbell Physio, https://thebarbellphysio.com/handstand-pushup-strength-progression/].

### 3.7 One-arm push-up

**Prerequisite baseline:** 20 clean push-ups; 10 diamond push-ups; 30 s rigid high plank.

| # | Step | Unlock criteria | Timeline |
|---|---|---|---|
| 1 | Push-up | 3 × 20 | — |
| 2 | Diamond push-up | 3 × 10 | — |
| 3 | Archer push-up | 3 × 8 per side (start 3×3–5, 2×/wk) | 1–3 months |
| 4 | Elevated-arm archer / one-arm on box | 3 × 8 per side | 3–6 months |
| 5 | One-arm negative (5 s down, two-hand up) | 3 × 5 per side | 3–6 months |
| 6 | One-arm push-up (feet wide) | 3 × 3 per side | 6–12 months |
| 7 | One-arm push-up, feet narrow / weighted | 3 × 5 per side | 12–24 months |

[Calisthenics Corner, 2025, https://www.calisthenics-corner.com/articles/archer-push-ups/; Fitloop, 2026, https://www.fitloop.app/skills/one-arm-pushup] (tier C). Anti-rotation core capacity is co-limiting — pair with side plank / Pallof progressions.

### 3.8 One-arm pull-up / chin-up — the weighted-pull-up gate

This is the question the app most needs a hard number for. Converged practitioner positions:

| Threshold | Value | Interpretation for the app |
|---|---|---|
| Bilateral base before *any* OAP work | **10–15 strict dead-hang pull-ups** | hard gate |
| "Sensible entry" to OAP-specific work | **weighted pull-up 3–5 reps @ +25–45% BW** | recommended `unlock` for the OAP branch |
| Common heuristic ("halfway loaded") | **1 rep @ +50% BW** | good mid-branch checkpoint |
| Strength equivalent of an actual OAP | **1 rep @ +70–80% BW** | expect the OAP shortly after this, given the unilateral/grip work is done |
| Support work | 30–45 s active hang; 8–12 straight-arm scap pulls | prehab gate |

[BullBar, 2025, https://bullbarfit.com/blogs/updates/the-one-arm-pull-up-is-a-load-problem-build-the-positions-build-the-tolerance-earn-the-rep and https://bullbarfit.com/blogs/q-as/what-are-the-key-steps-to-train-for-a-one-arm-pull-up-from-scratch] (tier C). Cross-check with community weighted-pull-up ratio data: intermediate ≈ **+16–35% BW**, advanced ≈ **+30–60% BW**, elite ≈ **+48–80% BW** [Liftoff, 2025, https://liftoffrank.com/blog/weighted-pull-up-standards; Kalibre Fitness, https://kalibrefitness.com/pull-up-standards/] (tier B) — i.e. an OAP sits at the **elite** end of the weighted-pull-up distribution. That is consistent and is the number to ship.

**Ordered chain:** pull-up → weighted pull-up +10/20/30% → archer pull-up (3×5/side) → uneven/towel pull-up (3×5/side) → one-arm negative (5–8 s, 3×3/side) → assisted OAP (band or finger-assist, 3×3/side) → **one-arm chin-up** (supinated, easier) → **one-arm pull-up** (pronated). Chin-up variant first: supination gives biceps a better line and is the more commonly achieved of the two.

**Timeline:** 2–5 years from a 10-pull-up base for men; longer for heavier athletes. Ignore StrengthLevel's OAP "intermediate = 5 reps" table [https://strengthlevel.com/strength-standards/one-arm-pull-ups/lb] — that dataset is self-selected and wildly inflated; do **not** use it for OAP calibration (it is fine for pull-ups: male novice 6 / intermediate 13 / advanced 24 / elite 34; female intermediate 6 / advanced 14 / elite 23).

### 3.9 Pistol squat → weighted pistol, and shrimp squat

**Prerequisite baseline:** 20 bodyweight squats; adequate ankle dorsiflexion (knee-to-wall ≥ 10 cm is the usual clinical proxy); single-leg balance 30 s.

| # | Step | Unlock criteria | Notes |
|---|---|---|---|
| 1 | Split squat / rear-foot-elevated | 3 × 12 per side | |
| 2 | Assisted pistol (TRX/doorframe) | 3 × 8 per side | |
| 3 | Box pistol, high box → low box | 3 × 8 per side at each height, drop 5 cm | the ankle-mobility workaround |
| 4 | Counterbalance pistol (hold 2.5–5 kg out front) | 3 × 5 per side | counterweight makes it *easier* |
| 5 | Full pistol squat | 3 × 5 per side → 3 × 8 | |
| 6 | Weighted pistol | +10% BW for 3×5 → +25% BW | this is the routine's top chain link |

Timeline 60–120 days for trainees with adequate mobility; ankle dorsiflexion — not strength — is the usual limiter [PowerliftingTechnique, 2024, https://powerliftingtechnique.com/pistol-squat-progression/; GMB, n.d., https://gmb.io/pistol/] (tier C).

**Shrimp squat** (parallel/alternative chain, more knee-flexion and hip-flexor-mobility demand, less ankle demand): assisted shrimp → beginner shrimp (hands free, knee to floor) → intermediate (hold rear foot, torso upright) → advanced (hold rear foot, knee taps floor, hands overhead) → weighted. **3 × 5 per side per level.** Many coaches recommend starting here rather than pistols because it loads mid-foot and scales more smoothly [Apex School of Movement, https://apexmovement.com/shrimp-pistol].

### 3.10 L-sit → V-sit → manna

| # | Step | Unlock criteria | Limiter |
|---|---|---|---|
| 1 | Support hold (parallettes) | 3 × 30 s | shoulder depression |
| 2 | Foot-supported / one-leg L-sit | 3 × 20 s per side | |
| 3 | Tuck L-sit | 3 × 30 s | |
| 4 | L-sit | 3 × 30 s (accumulate 60 s/day as practice) | compression + hip flexors |
| 5 | Straddle L-sit / high L-sit | 3 × 20 s | |
| 6 | V-sit | 3 × 10 s | **active pike compression / hamstring flexibility is the hard limiter, not strength** |
| 7 | Manna | 3 × 5 s | shoulder extension ROM, wrist extension, straddle compression |

[Antranik, https://antranik.org/advanced-l-v-manna-progressions/; The Gymnastics Authority, https://www.thegymnasticsauthority.com/how-to-do-a-manna-comprehensive-tutorial/] (tier C). **Encode a mobility gate, not just a strength gate:** V-sit requires a near-full pike (chest-to-thigh) and manna requires substantial shoulder *extension*. Manna is a multi-year skill; realistically 3–6+ years, and adult-onset trainees frequently never reach it.

### 3.11 Nordic curl line

| # | Step | Unlock criteria |
|---|---|---|
| 1 | Hamstring bridge / single-leg RDL | 3 × 10 per side |
| 2 | Assisted Nordic (band or hands-on-box) | 3 × 6 with control past 45° |
| 3 | Eccentric-only Nordic (fall, push back up with hands) | 3 × 6 controlled to floor |
| 4 | Eccentric Nordic, slow (≥4 s descent) | 3 × 5 |
| 5 | Full Nordic (eccentric + hamstring-driven concentric) | 3 × 5 |
| 6 | Weighted / fast-tempo Nordic | 3 × 5 holding 5–10 kg; speed variant only from week 6+ |

Evidence is strong for the *outcome*: NHE programs reduce hamstring injuries by ~**50%** in athletes [meta-analytic summary, ThePrehabGuys, https://theprehabguys.com/nordic-hamstring-curl-variations/] (tier A for the effect size, tier C for the step ladder). Risk flag: eccentric hamstring / concentric quadriceps imbalance >20% is associated with a **4× hamstring injury risk** — worth surfacing in the app's imbalance panel. Extreme DOMS in weeks 1–2 is expected; cap at 2 sessions/week and 12–24 total reps/week initially.

### 3.12 Bridge / backbend line

| # | Step | Unlock criteria |
|---|---|---|
| 1 | Glute bridge / hip thrust | 3 × 15 |
| 2 | Wall bridge (walk hands down wall) | reach 3 hand-widths lower than start, 3 × 5 |
| 3 | Short bridge (head-supported) | 3 × 20 s |
| 4 | Full floor bridge (arms straight, chest over hands) | 3 × 30 s |
| 5 | Elevated-feet bridge / gecko bridge | 3 × 20 s |
| 6 | Bridge wall-walk to standing (assisted) | 3 × 3 |
| 7 | Stand-to-stand bridge | 3 × 3 |

[Bodyweight Training Arena, https://bodyweighttrainingarena.com/bridges/; GMB, https://gmb.io/bridge/; Dani Winks Flexibility, https://www.daniwinksflexibility.com/bendy-blog/the-ultimate-bridge-pose-progression-guide] (tier C). Train 2–3×/week. **Gate on shoulder flexion ROM** (overhead reach lying supine with ribs down) — if it's limited, the lumbar spine takes the extension and this is where bridge training hurts people.

### 3.13 Rope climb / L-sit rope climb (in the user's routine)

| # | Step | Unlock criteria |
|---|---|---|
| 1 | Rope/towel dead hang | 3 × 30 s |
| 2 | Rope pull-up (feet on ground, arm-over-arm) | 3 × 8 |
| 3 | Rope climb with leg wrap (J-hook or S-wrap) | 2 ascents of 4–5 m |
| 4 | Legless rope climb, feet tucked | 1 ascent, then 3 ascents |
| 5 | **L-sit rope climb** | 1 ascent maintaining L, then 3 |
| 6 | Weighted / speed legless climb | +10% BW vest |

Prerequisites: strict pull-ups (8+) and dedicated grip work; legless climbing is one of the most demanding bodyweight pulling movements and is limited by grip endurance more than lats [WODprep, https://wodprep.com/blog/legless-rope-climb-techniques-crossfit/; ZOAR Fitness, https://zoarfitness.com/movements/rope-climbs/] (tier C). L-sit rope climb additionally requires an owned L-sit (3×30 s) — it's the intersection of §3.10 step 4 and this chain, so model it as a **skill-tree node with two parents**.

---

## 4. Barbell stunts — bodyweight-ratio milestones

Ratios below are StrengthLevel's community-data standards (tier B; ~millions of self-reported 1RMs; **inflated relative to gym reality**, so treat "intermediate" as a genuinely respectable lifter). All are 1RM ÷ bodyweight.

| Lift | ♂ Beg | ♂ Nov | ♂ Int | ♂ Adv | ♂ Elite | ♀ Beg | ♀ Nov | ♀ Int | ♀ Adv | ♀ Elite |
|---|---|---|---|---|---|---|---|---|---|---|
| Back squat | 0.75 | 1.25 | 1.75 | 2.25 | 2.75 | 0.50 | 0.75 | 1.25 | 1.75 | 2.25 |
| Bench press | 0.50 | 1.00 | 1.25 | 1.50 | 2.00 | 0.30 | 0.50 | 0.75 | 1.10 | 1.45 |
| Deadlift | 1.00 | 1.50 | 2.00 | 2.50 | 3.25 | 0.75 | 1.00 | 1.50 | 2.00 | 2.50 |
| Overhead press | 0.35 | 0.55 | 0.80 | 1.05 | 1.35 | 0.20 | 0.35 | 0.50 | 0.70 | 0.95 |
| Power clean | 0.50 | 0.75 | 1.00 | 1.50 | 1.75 | 0.45 | 0.60 | 0.80 | 1.05 | 1.35 |

Sources: [StrengthLevel, 2026, https://strengthlevel.com/strength-standards/squat/lb], [.../bench-press/lb], [.../deadlift/lb], [.../shoulder-press/lb], [.../power-clean/lb]. A more conservative, widely-used male "classic milestone" set is 1.5× squat / 1.2× bench / 2× deadlift / 0.8× OHP [Legion, https://legionathletics.com/strength-standards/] — that maps to StrengthLevel's *novice–intermediate* band. **Ship both and let the athlete pick a standard.**

### 4.1 Named barbell "stunts" for the skill tree

| Stunt | ♂ criterion | ♀ criterion | Notes |
|---|---|---|---|
| Bodyweight bench | 1.0× BW ×1 | 0.75× BW ×1 | ♀ 0.75× ≈ same percentile as ♂ 1.0× |
| Bodyweight OHP | 1.0× BW ×1 | 0.70× BW ×1 | ♂ 1.0× ≈ advanced; ♀ 0.70× ≈ advanced |
| Double-bodyweight squat | 2.0× BW ×1 | 1.5× BW ×1 | |
| Triple-bodyweight deadlift | 3.0× BW ×1 | 2.25× BW ×1 | near elite for both |
| 2× BW deadlift ("first milestone") | 2.0× | 1.5× | intermediate |
| Bodyweight snatch | 1.0× BW ×1 | 0.85× BW ×1 | tier C/D — see below |
| Bodyweight clean & press | 1.0× BW ×1 | 0.80× BW ×1 | |
| Weighted pull-up 1/2 BW | +50% BW ×1 | +35% BW ×1 | OAP checkpoint |
| Weighted dip 1/2 BW | +50% BW ×1 | +35% BW ×1 | |

**Olympic-lift cross-ratios to sanity-check user entries** [Everett's Olympic Weightlifting skill-level chart, summarized at https://www.olyliftplan.com/learn/snatch-clean-jerk-ratio] (tier C):

```
snatch        ≈ 0.78–0.83 × clean&jerk
back squat    ≈ 1.25–1.35 × clean
power snatch  ≈ 0.70–0.75 × power clean
```

Use these to flag implausible logged maxes (e.g. a snatch >0.90 × C&J is almost certainly a data-entry error, not a technique outlier).

---

## 5. Sex-specific considerations

| Domain | Finding | Encode as |
|---|---|---|
| Absolute upper-body strength | Elite female athletes' upper-body push/pull strength is **47–71%** of male [Ludvigsen et al., 2024, *Sports*, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11359276/] (tier A) | separate ♂/♀ percentile curves — never one curve |
| Pulling reps | USMC PFT max score: **23 pull-ups ♂ vs 8 ♀** (tier A, policy doc) | ≈0.35 rep ratio at the top of the distribution |
| Barbell ratios | Female standards run ≈0.55–0.75× male at the same tier (see §4 table) | already in ratio table |
| Planche & OAP | Higher relative upper-body mass requirement + (on average) lower CoM from wider hips means women's planche/OAP timelines run longer; full planche is very rare in women [Gravity Fitness, https://gravity.fitness/blogs/training/women-and-upper-body-strength; Bodyweight Training Arena, https://bodyweighttrainingarena.com/should-men-and-women-train-differently/] (tier C) | multiply planche/OAP/HSPU timeline estimates by ≈1.3–1.6 for female athletes; **display as a range, and let the user dismiss it** |
| Straddle planche, human flag, levers | Lower absolute bodyweight and typically greater flexibility make **straddle** variants and the human flag comparatively more attainable; women often reach straddle-shape milestones at similar or better relative loads | do *not* apply the same penalty multiplier to straddle-shape and flag nodes |
| Compression skills (L/V-sit, manna, pike) | Flexibility advantage on average | timeline multiplier ≈0.8–1.0 |
| Lower body (pistol, shrimp, nordic) | Relative lower-body strength gap is much smaller than upper-body | multiplier ≈1.0 |

**Product warning:** these multipliers are tier C/D. Ship them as *defaults that adapt out of existence* — after ~8 weeks of logged data, the per-athlete observed rate of progression should dominate any sex-based prior.

---

## 6. Machine-readable summary table

`skill | steps (easiest→hardest) | unlock criteria per step | prerequisite | est. months (untrained → trained)`

| skill | steps | unlock criteria per step | prerequisite | est. months |
|---|---|---|---|---|
| planche | lean; tuck; adv_tuck; straddle; full; planche_pushup | 3×30s@25°; 3×15s; 3×12-15s; 3×10s; 3×5s; 3×3reps | 30s support hold, 15 pushups, 30s wall HS | 24–48 → 12–24 |
| front_lever | tuck; adv_tuck; one_leg; straddle; half_lay; full; fl_pullup | 3×30s; 3×15s; 3×10s/side; 3×10s; 3×8s; 3×5s; 3×3 | 10 strict pull-ups, 3×8 scap pulls | 18–24 → 6–12 |
| back_lever | german_hang; tuck; adv_tuck; one_leg; straddle; full | 3×30s; 3×30s; 3×10s; 3×8s/side; 3×10s; 3×5s | skin-the-cat 3×5, pain-free elbows | 12–18 → 6–12 |
| dragon_flag | hollow; tuck; straddle; full_hold; full_reps | 30s; 3×10s; 3×10s; 3×10s; 3×5 | hollow hold 30s | 9–18 → 4–8 |
| human_flag | support; tuck; one_leg; straddle; full | 3×15s each | strong OHP + lats | 12–24 → 6–12 |
| muscle_up_bar | high_pullup; explosive_pullup; assisted_mu; bar_mu; strict_bar_mu | 3×8; 3×5 to sternum; 3×3; 3×1; 3×3 | 5–8 strict pull-ups | 6–12 → 2–4 |
| muscle_up_rings | false_grip_hang; false_grip_pullup; transition_drill; ring_mu; strict_ring_mu | 3×5s; 3×5; 3×5; 3×1; 3×3 | 5 C2B pull-ups + 3–5 strict ring dips | 9–15 → 3–6 |
| handstand | wall_hs; wall_60s; weight_shift; free_3s; free_30s; free_60s | 30s; 60s; 10×3s; 3–5s; 3×30s; 60s | wrist prep, 45s pike hold | 9–18 → 4–9 |
| hspu | pike_pushup; elevated_pike; wall_hspu_partial; wall_hspu_full; deficit_hspu; free_hspu | 3×8; 3×8; 3×5; 3×5; 3×5@10cm; 3×3 | 30s+ wall handstand, 10 pushups | 12–36 → 8–18 |
| one_arm_handstand | 45s_free_hs; shape_changes; weight_shift; fingertip_assist; oahs_3s | 45–60s; clean tuck/straddle; 3×20-30s; 3×20s; 3×3s | consistent 45–60s freestanding HS | 36–60+ → 24–36 |
| one_arm_pushup | pushup; diamond; archer; elevated_archer; oap_negative; oap; oap_narrow | 3×20; 3×10; 3×8/side; 3×8/side; 3×5/side; 3×3/side; 3×5/side | 20 pushups, 30s plank | 12–24 → 6–12 |
| one_arm_pullup | pullup10; wpu_25pct; wpu_50pct; archer_pullup; uneven_pullup; oap_negative; assisted_oap; one_arm_chinup; one_arm_pullup | 10 strict; 3–5 reps @+25%BW; 1 @+50%BW; 3×5/side; 3×5/side; 3×3 @5-8s/side; 3×3/side; 1/side; 1/side | 10–15 strict pull-ups, no elbow pain | 36–60 → 24–36 |
| pistol_squat | split_squat; assisted_pistol; box_pistol; counterbalance_pistol; pistol; weighted_pistol | 3×12/side; 3×8/side; 3×8/side per height; 3×5/side; 3×8/side; 3×5 @+25%BW | 20 BW squats, ankle DF ≥10cm knee-to-wall | 3–6 → 2–4 |
| shrimp_squat | assisted; beginner; intermediate; advanced; weighted | 3×5/side each | pistol-level quad strength or parallel track | 4–9 → 3–6 |
| l_sit_manna | support; one_leg_l; tuck_l; l_sit; straddle_l; v_sit; manna | 3×30s; 3×20s/side; 3×30s; 3×30s; 3×20s; 3×10s; 3×5s | 3×30s support hold + full pike ROM | 36–72 → 24–48 |
| nordic_curl | bridge_slr; assisted_nordic; ecc_nordic; slow_ecc_nordic; full_nordic; weighted_nordic | 3×10/side; 3×6; 3×6; 3×5@4s; 3×5; 3×5@+5-10kg | no acute hamstring injury | 6–12 → 3–6 |
| bridge | glute_bridge; wall_bridge; short_bridge; full_bridge; gecko_bridge; assisted_stand2stand; stand_to_stand | 3×15; 3×5; 3×20s; 3×30s; 3×20s; 3×3; 3×3 | overhead shoulder flexion ROM | 9–24 → 6–12 |
| rope_climb | rope_hang; rope_pullup; legged_climb; legless_climb; lsit_rope_climb; weighted_climb | 3×30s; 3×8; 2 ascents; 1→3 ascents; 1→3 ascents; +10%BW | 8 strict pull-ups + owned L-sit (for L-sit variant) | 6–12 → 3–6 |
| barbell_squat | 1.0xBW; 1.5xBW; 2.0xBW; 2.5xBW | 1RM ratio (♀ ×0.72) | competent technique, 3×5 @ 0.75×BW | 12–36 → 6–24 |
| barbell_bench | 0.75xBW; 1.0xBW; 1.5xBW; 2.0xBW | 1RM ratio (♀ ×0.70) | 3×5 @ 0.5×BW | 12–36 → 6–24 |
| barbell_deadlift | 1.5xBW; 2.0xBW; 2.5xBW; 3.0xBW | 1RM ratio (♀ ×0.78) | hip-hinge competence | 9–30 → 6–18 |
| barbell_ohp | 0.5xBW; 0.75xBW; 1.0xBW; 1.25xBW | 1RM ratio (♀ ×0.70) | overhead shoulder ROM | 12–36 → 8–24 |
| power_stunts | bw_power_clean; bw_clean_and_press; bw_snatch | 1.0×BW (♀0.80); 1.0×BW (♀0.80); 1.0×BW (♀0.85) | coached technique; snatch ≈0.78–0.83×C&J sanity check | 24–48 → 12–24 |

---

## 7. Known gaps / where the app must be honest

1. **No controlled trials exist** on planche/lever progression criteria, hold-time thresholds, or optimal step ordering. Everything in §3 is coaching consensus. Label it.
2. **Timeline estimates have huge variance** and are anchored on lean, young, male practitioners writing blog posts. Widen every range by ±50% before showing it, and replace priors with the athlete's own logged rate ASAP.
3. **The k-coefficient model (§1.4) is geometric, not measured.** It is internally consistent and good for *ranking* and cross-athlete comparison; do not present its dumbbell-equivalents as a training prescription without validation.
4. **StrengthLevel data is self-reported.** Fine for barbell ratios (huge n, hard to fake convincingly at scale); useless for rare skills like OAP.
5. **Baar's protocol has biomarker-level evidence only** (PINP), not injury-outcome evidence. HSR (§2.2) has the stronger clinical evidence and should be the default tendon intervention in the app; collagen+vitC is an optional adjunct.
6. **Female-specific calisthenics data is nearly absent.** The 1.3–1.6× planche/OAP timeline multiplier is a judgement call, flagged tier D, and must be adaptive.
