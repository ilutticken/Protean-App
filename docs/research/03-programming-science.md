# 03 — Programming Science for a Combined Calisthenics + Weights Plan

**Purpose:** engineering reference for Protean's plan generator, progression engine, and readiness/deload logic.
**Date compiled:** 2026-08-01. **Audience:** the engineer encoding tables + algorithms.
**Convention:** every number below is intended to become a constant, threshold, or coefficient. Where evidence is thin, the row is tagged **[PRACTITIONER]** and should be exposed as a tunable config value, not hardcoded as "science".

Legend for confidence tags used throughout:
`[A]` = meta-analysis / systematic review in trained humans · `[B]` = individual RCTs or reviews with caveats · `[C]` = mechanistic or single-study · `[P]` = practitioner consensus only.

---

## 1. Progressive overload: models and the progression-CHAIN problem

### 1.1 The overload levers, ranked by resolution

Treat overload as an ordered ladder of increasingly coarse increments; finer levers first = fewer stalls.

| # | Lever | Typical increment | Granularity (% stimulus jump) | Applies to |
|---|-------|-------------------|-------------------------------|------------|
| 1 | Reps within tier | +1 rep on one set | ~2–4% | all slots |
| 2 | Reps across all sets | +1 rep every set | ~4–8% | all slots |
| 3 | Load (external) | +1–2.5 kg upper, +2.5–5 kg lower | ~2–5% | weighted slots |
| 4 | Load (micro) | +0.5–1.25 kg plates | ~1–2% | weighted upper body |
| 5 | Tempo / pause | +1 s pause, 3-1-3 tempo | ~5–10% | bodyweight slots, no load option |
| 6 | Leverage / ROM | deficit, elevation, band removal | ~5–15% | calisthenics |
| 7 | **Chain step** | next harder variation | **~15–40%** | Protean chain slots |
| 8 | Sets | +1 set | ~10% of slot volume | volume phase only |

**Key engineering consequence:** a chain step is the *coarsest* lever (15–40% jump), so it must be gated behind levers 1–6 or the athlete regresses on landing. Hence the **landing check** in §1.4.

### 1.2 Double progression — the canonical rule set

