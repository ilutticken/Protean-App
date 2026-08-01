# 04 — Assessing & Scoring Fitness Across Movement Planes and Domains

Research reference for Protean's assessment engine. Written 2026-08-01. Every table is intended to be encoded as data; formulas are code-ready. Confidence flags: **[peer-reviewed]**, **[practitioner]** (norm tables from testing/coaching sites where no published norm exists), **[reverse-engineered]**.

---

## 1. Taxonomy: planes vs movement patterns

**Anatomical planes** (sagittal = flexion/extension, frontal = ab/adduction & lateral flexion, transverse = rotation) describe joint kinematics, not training stimulus. Nearly all gym strength work is sagittal-dominant, so a plane-based radar would be degenerate (one huge axis, two empty ones).

**Movement patterns** (squat, hinge, lunge, horizontal/vertical push, horizontal/vertical pull, rotation/anti-rotation, carry, locomotion) are the standard program-design taxonomy [Garage Gym Reviews, 2024, https://www.garagegymreviews.com/fundamental-movement-patterns; BarBend, 2024, https://barbend.com/fundamental-movement-patterns/] and map 1:1 onto exercises and onto Symmetric-Strength-style scoring categories.

**Recommendation: score PATTERNS as the primary key; store PLANE as a metadata tag per exercise** used only for (a) a "plane coverage" audit warning (e.g., "no frontal/transverse work this month") and (b) mobility test interpretation.

### 1.1 Pattern set for the app (9 patterns)

| ID | Pattern | Barbell reference lift | Calisthenics reference |
|----|---------|------------------------|------------------------|
| HPUSH | Horizontal push | Bench press | Push-up → planche chain |
| VPUSH | Vertical push | Overhead press | Pike PU → HSPU; dips (down-vertical) |
| HPULL | Horizontal pull | Barbell row | Row → front-lever row |
| VPULL | Vertical pull | Weighted pull-up | Pull-up → one-arm pull-up |
| SQUAT | Knee-dominant bilateral | Back squat | — |
| LUNGE | Knee-dominant unilateral | Walking lunge | Pistol/shrimp chain |
| HINGE | Hip-dominant | Deadlift/RDL | Nordic curl, back lever, bridge |
| CORE | Rotation + anti-rotation/extension/lateral-flexion | Landmine rotation | L-sit, dragon flag, human flag |
| LOCO | Carry + locomotion | Farmer carry | Running, swimming, crawling |

### 1.2 Mapping: Protean Routine slots + hex-chart sectors → pattern + primary plane

| Exercise family (Routine slot / hex sector) | Pattern | Primary plane | Notes |
|---|---|---|---|
| Weighted pistol > pistol > weighted lunge > lunge | LUNGE | Sagittal (frontal-plane stability demand) | Unilateral; feeds L/R symmetry check |
| Back/front squat family, squat-family hex sector | SQUAT | Sagittal | |
| Deadlift/RDL, hip thrust; "posterior legs" hex sector (Nordic, glute-ham) | HINGE | Sagittal | Nordic = knee-flexion hinge; counts toward H:Q balance |
| "Back chain" hex sector (back lever, bridge, reverse hyper) | HINGE | Sagittal | Spinal-extension subtag |
| Push-up hex sector; pseudo-planche PU > planche chain | HPUSH | Sagittal | Planche is HPUSH + straight-arm skill tag |
| Dips | VPUSH | Sagittal | Downward-vertical push |
| Pike PU > wall HSPU > HSPU; handstand | VPUSH | Sagittal | Handstand also feeds Skill/Balance domain |
| Pull-up > weighted pull-up > archer > OAP; muscle-up | VPULL | Frontal (adduction) / sagittal mix | |
| Rows, front-lever chain | HPULL | Sagittal (shoulder extension) | Front lever also CORE anti-extension |
| L-sit, hollow, dragon flag | CORE (anti-extension) | Sagittal | |
| Human flag, side plank, Copenhagen | CORE (anti-lateral-flexion) | Frontal | |
| Pallof, landmine/twist work, throws | CORE (rotation/anti-rotation) | Transverse | Only transverse-plane loading in the routine — audit target |
| Carries | LOCO (carry) | Frontal stabilization | Also grip |
| Running/swimming/martial arts hex sector | LOCO | Mixed | Feeds Aerobic domain |
| Balance/acrobatics hex sector (handstand, flips, rolls) | — | Multi | Scored in Skill/Balance domain, not a strength pattern |
| Overcoming isometrics (4×7 s @ 3 joint angles) | inherit parent lift's pattern | — | Modality tag `iso_overcoming`; log angle |
| 1-min quasi-isometric holds | inherit parent pattern | — | Modality tag `qi_hold`; feeds Strength-Endurance |

---

## 2. Domain model: the radar axes

Distinct trainable qualities with low inter-correlation justify separate axes. **Recommended 7-axis radar** (hex-chart precedent is 9 *body-region* sectors — keep those for the skill tree; the radar is *qualities*, a different cut):

| Axis | Definition | Primary inputs |
|---|---|---|
| 1. Maximal strength | Best e1RM per pattern, absolute | Lift log e1RMs |
| 2. Relative strength | e1RM ÷ BW^0.67 (allometric), and BW-skill milestones | Same + bodyweight; pull-up/dip/pistol chains |
| 3. Explosive power | Jump/throw output | Vertical jump, broad jump |
| 4. Strength-endurance | Max-rep and timed-hold capacity | Push-up max, pull-up max, plank, wall sit, dead hang, QI holds |
| 5. Skill & balance | Neuromotor control | Handstand hold, SL balance eyes-closed, skill-tree node level in balance sector |
| 6. Mobility | Range of motion | Sit-and-reach + (later) shoulder/hip screens |
| 7. Aerobic capacity | VO2max estimate | Cooper 12-min or beep test |

Grip can be axis 8 or folded into Strength-Endurance (dead hang) + Max Strength (dynamometer); recommend folding to keep the radar readable at 7 spokes.

---

## 3. Field tests + normative data (encode as lookup tables)

All category tables below use adult norms; store per age-bracket where given. Where a single bracket is shown, apply the app's age adjustment (§4.5).

### 3.1 Push-up max reps (strict full push-ups, no pause; ACSM/CSEP protocol) **[peer-reviewed protocol, published norms]**

Men [TrainRBoost ACSM norms, 2026, https://trainrboost.com/tools/push-up-test; Topendsports, https://www.topendsports.com/testing/tests/home-pushup.htm]:

| Age | Needs work | Fair | Good | Excellent | Superior |
|-----|-----|------|------|-----------|----------|
| 20–29 | ≤16 | 17–21 | 22–28 | 29–35 | ≥36 |
| 30–39 | ≤11 | 12–16 | 17–21 | 22–29 | ≥30 |
| 40–49 | ≤9 | 10–12 | 13–16 | 17–24 | ≥25 |
| 50–59 | ≤6 | 7–9 | 10–12 | 13–20 | ≥21 |

Women (full push-ups):

| Age | Needs work | Fair | Good | Excellent | Superior |
|-----|-----|------|------|-----------|----------|
| 20–29 | ≤9 | 10–14 | 15–20 | 21–29 | ≥30 |
| 30–39 | ≤7 | 8–12 | 13–19 | 20–26 | ≥27 |
| 35–39 (alt src) | <11 | 11–14 | 15–20 | 21–27 | ≥28 |

Caveat: classic ACSM female norms were collected on *modified* (knee) push-ups (~30% less resistance); full-push-up female college norms exist [Univ. study, 2022, https://pmc.ncbi.nlm.nih.gov/articles/PMC9362895/]. Flag which variant was tested.

### 3.2 Pull-up max reps (strict, dead-hang start) **[practitioner — strengthlevel.com user data]**

| Level (≈ percentile) | Men | Women |
|---|-----|-------|
| Untrained (≈5th) | 0–1 | 0 |
| Beginner (≈20th) | 2–3 | 0–1 |
| Intermediate (≈50th of lifters) | 8–13 | 4–6 |
| Advanced (≈80th) | 15–20 | 8–10 |
| Elite (≈95th) | ≥25 | ≥15 |

[Strength Level, 2026, https://strengthlevel.com/strength-standards/pull-ups/kg; Marathon Handbook, 2025, https://marathonhandbook.com/how-many-pull-ups-should-i-be-able-to-do/]. Note: strengthlevel "average lifter" = 13 (M) / 6 (F) — a *trained* population, not general public.

### 3.3 Plank hold (forearm plank, strict hips) **[peer-reviewed collegiate norms + practitioner]**

Collegiate athletes 18–25 [Norms for an Isometric Muscle Endurance Test, J. Hum. Kinet., https://www.researchgate.net/publication/264009153]: Men p25/p50/p75 = 84/110/135 s; Women = 73.5/95/122.5 s.

App categories (s): Poor <30, Fair 30–60, Average 60–110 (M) / 60–95 (F), Good 110–180 (M) / 95–150 (F), Excellent >180/150. General-population median ≈110 s (M), 72 s (F) [Topendsports plank, https://www.topendsports.com/testing/tests/plank.htm].

### 3.4 Dead hang (two-arm, straight arms) **[practitioner only — no published norms]**

| Category | Men (s) | Women (s) |
|---|---|---|
| Poor | <20 | <15 |
| Below avg | 20–39 | 15–27 |
| Median | 40 | 28 |
| Top 25% | ≥60 | ≥45 |
| Excellent | ≥90 | ≥70 |

[deadhangs.com, 2025, https://deadhangs.com/dead-hang-time-by-age/; Marathon Handbook, https://marathonhandbook.com/good-hang-time/]. Ages 20–39 typical range: M 45–75 s, W 30–50 s; subtract ~10–15 s per decade after 35.

### 3.5 Wall sit (90° hips/knees) **[practitioner]**

Two-leg: M avg 50–75 s, W 35–45 s [MAT Assessment, https://www.matassessment.com/blog/wall-sit]. Single-leg: M good 75–100 s, excellent >100 s; W good 45–60 s, excellent >60 s [Topendsports, https://www.topendsports.com/testing/tests/wall-sit.htm]. Two-leg app anchors (s): Poor <30, Fair 30–50, Good 50–75 (M) / 35–60 (F), Excellent >120 (M) / >100 (F).

### 3.6 Vertical jump (countermovement, arm swing) **[practitioner compilations of published data]**

General adult (cm) [Topendsports, https://www.topendsports.com/testing/norms/vertical-jump.htm]:

| Category | Men | Women |
|---|---|---|
| Very poor | <31 | <21 |
| Below avg | 31–40 | 21–30 |
| Average | 41–50 | 31–40 |
| Above avg | 51–60 | 41–50 |
| Very good | 61–70 | 51–60 |
| Excellent | >70 | >60 |

Age-graded (ACE): M 20–29 good 48–53, very good 54–57, excellent ≥58; M 30–39 good 40–45, excellent ≥52. W 20–29 good 29–33, excellent ≥38; W 30–39 good 28–31, excellent ≥36 [Marathon Handbook, https://marathonhandbook.com/average-vertical-jump/]. Peak power estimate (Sayers): **P(W) = 60.7×jump_cm + 45.3×mass_kg − 2055**.

### 3.7 Standing broad jump (cm) **[practitioner/NSCA compilation]**

| Category | Men 20–29 | Women 20–29 |
|---|---|---|
| Below avg | <191 | <146 |
| Average | 191–220 | 146–175 |
| Good | 221–240 | 176–195 |
| Excellent | ≥241 | ≥196 |

[Topendsports, https://www.topendsports.com/testing/tests/longjump.htm; Marathon Handbook, https://marathonhandbook.com/average-broad-jump/]. Untrained means: M 180–215, W 120–150.

### 3.8 Grip dynamometer (kg, dominant hand, Jamar-style, seated elbow 90°) **[peer-reviewed]**

US norms [JOSPT 2018, https://www.jospt.org/doi/10.2519/jospt.2018.7851; UK 12-study pooling, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4256164/]:

| Group | p25 | p50 | p75 |
|---|---|---|---|
| Men 25–34 | ~44 | ~50 | ~56 |
| Women 25–34 | ~25 | ~30 | ~34 |

Peak median: M 51 kg (age 29–39), W 31 kg (26–42). Clinical weakness cutoffs (EWGSOP2 sarcopenia): **M <27 kg, F <16 kg**. App categories: Poor <p10, Fair p10–25, Average p25–75, Good p75–90, Excellent >p90 (store full percentile curve when we digitize JOSPT tables).

### 3.9 Sit-and-reach (box, footline = 26 cm ACSM convention) **[published norms]**

| Category | Men (cm) | Women (cm) |
|---|---|---|
| Poor | <15 | <22 |
| Below avg | 15–23 | 22–30 |
| Average (median, age 30–34) | 24 | 31 |
| Above avg | 25–33 | 32–39 |
| Excellent | >33 (>36 = elite) | >39 |

[FitnessNorms, https://fitnessnorms.com/flexibility/sit-and-reach/; Topendsports, https://www.topendsports.com/testing/norms/sit-and-reach.htm]. Record box convention with each result; scores differ by 26 cm between "toes=0" and "toes=26" protocols.

### 3.10 Aerobic: Cooper 12-min run and 20 m beep test **[peer-reviewed formulas]**

- **Cooper: VO2max (ml/kg/min) = (distance_m − 504.9) / 44.73** (r≈0.90 vs lab) [Topendsports, https://www.topendsports.com/testing/tests/cooper.htm]
- **Beep test (Léger 1988, adults): VO2max = 5.857 × speed_kmh − 19.458** (r=0.84, SEE 5.4), where speed_kmh = 8.0 + 0.5 × level (level 1 = 8.5 km/h) [Léger et al., Eur J Appl Physiol 1988, https://link.springer.com/article/10.1007/BF00428958]

Cooper distance norms 20–29 (m): M poor <1600, below 1600–2199, avg 2200–2399, above 2400–2800, excellent >2800; W poor <1500, below 1500–1799, avg 1800–2199, above 2200–2700, excellent >2700 [Topendsports, https://www.topendsports.com/testing/norms/cooper-12minute.htm].

VO2max categories (ml/kg/min), age 20–29: M poor <33, avg 37–43, good 44–48, excellent ≥49; W poor <28, avg 31–36, good 37–40, excellent ≥41. Age 30–39: shift bands down ~2–3 units.

### 3.11 Single-leg balance, eyes closed (arms free, hold non-stance foot off floor; cap 45 s) **[peer-reviewed]**

Springer et al. 2007 (n=549, gender-independent) [PubMed, https://pubmed.ncbi.nlm.nih.gov/19839175/; SRALab, https://www.sralab.org/rehabilitation-measures/timed-unipedal-stance-test-single-leg-support-one-leg-stance-test]: eyes-closed mean for 18–39 = **13.1 s**; steep age decline; eyes-open 18–39 ≈ 43 s (near ceiling). App anchors (eyes closed, adults <40): Poor <5, Fair 5–12, Average 13–19, Good 20–30, Excellent >30 (20+ s = strong for active adults [MAT Assessment, https://www.matassessment.com/blog/single-leg-balance-eyes-closed]). <5 s in any adult = fall-risk-level flag.

---

## 4. Scoring math

### 4.1 e1RM from rep records

Use **Wathan** (most accurate ≤10 reps; what Symmetric Strength uses): `e1RM = 100·w / (48.8 + 53.8·e^(−0.075·r))`. Alternatives: Epley `w·(1+r/30)`, Brzycki `w·36/(37−r)`. **Reject r > 10** for e1RM math — formulas break down [Symmetric Strength, https://symmetricstrength.com/about]. Protean's 15/20/35-rep tiers therefore must NOT be converted to e1RM; treat chain-tier position as an ordinal skill level and use the strength-endurance axis for those rep counts.

Bodyweight-exercise external load (for e1RM of weighted calisthenics): effective load = c·BW + added, with c ≈ **0.64 push-up (0.49 knee push-up)** [Ebben 2011], **~0.96 pull-up/dip** (BW minus forearms). Pistol ≈ BW·0.85 + added on one leg.

### 4.2 Raw result → 0–100 domain score

Three options:
1. **Percentile lookup** — best when a full percentile curve exists (grip, strengthlevel lifts). Score = percentile.
2. **Z-score** — `score = clamp(50 + 16.67·z, 0, 100)` with z from sex/age mean & SD. Only where mean+SD published (plank collegiate, balance).
3. **Criterion anchors + piecewise-linear interpolation** — the workhorse; encodes the category tables above.

**Recommended: (3) everywhere, with anchor scores:** Untrained/Poor=10, Fair/Beginner=25, Average/Novice=45, Good/Intermediate=60, Very good/Advanced=80, Excellent/Elite=92, World-class=100.

```
score(x) = s_i + (x − a_i)/(a_{i+1} − a_i) · (s_{i+1} − s_i)   for a_i ≤ x < a_{i+1}, clamped [0,100]
```
where (a_i, s_i) are that test's sex- and age-specific anchor values from §3. This makes every test land on the same interpretable scale and matches strengthlevel's tier≈percentile mapping (beginner≈5th, novice≈20th, intermediate≈50th, advanced≈80th, elite≈95th percentile of lifters) [Stronger, 2026, https://www.strongermobileapp.com/blog/strength-standards].

### 4.3 Pattern scores from lifts

For each pattern: score every mapped lift's e1RM via §4.2 anchors (BW-multiple anchors below), then `patternScore = max(best lift score, 0.7·best + 0.3·second-best)` — max rewards the specialist lift; the blend damps single-lift outliers. Approximate BW-multiple anchors (e1RM ÷ BW) **[practitioner — strengthlevel.com]**:

| Lift | Sex | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|
| Back squat | M | 0.75 | 1.25 | 1.50 | 2.00 | 2.50 |
| | F | 0.50 | 0.75 | 1.00 | 1.50 | 2.00 |
| Deadlift | M | 1.00 | 1.50 | 2.00 | 2.50 | 3.00 |
| | F | 0.50 | 1.00 | 1.25 | 1.75 | 2.25 |
| Bench press | M | 0.50 | 0.75 | 1.00 | 1.50 | 2.00 |
| | F | 0.25 | 0.50 | 0.75 | 1.00 | 1.40 |
| Overhead press | M | 0.35 | 0.55 | 0.80 | 1.10 | 1.40 |
| | F | 0.20 | 0.35 | 0.50 | 0.75 | 1.00 |
| Weighted pull-up (added/BW) | M | 0 (1 rep) | 0.15 | 0.35 | 0.65 | 1.00 |
| | F | 0 (assisted) | 0 (1 rep) | 0.15 | 0.40 | 0.70 |

(2×BW squat/deadlift = the app's "stunt" threshold = Advanced M / Elite F — consistent with the skill-tree elite tier.)

### 4.4 Cross-user fairness (M vs F, different size) — allometric normalization

- **Within one user over time:** allometric index `AI = e1RM / BW^0.67` removes body-size drift [JSCR rugby scaling studies, https://pubmed.ncbi.nlm.nih.gov/19967595/, https://pubmed.ncbi.nlm.nih.gov/21701284/]. Theoretical exponent 0.67; empirically 0.33–0.64 by lift, so 0.67 is a defensible single default.
- **Between the two users:** do NOT compare allometric indices directly across sexes — sex differences exceed size differences. Instead score each athlete against their **own sex+age anchor tables (§3, §4.3) and plot the resulting 0–100 scores on the shared radar.** The radar then reads "performance relative to your reference population," which is directly comparable and is exactly the Symmetric Strength / Wilks approach.
- If a single cross-sex coefficient is ever wanted, use **DOTS** or **Wilks-2 (2020)**: `points = total_kg · 600 / (a + b·bw + c·bw² + d·bw³ + e·bw⁴ + f·bw⁵)` with published sex-specific coefficients (Wilks-2 M: a=47.46178854, b=8.472061379, c=0.07369410346, d=−0.001395833811, e=7.07665973×10⁻⁶, f=−1.20804336×10⁻⁸; F: a=−125.4255398, b=13.71219419, c=−0.03307250631, d=−0.001050400051, e=9.38773881×10⁻⁶, f=−2.33346139×10⁻⁸) [Wikipedia/IPF report, https://en.wikipedia.org/wiki/Wilks_coefficient; https://www.powerlifting.sport/fileadmin/ipf/data/ipf-formula/Models_Evaluation-I-2020.pdf].

### 4.5 Age adjustment

Only if a user is <23 or >40 (Symmetric Strength precedent): multiply strength scores by Foster (youth) / McCulloch (masters) coefficients; both are published lookup tables (≈+1%/yr past 40, e.g., McCulloch(50)≈1.10). For the two current users (presumably 20s–30s), ship without age adjustment and add tables later.

### 4.6 Symmetry & balance ratios (flag engine)

| Ratio | Healthy target | Flag if | Evidence |
|---|---|---|---|
| Squat : Deadlift (e1RM) | M 0.83–0.90, F 0.80–0.88 (mean M 87%, F 84%) | <0.75 or >1.00 | [Symmetric Strength, https://symmetricstrength.com/about] **[reverse-engineered]** |
| Bench : Deadlift | M ~0.65, F ~0.57 | ±0.12 from target | same |
| Bench : Row (HPUSH:HPULL) | 1.0–1.1 : 1 | row e1RM <85% bench | **[practitioner consensus]** |
| OHP : Bench | 0.60–0.68 | <0.55 | **[practitioner]** |
| Pull-up(+BW) : Dip(+BW) | 0.85–1.05 | <0.80 | **[practitioner]** |
| Hamstring : Quad (H:Q conventional) | ≥0.60 (functional Hecc:Qcon ≥1.0) | <0.60 → injury-risk flag (up to 4.7× muscle-injury risk) | [Prehab Guys, https://theprehabguys.com/hamstring-to-quadriceps-strength-ratio/; Brazilian Serie A study, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10140913/] **[peer-reviewed]** — proxy in-app: Nordic tier + RDL vs squat pattern scores |
| Left : Right (unilateral tests: pistol tier, SL wall sit, SL balance, grip) | LSI ≥0.90 | <0.90 warn; <0.85 act | standard limb-symmetry-index threshold **[peer-reviewed convention]** |
| Push : Pull weekly volume | 1 : 1 (sets) | <0.8 either way | **[practitioner]** |

### 4.7 Composite radar + symmetry score

- Domain axis value = weighted mean of its component 0–100 scores (recency-weight: half-life 60 days; confidence = n tests logged).
- Overall score (Symmetric Strength style): mean of the 5 strength-pattern scores (SQUAT, HINGE, VPULL, HPUSH, VPUSH) [https://symmetricstrength.com/about].
- Symmetry score = `100 − k·stdev(pattern scores)`; SymStr's "100 = all lifts at same level"; suggest k=2.5 so a 10-point spread → 75.

---

## 5. How Symmetric Strength & Strength Level do it **[reverse-engineered]**

**Symmetric Strength** [https://symmetricstrength.com/about]: per-lift score = ¼ of hypothetical-Wilks for that lift scaled so ~100 = near-natural-limit (5–10 yr training) and 75 = "strong" (2–3 yr); sex/BW handled by Wilks-like curve (women score higher for same absolute numbers); age via Foster/McCulloch only outside 23–40; overall = average of best score in each of 5 categories (squat, floor pull, pull-up, horizontal press, vertical press); expected inter-lift ratios derived from PL/WL records (squat=87%M/84%F of deadlift; bench=65%M/57%F); muscle-group radar = weighted average of lifts involving that muscle; e1RM via Wathan capped at 10 reps; symmetry score = deviation of each lift from the user's own average level (100 = perfectly even, negative possible).

**Strength Level** [https://strengthlevel.com; https://www.strongermobileapp.com/blog/strength-standards]: empirical percentiles from 150M+ user lifts binned by sex × bodyweight (× age); tiers ≈ percentiles (beg 5 / nov 20 / int 50 / adv 80 / elite 95); lighter lifters held to higher BW-multiples (implicit allometry). Their Symmetry Calculator compares each lift's percentile against the user's median percentile — same idea as SymStr with data-driven curves.

**Adopt:** percentile-anchor scoring (§4.2), 5-pattern overall average, Wathan ≤10 reps, sex-specific anchors, SymStr ratio targets for the flag engine.

---

## 6. Minimal test battery (the "Protean Combine")

8 tests, ~2 sessions, covering all 7 axes:

| # | Test | Domain(s) | Session | Equipment |
|---|---|---|---|---|
| 1 | AMRAP (3–5 rep) weighted pistol or back squat → Wathan e1RM | Max/relative strength (SQUAT/LUNGE) + L/R | A | rack or DBs |
| 2 | AMRAP RDL/deadlift → e1RM | Max strength (HINGE) | A | bar |
| 3 | Weighted pull-up AMRAP → e1RM; then max strict BW reps | Max + endurance (VPULL) | A | belt |
| 4 | Weighted dip (or bench) AMRAP → e1RM | Max strength (PUSH) | A | belt |
| 5 | Standing broad jump (best of 3) | Power | B | tape only |
| 6 | Max push-ups (1 set) + plank max | Strength-endurance | B | none |
| 7 | Dead hang max (or dynamometer) | Grip/endurance | B | bar |
| 8 | Cooper 12-min run | Aerobic | B (end) | track/GPS |
| +5 min | Sit-and-reach; SL balance eyes-closed (both legs); handstand max hold | Mobility; Skill/Balance | B | box |

**Retest cadence: every 6–8 weeks** (end of each mesocycle), alternating A/B weeks. Rationale: 1RM test-retest median CV = 4.2% (ICC 0.97) [Syst. review, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7367986/], and repeated maximal testing itself doesn't drive adaptation [PMC12131154, https://pmc.ncbi.nlm.nih.gov/articles/PMC12131154/] — so only count a change as real if it exceeds the test's noise: **strength >5%, jumps >4%, timed holds >10%, Cooper >5%** (smallest-worthwhile-change gates for the UI). Balance/mobility can be retested monthly (cheap); full Cooper no more than every 8 weeks (motivationally expensive). New users: 1–2 familiarization exposures before the first "official" strength scores (reproducibility ≤5% needs 2–4 familiarizations in novices [PMC10343053, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10343053/]).

---

## 7. Engineering checklist

1. `patterns` enum (§1.1) + per-exercise `{pattern, plane, modality}` tags; plane-coverage audit query.
2. Norm tables §3 as JSON: `{test, sex, ageBracket, anchors: [{value, score}]}` with §4.2 anchor scores.
3. e1RM: Wathan, hard cap r≤10; BW-load coefficients (push-up 0.64, pull-up/dip 0.96).
4. Radar: 7 axes, each 0–100 vs own sex/age reference; both users on one chart is fair by construction.
5. Flag engine: ratio table §4.6; LSI <0.90; H:Q proxy <0.60.
6. Retest scheduler: 6–8 wk, SWC gates before celebrating/alarming.