Double progression = fix load, add reps until you hit the top of the rep range across all sets, then add load and drop back to the bottom of the range. It is the default in practitioner literature because it self-regulates: [ExRx, n.d., https://exrx.net/WeightTraining/Research/LowVolumeTraining] `[P]`

Steven Low writes bodyweight slots as `3×5→12` — start at 3×5, build to 3×12, then move to the next variation [Low, *Overcoming Gravity* 2nd ed., https://stevenlow.org/overcoming-gravity/] `[P]`. The r/bodyweightfitness Recommended Routine uses a tighter band: 3×5–8, add ~1 rep/set/session, advance the progression at 3×8, and **if you cannot hit at least 3×5 on the new variation, back off for 1–2 weeks** [r/bodyweightfitness RR, https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb] `[P]`. That back-off condition is the practitioner version of the landing check.

### 1.3 Formalizing a Protean chain slot

A slot like `2 × 15/20/35: Weighted Pistol Squat > Pistol Squat > Weighted Lunge Walk > Lunge Walk` has two independent axes that the data model must separate:

```
Slot {
  sets: 2
  repTiers: [15, 20, 35]          // T1 (entry) < T2 (work) < T3 (exit)
  chain: [step0…stepN]            // index 0 = hardest, N = easiest
  currentStepIndex: int
  currentTierIndex: 0|1|2
  load: kg | null                 // null when the step has no load channel
}
```

**Canonical interpretation (recommend encoding this explicitly, it is ambiguous in the source routine):**
`T1` = minimum reps that qualify you to *stay* at this step. `T2` = the normal working target. `T3` = the *exit* threshold — hitting it means the step is too easy and you should move one index toward harder (lower index), or add load.

Two dispatch rules follow directly:

- **Steps that accept load** (`Weighted Pistol Squat`, `Weighted Lunge Walk`): the primary lever inside the step is **load**, and reps oscillate T1↔T2. You only leave the step when load progression is impossible/impractical.
- **Steps with no load channel** (`Pistol Squat`, `Lunge Walk`): the only lever is **reps**, so the tier ladder T1→T2→T3 runs to completion and then the chain step advances.

This resolves the "add reps vs add load vs advance chain" question deterministically. Full rules in §15.

### 1.4 Concrete auto-progression rules (implementable)

| Rule ID | Trigger | Action |
|---------|---------|--------|
| `R-REP` | All sets ≥ current tier target, RIR ≥ 1, form flag clean | +1 rep target on lowest-performing set next session |
| `R-TIER` | All sets hit tier target **for 2 consecutive sessions** of that slot | Advance `currentTierIndex` (T1→T2→T3) |
| `R-LOAD` | Loaded step, all sets hit T2 for 2 consecutive sessions | +2.5 kg lower body / +1.25 kg upper body; reset rep target to T1 |
| `R-STEP` | Unloaded step, all sets hit T3 for 2 consecutive sessions | `currentStepIndex -= 1` (harder); reset rep target to T1 |
| `R-LAND` | After `R-STEP`, first session on new step yields < T1 reps on ≥ half the sets | Revert one step, set target = T3, mark `chainAttemptCooldown = 14 days` |
| `R-STALL` | Same load × same reps for **3 consecutive sessions** of that slot | Deload slot: −10% load or −2 reps for 1 session, then resume |
| `R-REGRESS` | Best-set reps drop ≥ 20% vs 4-session rolling max, twice in a row | Auto-suggest easier chain step or slot deload; raise readiness flag |

**Why "2 consecutive sessions":** with a 5-day split each slot is trained ~1×/week, so 2 sessions ≈ 2 weeks of confirmation — enough to filter a single good-sleep day without wasting a mesocycle. For skill/GtG slots trained 4–6×/week, tighten to 2 sessions = ~3 days. **[P]** — no direct RCT compares confirmation windows; expose as config `confirmSessions` (default 2, range 1–3).

**Hybrid rule for loaded steps that also have a chain exit:** advance the chain step when *either* `R-STEP` fires *or* added load reaches a leverage-equivalence threshold (e.g. weighted pistol at +25% bodyweight ≈ ready for the harder step). Use bodyweight-percentage anchors, not absolute kg, so both athletes share one rule.

---

## 2. Periodization: what actually matters

| Finding | Number | Source |
|---|---|---|
| Periodized > non-periodized for 1RM | ES = **0.43** (95% CI 0.27–0.58, p<0.001), 81 ES from 18 studies, n>600 | [Williams et al., 2017, *Sports Med*, https://link.springer.com/article/10.1007/s40279-017-0734-y] `[A]` |
| Effect larger in **untrained** than trained | training status was a significant moderator | same `[A]` |
| Linear (LP) vs daily undulating (DUP) — hypertrophy | SMD = **−0.02** (95% CI −0.25 to 0.21, p=0.848), 13 studies | [Grgic et al., 2017, *PeerJ* 5:e3695, https://peerj.com/articles/3695.pdf] `[A]` |
| LP vs undulating — strength | no difference upper or lower body | [Harries et al., 2015 meta, https://pubmed.ncbi.nlm.nih.gov/25268290/] `[A]` |

**Decision for Protean:** do **not** build a periodization-model selector as a headline feature. The evidence says *having a structure* beats *having none* (ES 0.43), while *which* structure is a coin flip (SMD ≈ 0). Ship one structure — **undulating-by-day**, which the 5-day split already produces naturally (Legs = heavier/lower rep, Pull = mixed, Push = skill-biased, Full Body = higher rep/metabolic) — and spend engineering effort on autoregulation and volume management instead.

Practical block layering that is compatible with the existing split:

| Week | Intent | Set count vs baseline | RIR target | Chain-advance permitted? |
|------|--------|----------------------|------------|--------------------------|
| 1 | Reintroduction | 100% | 3 | yes |
| 2 | Accumulation | +1 set on 2 priority slots | 2 | yes |
| 3 | Accumulation | +1 more set on same slots | 1–2 | yes |
| 4 | Intensification / test | back to 100% sets | 0–1 on ≤2 slots | yes (test week) |
| 5 | **Deload** | 50% sets, ~70% load | 4–5 | no |

Cadence: 4:1 for intermediates; stretch to 5:1 or 6:1 if readiness metrics stay green (§8.3).

---

## 3. Volume dose-response

### 3.1 The headline numbers

| Finding | Number | Source |
|---|---|---|
| Linear dose-response, weekly sets → hypertrophy | ~**+0.37% muscle size per additional weekly set** | [Schoenfeld, Ogborn & Krieger, 2017, *J Sports Sci*, https://pubmed.ncbi.nlm.nih.gov/27433992/] `[A]` |
| Threshold for "high volume" benefit | **10+ weekly sets** per muscle > <10 | same `[A]` |
| Data sparse above | >10–12 weekly sets (2017 evidence base) | same `[A]` |
| Updated dose-response, 67 studies / 2,058 subjects | volume→hypertrophy and volume→strength both **P(slope>0) = 100%**, but **diminishing returns**, "considerably more pronounced" for strength | [Pelland, Remmert, Robinson, Hinson & Zourdos, 2026, *Sports Med*, https://pubmed.ncbi.nlm.nih.gov/41343037/] `[A]` |
| Per-session ceiling — hypertrophy | plateau ("point of undetectable outcome superiority") ≈ **11 fractional sets per muscle per session** | [Remmert et al., 2025, SportRxiv 537, https://sportrxiv.org/index.php/server/preprint/view/537] `[A]` |
| Per-session ceiling — strength | ≈ **2 direct sets per session** | same `[A]` |
| Set counting method | **fractional** = direct set counts 1.0, indirect set counts **0.5** | same `[A]` — *this is the counting rule Protean should implement* |

**Set-counting rule to encode:** every exercise gets a per-muscle contribution map. Bench-style push = 1.0 chest, 0.5 triceps, 0.5 front delt. Pull-up = 1.0 lats, 0.5 biceps. Pistol squat = 1.0 quads, 0.5 glutes. This "fractional" convention is what the strongest meta-regression used, so Protean's volume dashboard should match it or its numbers won't line up with the literature.

### 3.2 Practical volume landmarks per muscle per week

Israetel's MV/MEV/MAV/MRV framework is **[P]** (practitioner), but it is the only complete operational scheme and it broadly agrees with the meta-analytic data [RP Strength, https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth].

| Landmark | Weekly sets (fractional) | Meaning | Protean use |
|---|---|---|---|
| MV (maintenance) | **~6** | holds size/strength | floor during deload, injury, travel |
| MEV (min effective) | **8–12** | growth begins | week-1 starting volume |
| MAV (max adaptive) | **12–20** | best gain-per-set zone | weeks 2–4 target |
| MRV (max recoverable) | **18–25+** (highly individual) | recovery ceiling | hard cap; trigger deload on approach |
| Minimum effective dose (strength only) | **1 set × 6–12 reps @ 70–85% 1RM, 2–3×/wk** | measurable 1RM gain | "minimum day" fallback mode |

Sources for the last row: [Iversen et al., 2021, *Sports Med*, https://pubmed.ncbi.nlm.nih.gov/34527944/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC11127831/] `[A]`.

**Protean caps to hardcode:**
- Per session, per muscle: soft warn at **>10 fractional sets**, hard warn at **>13** (past the ~11-set plateau).
- Per week, per muscle: green 10–18, amber 19–24, red >24.
- Never let auto-progression add a set that pushes weekly volume above MRV without an explicit user override.

---

## 4. Frequency

| Finding | Number | Source |
|---|---|---|
| Frequency effect on hypertrophy when **volume equated** | not significant / negligible | [Schoenfeld, Grgic & Krieger, 2019, *J Sports Sci*, https://pubmed.ncbi.nlm.nih.gov/30558493/] `[A]` |
| Frequency when volume **not** equated | favors higher frequency (higher freq → more total volume) | same `[A]` |
| Frequency → strength | P(slope>0) = **100%**, higher frequency better, diminishing returns | [Pelland et al., 2026, https://pubmed.ncbi.nlm.nih.gov/41343037/] `[A]` |
| Practical floor | train each major muscle **≥2×/week** | [Schoenfeld et al., 2016, https://www.researchgate.net/publication/301578131] `[A]` |

**Consequence for the 5-day split:** the split already gives Legs 1× + Full Body 1× = 2×, Pull 1× + Full Body 1× = 2×, Push 1× + Full Body 1× = 2×. That satisfies the ≥2× floor exactly. Because frequency matters more for *strength* than hypertrophy, and stunts are strength/skill goals, **skill and straight-arm work should be lifted out of the 5-day split into 4–6×/week micro-doses** (§10) rather than adding a 6th training day.

---

## 5. Intensity zones and load-rep mapping

| Zone | %1RM | Reps | Primary adaptation | Protean slot types |
|---|---|---|---|---|
| Max strength | **85–100%** | 1–5 | neural, 1RM | 2×BW lift work, heavy weighted pull-up/dip |
| Strength-hypertrophy | **75–85%** | 6–10 | both | main compound slots |
| Hypertrophy | **60–80%** | 8–12 (up to 20 near failure) | size | accessory, chain mid-steps |
| Local endurance | **<60%** | 15+ | endurance, work capacity | the 15/20/35 high-rep tiers |

[Schoenfeld et al., 2021, *Sports* 9(2):32, https://www.mdpi.com/2075-4663/9/2/32] `[A]` — importantly this re-examination concludes hypertrophy is achievable across ~30–85% 1RM **provided sets approach failure**, but strength is load-specific. Relevant because the Protean routine's 15/20/35 tiers are low-load: they will build size and endurance fine, but the 2× bodyweight lift goal requires dedicated ≥85% work that must be added explicitly.

Reps-at-%1RM for **trained** lifters on compounds (use for 1RM estimation and load prescription):

| %1RM | 100 | 95 | 90 | 85 | 80 | 75 | 70 | 65 | 60 |
|---|---|---|---|---|---|---|---|---|---|
| Reps (trained) | 1 | 3 | 5 | 7 | 10 | 12 | 15 | 18 | 22 |

[NSCA Training Load Chart, https://www.nsca.com/contentassets/61d813865e264c6e852cadfe247eae52/nsca_training_load_chart.pdf; refined by Nuzzo et al., 2024 meta-regression, https://link.springer.com/article/10.1007/s40279-023-01937-7] `[A]`. Note the meta-regression found sex, age, training status and exercise all moderate this — so Protean should **learn per-user reps-at-load** rather than trusting the table after ~8 weeks of logged data.

---

## 6. Proximity to failure, RIR, autoregulation

### 6.1 The evidence

| Finding | Number | Source |
|---|---|---|
| Hypertrophy improves as sets are taken closer to failure | negative slope for RIR; CI excluded null | [Robinson, Pelland, Remmert et al., 2024, *Sports Med*, https://link.springer.com/article/10.1007/s40279-024-02069-2 (preprint 2023, https://sportrxiv.org/index.php/server/preprint/view/295)] `[A]` |
| Strength gains vs RIR | **negligible** — CI of marginal slope contained null across a wide RIR range | same `[A]` |
| Practical summary | "Strength gains were similar across a wide range of RIR; hypertrophy improves as sets terminate closer to failure" | same `[A]` |
| RIR-based RPE scale validity | RPE↔velocity r = **−0.88** (experienced), **−0.77** (novice) | [Zourdos et al., 2016, *JSCR*, https://pubmed.ncbi.nlm.nih.gov/26049792/] `[B]` |
| RIR prediction accuracy | ±**0.20** reps at RPE 9; ±**1.0** rep at RPE 6 | [Zourdos et al., 2019, *JSCR*, https://journals.lww.com/nsca-jscr/fulltext/2019/02000/efficacy_of_the_repetitions_in_reserve_based.5.aspx] `[B]` |
| RIR accuracy degrades | with higher rep counts / lower %1RM | same `[B]` |
| Velocity loss ≤25% | greater 1RM strength, less hypertrophy | [Jukic et al., 2023 meta, https://link.springer.com/article/10.1186/s40798-021-00404-9 and https://pmc.ncbi.nlm.nih.gov/articles/PMC8762534/] `[A]` |
| Velocity loss >25% | greater hypertrophy via more accumulated volume | same `[A]` |

### 6.2 RIR targets to prescribe by slot type

| Slot type | RIR target | Rationale |
|---|---|---|
| Skill practice (planche lean, handstand, OAP negatives) | **4–6** (≈50–70% of max hold/reps) | motor learning degrades under fatigue; §10 |
| Heavy strength (≥85% 1RM, 2×BW goal) | **2–3** | RIR has negligible effect on strength — no reason to grind `[A]` |
| Chain slots, mid rep tiers (T1/T2) | **1–2** | hypertrophy-relevant, sustainable |
| Chain slots, top rep tier (T3, 20–35 reps) | **0–1** | low load ⇒ must approach failure for hypertrophy `[A]` |
| Overcoming isometrics | n/a — max intent, fixed duration | §11 |
| Quasi-isometric 1-min holds | to holding failure or 1:00, whichever first | §11 |
| Deload week | **4–5** | §8 |

**Note the asymmetry that saves recovery budget:** because RIR is irrelevant to strength but relevant to hypertrophy, Protean should prescribe RIR 2–3 on everything heavy and reserve near-failure only for the low-load high-rep tiers where it's actually required.

---

## 7. Rest intervals

| Rest | Effect | Source |
|---|---|---|
| >60 s vs <60 s | small hypertrophy benefit for >60 s | [Bayesian meta, SportRxiv 395, https://sportrxiv.org/index.php/server/preprint/view/395] `[A]` |
| >90 s | no further detectable hypertrophy gain | same `[A]` |
| 3 min vs 1 min | 3 min significantly better for **strength** and hypertrophy | [Schoenfeld et al., 2016, https://pubmed.ncbi.nlm.nih.gov/26605807/] `[B]` |
| Steven Low bodyweight programming default | **3 min** between sets | [Low, *Overcoming Gravity*, https://stevenlow.org/overcoming-gravity/] `[P]` |

**Defaults to ship:**

| Slot type | Rest |
|---|---|
| Heavy compound / ≥85% 1RM | **180 s** |
| Chain slot, hard step, low reps | **150–180 s** |
| Chain slot, high-rep tier (20–35) | **90–120 s** |
| Accessory / isolation | **90 s** |
| Skill practice sets | **60–120 s** (recover fully, never fatigue) |
| Overcoming isometrics between angles | **60 s** |
| Tendon protocol isometrics | **120 s** (Baar, §12) |

---

## 8. Deload, detraining, retraining

### 8.1 What a deload is and does

Delphi consensus definition: "a period of reduced training stress designed to mitigate physiological and psychological fatigue, promote recovery, and enhance preparedness for the subsequent training cycle" [Bell et al., 2023/2025, https://shura.shu.ac.uk/35313/3/Bell-APracticalApproach(AM).pdf] `[B]`.

| Finding | Number | Source |
|---|---|---|
| 1-week **full-cessation** deload mid-9-week program | **negatively affected lower-body strength**; no effect on hypertrophy, power, or muscular endurance | [Coleman et al., 2024, *PeerJ* 12:e16777, https://peerj.com/articles/16777/] `[B]` |
| Short cessation | attenuates blunted anabolic signalling; re-sensitizes muscle to hypertrophic stimulus | same / [Bell et al.] `[C]` |
| 7–10 day detraining | ↓ muscle thickness, ↓ fibre CSA, ↓ fascicle length | [Bell et al., 2023] `[B]` |
| Retraining ("muscle memory") | retraining produced **larger** lean-mass increase than the original training block, even after mass returned to baseline | [Seaborne/Sharples line of work; see https://www.biorxiv.org/content/10.1101/2024.11.19.624068.full.pdf] `[C]` |

**Engineering consequence:** implement deload as **reduced volume at maintained intensity**, not rest. Concretely: **sets × 0.5, load × 0.90–0.95, RIR 4–5, zero chain advancement, keep skill practice at normal frequency but 50% volume.** Full cessation costs strength (`[B]` above) and is the wrong default.

### 8.2 Deload cadence

| Athlete state | Cadence | Note |
|---|---|---|
| Intermediate, 5 sessions/wk | **every 4–6 weeks** | default 5:1 |
| After a test week / 1RM attempt | week after | mandatory |
| Readiness triggers fired | immediate | §8.3 |
| Novice | 8–12 weeks or trigger-only | rarely fatigue-limited |

### 8.3 Deload triggers an app can actually compute

Do **not** build on ACWR alone — it has severe mathematical coupling problems, arbitrary windows, inconsistent meta-analytic results, and the one randomized trial testing it found no benefit [Impellizzeri et al., 2020, *Sports Med*, https://link.springer.com/article/10.1007/s40279-020-01280-1] `[A]`. Use it, if at all, as one weak input among several.

| Trigger | Threshold | Weight |
|---|---|---|
| **Performance drop** | best-set e1RM or rep-max down **≥5%** vs 4-session rolling max, on ≥2 distinct slots | 3 (strongest signal) |
| **Stall count** | ≥3 slots simultaneously in `R-STALL` | 3 |
| **Session RPE trend** | 7-day mean sRPE ↑ ≥15% while tonnage flat or down | 2 |
| **Subjective readiness** | 3+ consecutive days of sleep <6.5 h, or self-rated readiness ≤2/5 | 2 |
| **Joint/tendon pain flag** | any slot flagged pain ≥3/10 twice | 3 (also forces §12 protocol) |
| **Time since last deload** | ≥6 weeks | 1 |
| **Weekly volume** | any muscle >MRV for 2 consecutive weeks | 2 |
| **Acute:chronic tonnage** | 7-day / 28-day uncoupled ratio >1.5 | 1 (weak, advisory only) |

Fire a deload when **weighted score ≥5** in a rolling 7-day window. Session RPE (Foster's method: RPE × session duration in minutes) is cheap, validated, and the best low-cost internal-load metric [Haddad et al., 2017, *Front Neurosci*, https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/] `[A]`.

---

## 9. Concurrent training: does the Full Body / martial arts / running day interfere?

| Finding | Number | Source |
|---|---|---|
| Concurrent vs strength-only — **maximal strength** | SMD = **−0.06** (negligible), 43 studies | [Schumann et al., 2022, *Sports Med*, https://pubmed.ncbi.nlm.nih.gov/35476184/ / https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9474354/] `[A]` |
| Concurrent vs strength-only — **hypertrophy** | SMD = **−0.01** (negligible) | same `[A]` |
| **Explosive strength / power** (jump, sprint) | reduced ~**28%**, worst when same session | same `[A]` |
| Modality | **running** interferes more than cycling (esp. type I fibres) | same `[A]` |

**Rules to encode:**

1. Interference for the user's actual goals (max strength, hypertrophy, straight-arm skills) is **effectively zero**. Do not warn users about "cardio killing gains."
2. Power/plyometric/explosive goals (front flip, muscle-up, jump work in the acrobatics sector) **do** get hit. Protect them.
3. **Separation:** ≥6 h between endurance and strength when both fall on one day; ≥24 h ideally. If same session, **strength first** when strength is the priority.
4. **Order within the Full Body day:** skill → power/plyo → heavy strength → hypertrophy → conditioning/martial arts last.
5. Prefer **cycling / rowing / ski-erg** over running for conditioning that sits adjacent to leg day. If running is a stunt goal (marathon sector), accept the cost and schedule it ≥24 h from Legs.
6. Weekly cap for a hybrid athlete before flagging: **>3 h/wk hard endurance concurrent with 5 lifting days** → warn.

---

## 10. Skill acquisition for gymnastics stunts

The stunts (planche, one-arm pull-up, iron cross, handstand, front flip, pistol) are **skills first, strength second**. Programming implications:

| Principle | Number / rule | Source |
|---|---|---|
| Fatigue harms motor learning | fatigue induces long-lasting decrements in skill acquisition | [Branscheidt et al., https://www.biorxiv.org/content/10.1101/406520.full.pdf] `[C]` |
| Skill work goes **before** strength work | heavy fatigue is "very detrimental to coordination and technique" | [Shift Movement Science, https://shiftmovementscience.com/ultimategymnasticsstrengthguide/] `[P]` |
| Grease the Groove (GtG) | high frequency, **~50–70% of max effort**, never to failure, multiple short sets/day | [Tsatsouline, via https://www.artofmanliness.com/health-fitness/fitness/get-stronger-by-greasing-the-groove/] `[P]` |
| Frequency supports neural strength gains | higher frequency → larger strength gains in non-volume-equated comparisons | [Grgic et al., 2018, https://pubmed.ncbi.nlm.nih.gov/29470825/] `[A]` |
| Distributed practice > massed | splitting volume across sessions improved neuromuscular adaptation | [Häkkinen et al., 1988] `[C]` |
| Balance/handstand | daily, short, fresh; treat as a practice not a workout | `[P]` |

**Protean skill-work spec:**

| Parameter | Value |
|---|---|
| Placement in session | **immediately after warm-up, before all strength work** |
| Session skill block duration | **10–15 min** |
| Effort per set | **50–70% of max hold/reps** — stop at RIR 4–6 |
| Sets per skill per session | 3–6 |
| Hold duration per set | 5–15 s for static skills (stop before form breaks) |
| Frequency | **4–6×/week** for the 1–2 priority skills (GtG) |
| Number of concurrent priority skills | **≤2** — a documented cause of elbow tendinopathy is stacking 3 new straight-arm skills at once [https://gmb.io/planche/] `[P]` |
| Daily standalone GtG dose | 3–8 mini-sets spread over the day, each ≤50% max |
| Progression trigger | +2 s hold or +1 rep sustained for 3 consecutive practice days |

**Timeline expectation to display to users:** planche ≈ 6 months for exceptionally talented athletes, "years" typical [GMB, https://gmb.io/planche/] `[P]`. Set the skill-tree ETA model conservatively; overpromising is the main UX failure mode here.

---

## 11. Isometrics: overcoming, yielding, quasi-isometric

The Protean Routine already prescribes **4×7 s overcoming isometrics at 3 joint angles** and **1-min quasi-isometric holds** — both are well supported.

| Finding | Number | Source |
|---|---|---|
| Joint-angle specificity | strength gains greatest **at the trained angle**; transfer window commonly cited ~**±15–30°** | [Oranchuk et al., 2019, *Scand J Med Sci Sports*, https://pubmed.ncbi.nlm.nih.gov/30580468/] `[A]` |
| Hypertrophy & max force | substantial improvements **regardless of intensity** | same `[A]` |
| Tendon adaptation requires | **≥70% MVC** contractions | same `[A]` |
| Long muscle length | greater hypertrophy at equal volume + **better transfer to dynamic performance** | same `[A]` |
| Ballistic/max intent | greater neuromuscular activation and RFD | same `[A]` |
| Full-range strength | best when isometrics are **paired with dynamic work**, not replacing it | same `[A]` |
| Quasi-isometrics (EQI) | submaximal route to tendon morphology, work capacity, muscle thickness; best in early prep phases | [Oranchuk et al., 2019, *Strength Cond J* narrative review, https://www.researchgate.net/publication/333650783] `[B]` |
| Tendon CSA/stiffness drivers | high intensity (≥70% MVC) × **contraction duration** × long muscle length | [Oranchuk 2019] `[A]` |

**Overcoming vs yielding — which for what:**

| Type | Definition | Best for | Protean use |
|---|---|---|---|
| **Overcoming** (pushing) | push against immovable object, force builds to max | RFD, max intent, tendon stiffness, sticking-point strength | the 4×7 s × 3-angle prescription; sticking points in pull-up/dip/squat |
| **Yielding** (holding) | hold a load in position until failure | time-under-tension, tendon health, skill-specific (planche/lever holds ARE yielding isometrics) | skill holds, 1-min quasi-iso |
| **Quasi-isometric (EQI)** | hold until "holding failure", then resist slow eccentric | tendon morphology, work capacity, submaximal safety | the 1-min hold slots |

**Dose to encode (validated against the routine as written):**

| Protocol | Prescription | Notes |
|---|---|---|
| Overcoming isometrics | **4 × 7 s at 3 joint angles**, max intent, ~60 s rest between reps, 90 s between angles | 3 angles ≈ short/mid/long muscle length; total 84 s TUT per exercise. The routine's existing scheme is defensible as-is `[A]` |
| Angle selection | if only 2 angles are practical, choose **long muscle length + the sticking angle** | long-length bias has best transfer `[A]` |
| Quasi-isometric | **1 × 60 s** at long muscle length, or to holding failure, ~50–70% max | 2–3 sets max; very fatiguing `[B]` |
| Weekly frequency | 2–3×/week per joint; isometrics are additive to (not replacing) dynamic work | `[A]` |
| Loading | ≥70% MVC when tendon adaptation is the goal | below 70% still builds muscle but not tendon `[A]` |

---

## 12. Tendon and connective tissue — critical for planche/lever elbow prep

Tendons adapt on a **much slower clock than muscle** and become **refractory to loading within ~10 minutes**. This is the single most important asymmetry for a calisthenics app: the strength engine and the tendon engine need different scheduling logic.

| Finding | Number | Source |
|---|---|---|
| Engineered ligament refractoriness | tissue becomes refractory quickly; best trained with **<10 min activity + ~6 h rest** | [Baar, 2017, *Sports Med* 47(S1), https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5371618/] `[C]` |
| Collagen synthesis (PINP) | **15 g gelatin + ~200 mg vitamin C, 1 h pre-exercise → ~2× PINP** vs placebo | [Shaw, Baar et al., 2017, *AJCN*, discussed at https://tim.blog/2025/02/27/dr-keith-baar-transcript/] `[B]` |
| Hydrolyzed collagen alternative | **5 g hydrolyzed collagen + vitamin C, 30–60 min pre** | [Baar via Tim Ferriss transcript, 2025, https://tim.blog/2025/02/27/dr-keith-baar-transcript/] `[P]` |
| Isometric prescription (rehab) | **4 × 30 s holds, 2 min rest, ~10 min total**, force ramped over **3–5 s** (minimize jerk) | same `[P]` |
| Healthy-tissue variant | 10 s holds acceptable | same `[P]` |
| Session spacing | **6–8 h refractory**; can do **2×/day** | same `[C]/[P]` |
| Pain gate | keep pain **≤2/10** during and after | same `[P]` |
| Tendon stiffness/CSA timeline | meaningful change ≈ **8–12+ weeks**; 12 weeks is the standard anchor | [Achilles HSR trial, https://link.springer.com/article/10.1186/s40798-022-00545-5] `[B]` |
| 8 weeks may be insufficient | 8-wk protocol changed quadriceps but **not** patellar tendon shear modulus | [Sarto et al., 2018, *PLOS One*, https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0205782] `[B]` |
| Heavy Slow Resistance (HSR) canonical protocol | **3×/wk, ≥48 h apart, 12 weeks**; load ramps from 15RM (wk 1) to **6RM by wk 9–12**; tempo **3 s concentric / 3 s eccentric** | [Kongsgaard et al. / HSR literature, https://embodiaapp.com/blog/488-heavy-slow-resistance-training-for-tendinopathy-achilles-patellar-elbow] `[B]` |
| 12-wk HSR effect | ↑ collagen synthesis/turnover, ↑ CSA; **stiffness change not always detected** | same `[B]` |

**Protean "tendon prep" feature spec (recommend shipping this — it is the differentiator for a planche/lever app):**

```
TendonBlock {
  trigger: user selects any straight-arm skill (planche, front lever, iron cross,
           maltese) OR logs elbow/wrist/shoulder pain >= 2/10
  duration: 12 weeks minimum before "elite" straight-arm nodes unlock in the skill tree
  session: 4 x 30s isometric holds, 2 min rest, ramp force over 3-5 s, total <= 10 min
  intensity: 70%+ MVC for adaptation; drop to pain-free tension if symptomatic
  spacing: >= 6 h from other training and from the next tendon session; max 2/day
  nutrition prompt: 15 g gelatin (or 5 g hydrolyzed collagen) + 200 mg vitamin C,
                    30-60 min before the tendon session
  targets for straight-arm work: elbow extension isometric (bent-arm and straight-arm
                    angles), pronated/supinated wrist, biceps tendon at long length
}
```

**Progression-rate guard for straight-arm skills:** because tendon adapts on a 12-week clock while muscle/neural adapt in 2–4 weeks, cap straight-arm skill chain-step advancement to **no more than 1 step per 3 weeks**, regardless of what the rep/hold rules say. Elbow tendinopathy from stacking straight-arm progressions too fast is the best-documented failure mode in the practitioner literature [https://gmb.io/planche/, https://kbforum.dragondoor.com/threads/tendonitis-from-planche-levers-help.141753/] `[P]`.

---

## 13. Recovery: sleep, protein, stress, sex differences

### 13.1 Sleep

| Finding | Number | Source |
|---|---|---|
| Acute sleep loss definition | **≤6 h in any 24 h** | [Craven et al., 2022, *Sports Med*, https://link.springer.com/article/10.1007/s40279-022-01706-y] `[A]` |
| Effect on maximal strength | ES ≈ **−0.24 to −0.35** | same `[A]` |
| Effect on explosive power | ES ≈ **−0.46** | same `[A]` |
| Compound lifts hit hardest | bench, leg press, deadlift affected; isolated curl not | [Reilly & Percy, via GSSI, https://www.gssiweb.org/sports-science-exchange/article/sse-167-sleep-and-athletes] `[B]` |
| Sleep extension | faster sprints, better free-throw accuracy, ↑vigour, ↓fatigue | [Mah et al., via GSSI] `[B]` |

**Rule:** if logged sleep <6.5 h, auto-downgrade the day: −1 set per slot, RIR +1, no chain-advance attempts, no 1RM tests. Skill practice can proceed at reduced volume (it is low-fatigue) but power/plyo work should be dropped (ES −0.46).

### 13.2 Protein and energy

| Recommendation | Number | Source |
|---|---|---|
| Breakpoint for further FFM gain | **1.62 g/kg/day** (95% CI up to ~**2.2**) | [Morton et al., 2018, *BJSM*, https://pubmed.ncbi.nlm.nih.gov/28698222/] `[A]` |
| Practical range to prescribe | **1.6–2.2 g/kg/day** | same `[A]` |
| Effect of supplementation | +**2.49 kg** 1RM, +**0.30 kg** FFM | same `[A]` |
| More effective in | already resistance-trained individuals | same `[A]` |
| During energy deficit / very lean | push toward and past the upper bound (2.2–2.6 g/kg) | [Stronger by Science, protein review, https://www.strongerbyscience.com/protein-science/] `[P]` |
| Distribution | 3–5 feedings, ~0.4 g/kg per meal | `[P]` |

### 13.3 Sex differences (relevant: one male + one female athlete share the device)

| Finding | Direction | Source |
|---|---|---|
| Fatigability during multi-set work | **females fatigue less** across sets of bench press | [PeerJ 2025, https://peerj.com/articles/20542/] `[B]` |
| Mechanism | females **recover more during the rest intervals**, not slower fatigue within a set | same `[B]` |
| Between-set recovery | men lose more relative peak power/torque between sets | [https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8618037/] `[B]` |
| Post-session neuromuscular recovery | acute recovery may be **slower in males** | [https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6206044/] `[B]` |
| Volume tolerance | females may tolerate **greater upper-body volume** | [Eur J Appl Physiol 2024, https://link.springer.com/article/10.1007/s00421-024-05445-y] `[B]` |
| Overall RT adaptations | relative strength/size gains broadly similar between sexes | [Roberts et al., 2020 meta, https://www.researchgate.net/publication/340216433] `[A]` |

**Encoding recommendation:** do **not** ship different default programs by sex. Ship *identical* program logic with **per-athlete tunables** seeded slightly differently and then learned from logged data:

| Tunable | Male seed | Female seed | Basis |
|---|---|---|---|
| Upper-body weekly set ceiling (MRV) | 20 | **22** | volume tolerance `[B]` |
| Default rest, high-rep tiers | 120 s | **90 s** | between-set recovery `[B]` |
| Deload cadence default | 4:1 | **5:1** | slower male acute recovery `[B]` |
| Everything else | identical | identical | `[A]` |

Label these in the UI as *starting estimates that adapt*, not as sex rules. The effect sizes are modest and the honest framing is that individual variation exceeds sex variation.

---

## 14. Recommended weekly template — reconciling the Protean Routine with the evidence

Assumptions: 2 intermediate athletes, 5 training days, goals = stunts (skill+max strength) with hypertrophy as support.

| Day | Block order | Content | Sets | RIR | Notes |
|---|---|---|---|---|---|
| **1 — Legs** | Warm-up 8 min → Skill 12 min (pistol/balance) → Heavy → Chains → Iso | 1 heavy squat/hinge @85%+ (3×3–5); 3 chain slots @ 2×tiers; 1 overcoming iso set | 10–14 total | heavy 2–3, chains 1–2 | Run ≥24 h from any running |
| **2 — Pull** | Warm-up → Skill 15 min (front lever / OAP negatives) → Heavy → Chains → Tendon | 1 weighted pull-up @85% (3×3–5); 3 chain slots; **tendon iso block** for elbows | 11–15 | heavy 2–3, chains 1–2 | Straight-arm skill day |
| **3 — Warm-up & Mobility** | Full session | Mobility, handstand practice, low-intensity flow, optional Z2 cycling 20–30 min | ≤4 hard sets | 5+ | This is the recovery day — protect it |
| **4 — Push** | Warm-up → Skill 15 min (planche lean / HS press) → Heavy → Chains → Iso | 1 heavy dip/press @85% (3×3–5); 3 chain slots; overcoming iso 4×7 s ×3 angles | 11–15 | heavy 2–3, chains 1–2 | Straight-arm skill day |
| **5 — Full Body** | Warm-up → Skill → **Power/plyo** → Strength → Conditioning/martial arts **last** | Reduced-volume touch on all patterns + explosive work + conditioning | 8–12 | 2–3 | Power BEFORE conditioning (28% interference on power `[A]`) |
| **Daily (off-session)** | GtG micro-doses | 3–8 mini-sets of ≤2 priority skills @50–70% max, ≥6 h from tendon block | n/a | 4–6 | 5–10 min total |

**Resulting weekly volume check (fractional sets per muscle):** quads ~12–16, lats ~14–18, chest/front delt ~12–16, posterior chain ~10–14, triceps ~12–16, core ~10–14 — all inside MEV–MAV (§3.2), each muscle hit ≥2× (§4). ✅

**Deload cadence:** every 5th week by default (male 4:1, female 5:1 seeds), or immediately on trigger score ≥5 (§8.3). Deload = sets ×0.5, load ×0.9, RIR 4–5, skill frequency maintained at 50% volume, chain advancement disabled.

**Reconciliation notes / changes recommended to the routine as written:**

1. **Add explicit ≥85% 1RM work.** The 15/20/35 rep tiers sit at <60% 1RM (§5) — great for size/endurance, insufficient for the 2× bodyweight lift goals. One heavy triple/set-of-5 per day fixes this at negligible volume cost.
2. **Move skill work to the front of every session.** Currently implicit; make it a first-class block (§10).
3. **Cap concurrent straight-arm skills at 2** and rate-limit their chain advancement to 1 step / 3 weeks (§12).
4. **Keep the 4×7 s ×3-angle overcoming isometrics as written** — this matches the Oranchuk evidence well `[A]`.
5. **Keep 1-min quasi-isometrics but cap at 2–3 per session** — very high fatigue cost per set `[B]`.
6. **Add the 12-week tendon block** as a prerequisite gate on elite straight-arm skill-tree nodes.
7. **Put conditioning/martial arts at the end of Day 5**, and prefer cycling over running when it neighbours Legs.

---

## 15. Auto-progression + auto-deload rule set (pseudocode)

```
CONSTANTS
  CONFIRM_SESSIONS = 2      STALL_SESSIONS = 3      CHAIN_COOLDOWN_DAYS = 14
  LOAD_STEP_UPPER_KG = 1.25 LOAD_STEP_LOWER_KG = 2.5 SLOT_DELOAD_LOAD_MULT = 0.90
  DELOAD_SET_MULT = 0.50    DELOAD_LOAD_MULT = 0.90  DELOAD_RIR = 4
  DELOAD_SCORE_THRESH = 5   PERF_DROP_PCT = 0.05
  STRAIGHT_ARM_MIN_DAYS_BETWEEN_STEPS = 21
  MRV = perMuscleWeeklySetCeiling(athlete)   // seeded 20 (M) / 22 (F) upper, then learned

// ---------- per-slot progression, after each logged session ----------
function progressSlot(slot, session, history):
  if globalState.deloadActive: return slot                 // no advancement in deload

  if isStalled(history, STALL_SESSIONS):                   // R-STALL
      slot.load *= SLOT_DELOAD_LOAD_MULT
      slot.repTarget = max(slot.repTarget - 2, slot.repTiers[0]); return slot

  if bestSetReps(session) < 0.80 * rollingMax(history, 4)  // R-REGRESS
     and bestSetReps(prevSession(history)) < 0.80 * rollingMax(history, 4):
      readiness.addSignal(PERFORMANCE_DROP, weight=3); suggestEasierStep(slot); return slot

  qualifying = every(s in session.sets: s.reps >= slot.target(slot.tierIndex))
               and session.formFlag == CLEAN and session.painScore < 3
  if not qualifying: slot.consecutiveQualifying = 0; return slot

  slot.consecutiveQualifying += 1
  if slot.consecutiveQualifying < CONFIRM_SESSIONS: return slot
  slot.consecutiveQualifying = 0

  if slot.hasLoadChannel:                        // e.g. Weighted Pistol Squat
      if slot.tierIndex < 1: slot.tierIndex += 1                    // R-TIER: T1 -> T2
      else:
          slot.load += (slot.isUpperBody ? LOAD_STEP_UPPER_KG : LOAD_STEP_LOWER_KG)
          slot.tierIndex = 0                                        // R-LOAD, reset to T1
          if slot.load >= athlete.bodyweight * slot.chainExitBwPct: // leverage equivalence
              tryAdvanceChain(slot)
  else:                                          // e.g. bodyweight Pistol Squat
      if slot.tierIndex < 2: slot.tierIndex += 1                    // R-TIER: T1->T2->T3
      else: tryAdvanceChain(slot)                                   // R-STEP at T3
  return slot

function tryAdvanceChain(slot):
  if slot.currentStepIndex == 0 or now() < slot.chainCooldownUntil: return
  if slot.isStraightArm and
     daysSince(slot.lastStepChange) < STRAIGHT_ARM_MIN_DAYS_BETWEEN_STEPS: return  // S12
  slot.pendingStepIndex = slot.currentStepIndex - 1
  slot.state = TRIAL                             // landing check runs next session

function evaluateLanding(slot, session):         // R-LAND
  if count(s in session.sets: s.reps < slot.repTiers[0]) >= ceil(slot.sets / 2):
      slot.currentStepIndex += 1                 // revert to easier step
      slot.tierIndex = 2                         // sit at T3
      slot.chainCooldownUntil = now() + CHAIN_COOLDOWN_DAYS
  else:
      slot.currentStepIndex = slot.pendingStepIndex
      slot.tierIndex = 0; slot.lastStepChange = now()
  slot.state = NORMAL

// ---------- skill slots: different, low-fatigue rule ----------
function progressSkill(skill, session, athlete):
  if session.effortPct > 0.75: warn("skill work too hard - motor learning cost")
  skill.consecutiveGood = (session.holdSeconds >= skill.target
                           and session.formFlag == CLEAN) ? skill.consecutiveGood+1 : 0
  if skill.consecutiveGood >= 3:                 // 3 consecutive practice days
      skill.target += (skill.isStatic ? 2 /*sec*/ : 1 /*rep*/); skill.consecutiveGood = 0
  if countActive(athlete.prioritySkills) > 2:
      warn("cap concurrent priority straight-arm skills at 2 (tendinopathy risk)")

// ---------- volume governor, weekly ----------
function volumeGovernor(athlete, week):
  for muscle in MUSCLES:                         // fractional: direct=1.0, indirect=0.5
      v = fractionalWeeklySets(muscle, week)
      if   v > MRV[muscle]: readiness.addSignal(OVER_MRV, weight=2); blockSetAdditions(muscle)
      elif v < MEV[muscle]: suggestAddSet(muscle)                    // MEV = 8-12
  for session in week.sessions: for muscle in MUSCLES:
      if perSessionFractionalSets(session, muscle) > 13:
          warn("past ~11-set per-session plateau (Remmert 2025)")

// ---------- readiness / auto-deload ----------
function evaluateDeload(athlete, w7):
  score = 0
  if e1RMDropOnSlots(w7) >= PERF_DROP_PCT and slotsAffected >= 2:      score += 3
  if simultaneousStalledSlots(w7) >= 3:                               score += 3
  if anyPainFlag(w7, threshold=3, occurrences=2):                     score += 3
                                                    triggerTendonProtocol()
  if meanSessionRPE(w7) >= 1.15*meanSessionRPE(prev28d)
     and tonnage(w7) <= tonnage(prev7d):                              score += 2
  if consecutiveNightsBelow(6.5, 3) or selfReadiness <= 2:            score += 2
  if anyMuscleOverMRV(weeks=2):                                       score += 2
  if weeksSinceLastDeload() >= 6:                                     score += 1
  if uncoupledACWR(7, 28) > 1.5:                                      score += 1  // weak
  if score >= DELOAD_SCORE_THRESH or weeksSinceLastDeload() >= plannedCadence:
      startDeload(athlete)

function startDeload(athlete):
  globalState.deloadActive = true; globalState.deloadEndsAt = now() + 7 days
  for slot in athlete.slots:
      slot.deloadSets = ceil(slot.sets * DELOAD_SET_MULT)   // volume down
      slot.deloadLoad = slot.load * DELOAD_LOAD_MULT        // intensity mostly kept
      slot.deloadRIR  = DELOAD_RIR
  // DO NOT stop training: full cessation costs lower-body strength (PeerJ 2024)
  athlete.skillFrequency = unchanged; athlete.skillVolume = 0.5 * normal
  disableChainAdvancement(); disable1RMTesting()

// ---------- daily readiness modifier ----------
function applyDailyModifier(session, athlete):
  if athlete.sleepLastNight < 6.5:               // acute sleep loss = <=6h/24h
      session.setsPerSlot -= 1; session.rirTarget += 1
      session.allowChainAdvance = false
      session.dropPowerWork = true               // power ES -0.46 under sleep loss
  if athlete.selfReadiness <= 2: session.loadMult = 0.90
```

---

## 16. Evidence quality summary and open questions

| Claim class | Confidence | Notes for the engineer |
|---|---|---|
| Volume dose-response w/ diminishing returns; fractional set counting | `[A]` strong | Pelland 2026 is the best available evidence |
| ~11 fractional sets/session hypertrophy plateau | `[A]` but new (2025) | Single meta-regression; treat as soft warn |
| RIR irrelevant to strength, relevant to hypertrophy | `[A]` strong | Biggest lever for recovery budgeting |
| Periodization model choice | `[A]` — null result | Don't over-engineer; structure > model |
| Frequency ≥2×/wk floor | `[A]` strong | Split already satisfies |
| Interference ≈0 for strength/size, ~28% for power | `[A]` strong | Order matters only for power |
| Isometric angle specificity, ≥70% MVC for tendon | `[A]` | 4×7 s ×3 angles is well justified as written |
| Baar 10-min / 6-h refractory tendon protocol | `[C]`+`[P]` | Engineered-ligament data, not human RCT — make dose configurable |
| Gelatin + vit C → 2× PINP | `[B]` | PINP is a synthesis marker, not proven tendon strength |
| MEV/MAV/MRV numbers | `[P]` | Practitioner framework; expose as editable |
| Sex-difference tunables | `[B]` modest | Adaptive starting estimates, not rules |
| "2 consecutive sessions to advance" | `[P]` | No RCT on confirmation windows; config `confirmSessions` |
| ACWR | `[A]` — largely negative | Advisory weight 1 only, or omit |

**Open questions for v2:**
1. Confirm the T1/T2/T3 rep-tier interpretation (§1.3) matches the routine author's intent before shipping — it is the load-bearing assumption of the whole progression engine.
2. Per-user reps-at-%1RM curves diverge substantially from the NSCA table `[A]`; collect from session 1 and switch to learned values at ~8 weeks.
3. Skill-tree ETAs for straight-arm skills: hold-seconds vs a leverage-adjusted torque proxy. The latter is more physically principled and lets one model serve both athletes despite different heights/limb lengths.
