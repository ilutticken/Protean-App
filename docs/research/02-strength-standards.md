# Protean — Research 02: Science-Backed Strength Estimation & Standards

**Purpose:** code-ready reference for the estimation engine (e1RM, standards, scoring, sex adjustment, bodyweight-load conversion, trend modelling).
**Date compiled:** 2026-08-01. All numeric constants below are transcribed from the cited primary sources and were verified by re-computation where possible.
**Evidence grading used throughout:** `[A]` peer-reviewed primary/meta-analytic · `[B]` official federation document / large observational dataset · `[C]` practitioner consensus (state this in the UI when surfaced).

---

## 0. Design decisions up front (TL;DR for the engineer)

| Decision | Recommendation | Why |
|---|---|---|
| Default e1RM equation | **Epley** for reps 1–10 on external-load lifts | Simplest, invertible, top-3 accuracy in every validation study, and matches StrengthLevel's own convention so percentile lookups stay self-consistent [Strength Level, 2026] |
| Light-load / isolation lifts | **Marzagão weight-dependent** (§1.3) | 17–22% lower internal inconsistency across 388 exercises; classical equations badly under-predict for loads < 30 kg [Marzagão, 2026] |
| Validity window | Trust reps **≤ 10**; degrade confidence 11–15; refuse to update PR estimates above 15 | Mayhew 2008, Reynolds 2006 both show error inflates sharply past 10 [A] |
| Bodyweight scaling | Store **lookup tables**, interpolate log–log; do NOT assume a fixed BW multiple | Empirical exponent varies 0.48 → 1.32 by lift × sex × level (§3.2) |
| Cross-athlete comparison (the two users) | **DOTS** for barbell total, **percentile rank** for everything else | DOTS is sex-specific, needs no equipment/federation context, actively maintained |
| Sex handling | Separate standards tables, **not** a single multiplier | Gap is 0.60 upper-body vs 0.67 lower-body — one multiplier misleads on both |

---

## 1. 1RM estimation equations

### 1.1 The seven classical equations (exact forms)

`w` = load lifted, `r` = repetitions completed **to momentary failure**. All return 1RM in the same units as `w`.

| # | Equation | Formula (1RM) | Inverse (%1RM at r reps) | Notes / failure modes |
|---|---|---|---|---|
| 1 | **Epley (1985)** | `w * (1 + r/30)` | `1 / (1 + r/30)` | Returns 96.8% at r=1 — **does not self-consistently return `w` for a single**. Use the corrected form `w * (1 + (r-1)/30)` if you want r=1 → w exactly. Linear, unbounded, never blows up. |
| 2 | **Brzycki (1993)** | `w / (1.0278 - 0.0278*r)` | `1.0278 - 0.0278*r` | Exact at r=1. **Singularity at r = 36.97**; negative above. Must clamp r ≤ 12 in code. |
| 3 | **Lander (1985)** | `w / (1.013 - 0.0267123*r)` | `1.013 - 0.0267123*r` | Singularity at r ≈ 37.9. Near-clone of Brzycki. Performed worst in older-adult validation (12–23% error range vs 76–157%) [Knutzen et al., 1999]. |
| 4 | **Lombardi (1989)** | `w * r^0.10` | `r^-0.10` | Exact at r=1. Never singular. **Far too flat** at high reps (74% of 1RM implied at 20 reps). Best pre/post-training accuracy for men's bench & squat [IUSCA, 2023]. *Note: Mayhew 2008's reprinted table lists the exponent as 0.13; the canonical published value is 0.10 — pick 0.10 and document the choice.* |
| 5 | **Mayhew et al. (1992)** | `100*w / (52.2 + 41.9*exp(-0.055*r))` | `(52.2 + 41.9*e^(-0.055r))/100` | Returns only 91.9% at r=1 → systematically over-predicts 1RM from a true single. Asymptote at 52.2%. Best mean accuracy from 3RM (-0.5% mean difference) [Moses, Wintec]. |
| 6 | **O'Conner et al. (1989)** | `w * (1 + 0.025*r)` | `1 / (1 + 0.025*r)` | Most conservative linear form; consistently **under**-estimates leg press [Reynolds 2006]. |
| 7 | **Wathan (1994)** | `100*w / (48.8 + 53.8*exp(-0.075*r))` | `(48.8 + 53.8*e^(-0.075r))/100` | Asymptote 48.8%. Near-identical to Epley across 1–20 reps (max divergence 1.5 pts). Good general performer in older adults. |

### 1.2 Implied %1RM by rep count (computed from the formulas above — use to sanity-check your implementation)

| reps | Epley | Brzycki | Lander | Lombardi | Mayhew | O'Conner | Wathan | **Nuzzo 2024 empirical** |
|---|---|---|---|---|---|---|---|---|
| 1 | 96.8 | 100.0 | 98.6 | 100.0 | 91.9 | 97.6 | 98.7 | 100 |
| 2 | 93.8 | 97.2 | 96.0 | 93.3 | 89.7 | 95.2 | 95.1 | ~97 |
| 3 | 90.9 | 94.4 | 93.3 | 89.6 | 87.7 | 93.0 | 91.8 | **95** |
| 5 | 85.7 | 88.9 | 87.9 | 85.1 | 84.0 | 88.9 | 85.8 | **90** |
| 8 | 78.9 | 80.5 | 79.9 | 81.2 | 79.2 | 83.3 | 78.3 | ~83 |
| 10 | 75.0 | 75.0 | 74.6 | 79.4 | 76.4 | 80.0 | 74.2 | **80** |
| 12 | 71.4 | 69.4 | 69.2 | 78.0 | 73.9 | 76.9 | 70.7 | **75** |
| 15 | 66.7 | 61.1 | 61.2 | 76.3 | 70.6 | 72.7 | 66.3 | **70** |
| 20 | 60.0 | 47.2 | 47.9 | 74.1 | 66.1 | 66.7 | 60.8 | **60** |

Empirical column: meta-regression of **952 reps-to-failure tests, 7,289 individuals, 269 studies** [Nuzzo, Pinto, Nosaka & Steele, *Sports Medicine*, 2024, https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/]. **Key implication: at 10–15 reps the classical equations sit 4–9 percentage points *below* the empirical curve, i.e. they *over*-estimate 1RM in the hypertrophy rep range.** For the Protean Routine's 15/20/35-rep tiers, classical e1RM is not usable — see §6.3.

### 1.3 Weight-dependent equation (recommended for light/isolation lifts) `[B]`

Fitted on **303,494 near-failure sets, 14,966 users, 388 exercises** from Fitbod logs [Marzagão, T., *A Weight-Dependent 1RM Prediction Equation…*, pre-print 2026, https://arxiv.org/pdf/2603.17495]:

```
k(w) = max(0.5, -2.55 + 4.58 * ln(w_kg))      # conversion factor, weight-dependent
e1RM = w * (1 + (r - 1)^0.85 / k(w))          # w in KILOGRAMS (mandatory)
```
Unit warning: in lb, the intercept must shift by `b*ln(2.205) = +3.60` → `a = 1.05`. Store loads in kg internally.

Reported internal-consistency improvement vs classical: Brzycki −17.6%, Epley −17.4%, Wathan −17.0%, Mayhew −21.9%; positive for **all 183** exercises with ≥50 tuples. Ablation: 91% of gain from `k(w)`, 9% from the 0.85 exponent.

Implied `k(w)`: 10 kg → 8.0 · 25 kg → 12.2 · 55 kg → 15.8 · 70 kg → 16.9 · 80 kg → 17.5 · 150 kg → 20.4. (Epley's fixed `k`=30, Brzycki's effective `k`≈36 — both far above every observed value.)

Divergence (e1RM, kg) — this is why it matters for curls/laterals/pistols:

| w (kg) | r=5 Epley | r=5 new | r=10 Epley | r=10 new | r=12 Epley | r=12 new |
|---|---|---|---|---|---|---|
| 12 | 14.0 | 16.4 | 16.0 | 20.8 | 16.8 | 22.4 |
| 20 | 23.3 | 25.8 | 26.7 | 31.6 | 28.0 | 33.7 |
| 45 | 52.5 | 54.8 | 60.0 | 64.6 | 63.0 | 68.2 |
| 100 | 116.7 | 117.5 | 133.3 | 134.9 | 140.0 | 141.4 |
| 150 | 175.0 | 173.9 | 200.0 | 197.6 | 210.0 | 206.5 |

**Caveat:** this equation was optimised on *internal consistency*, not against measured 1RMs (the dataset has none), and bodyweight/assisted exercises were **excluded** from the fit. Treat as best-available for external-load isolation work; keep Epley for barbell compounds.

### 1.4 Accuracy evidence & the validity window

| Source | Population | Finding (exact) |
|---|---|---|
| Mayhew et al., *JSCR* 22(5):1570, 2008 [https://www.unm.edu/~rrobergs/478PredictionAccuracy.pdf] | 103 college women, bench, pre/post 12 wk | With **≤10 RTF**, best pre-training: Lombardi (61% of predictions within ±2.3 kg; 95% CI −5.4…+4.8 kg). % error SD ≈ **9–10.6%** for all equations. Brzycki −2.0±10.5%, Lombardi −0.9±9.2%, Mayhew +1.6±9.4%, Wathan +0.7±10.6%, O'Conner −3.7±9.1%, Lander −1.1±10.5%. |
| Reynolds, Gordon & Robergs, *JSCR* 20(3):584, 2006 | 70 adults (34M/36F), 18–69 y | R² by rep count — **chest press 5RM 0.993, 10RM 0.976, 20RM 0.955**; **leg press 5RM 0.974, 10RM 0.933, 20RM 0.915**. Explicit conclusion: *"no more than 10 repetitions should be used in linear equations."* Adding anthropometry/sex/age did **not** improve prediction. |
| Reynolds 2006 direct-fit equations `[A]` | same | Bench: `1RM = 1.1307*(5RM) - 0.6998` (Sy.x 2.98 kg). Leg press: `1RM = 1.0970*(5RM) - 14.2546` (Sy.x 16.16 kg). 10RM bench: `1.2321*(10RM) - 0.1752*FFM - 5.7443`. |
| Reynolds 2006 measured %1RM | same | Chest press **87.45 / 75.65 / 61.61%** at 5/10/20RM. Leg press **85.91 / 70.10 / 51.58%**. Lower body drops far faster — do not share a rep-table across planes. |
| LeSuer et al., 1997 | 67 untrained students | All seven equations r > 0.95 but **all significantly under-estimated deadlift**. |

**Recommended validity window in code:** `reps ∈ [1,10]` = full confidence · `[11,15]` = flagged, widened CI · `>15` = do not produce an e1RM; log as endurance metric only.

---

## 2. Strength standards by sex and bodyweight

### 2.1 The three source families and why they disagree

| Source | Method | Population | Bias |
|---|---|---|---|
| **StrengthLevel** [https://strengthlevel.com/strength-standards] `[B]` | Percentile of self-reported lifts. Beginner ≈ 5th, Novice ≈ 20th, Intermediate ≈ 50th, Advanced ≈ 80th, Elite ≈ 95th pct. 195.5M lifts / 27.9M users (2026 refresh). Multi-rep sets converted to e1RM **via Epley**. | Self-selected app users who log lifts | Highest thresholds at Intermediate+; survivorship and self-report inflation; "Elite" ≈ strong gym-goer, **not** competitive elite |
| **ExRx / Kilgore** [https://exrx.net/Testing/WeightLifting/StrengthStandards] `[B]` | Derived from competitive weightlifting/powerlifting classification systems 1950s→present; *"not predicted or regression derived."* Tables by Dr Lon Kilgore (also in *Practical Programming*/*Starting Strength*). 48 tables fitted with polynomial + sigmoid regression for age/sex output. | Competition classification lineage | More conservative than StrengthLevel at Intermediate/Advanced; "Elite" genuinely means national-class |
| **Symmetric Strength** [https://symmetricstrength.com/about] `[B]` | Raw no-wrap powerlifting world records (Powerlifting Watch) + ExRx weightlifting + USPA/IFBB; median squat:deadlift and bench:deadlift ratios per weight class. **Score = ¼ of hypothetical Wilks score for that lift**; overall = mean of best score in 5 categories (squat, floor pull, pull-up, horizontal press, vertical press). Age adj. via quadratic fits to McCulloch (>40) and Foster (<23). | Competition records | Score 75 = "strong", ~2–3 y; 100 = "close to the natural limit", 5–10 y |

**Protean recommendation:** ship StrengthLevel percentiles as the primary rank (largest N, covers dips/pull-ups/hip thrust that ExRx lacks), and label them *"percentile vs. logging gym population"* rather than "elite". Offer Symmetric-style category scoring for the balance/symmetry view.

### 2.2 Barbell standards — StrengthLevel, kg, by bodyweight (verbatim) and as ×BW (computed)

**MEN — Squat (1RM kg | ×BW)**

| BW kg | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 50 | 36 \| 0.72 | 55 \| 1.10 | 78 \| 1.56 | 106 \| 2.12 | 137 \| 2.74 |
| 60 | 49 \| 0.82 | 71 \| 1.18 | 98 \| 1.63 | 129 \| 2.15 | 162 \| 2.70 |
| 70 | 62 \| 0.89 | 86 \| 1.23 | 116 \| 1.66 | 149 \| 2.13 | 185 \| 2.64 |
| 80 | 75 \| 0.94 | 101 \| 1.26 | 132 \| 1.65 | 168 \| 2.10 | 206 \| 2.58 |
| 90 | 87 \| 0.97 | 115 \| 1.28 | 148 \| 1.64 | 186 \| 2.07 | 226 \| 2.51 |
| 100 | 98 \| 0.98 | 128 \| 1.28 | 163 \| 1.63 | 203 \| 2.03 | 244 \| 2.44 |
| 120 | 120 \| 1.00 | 152 \| 1.27 | 191 \| 1.59 | 233 \| 1.94 | 278 \| 2.32 |

*(110 kg row: 109 / 140 / 177 / 218 / 261.)*

**MEN — Bench (kg | ×BW)**

| BW | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | 27 \| 0.54 | 41 \| 0.82 | 58 \| 1.16 | 78 \| 1.56 | 101 \| 2.02 |
| 60 | 37 \| 0.62 | 53 \| 0.88 | 72 \| 1.20 | 95 \| 1.58 | 119 \| 1.98 |
| 70 | 47 \| 0.67 | 64 \| 0.91 | 85 \| 1.21 | 110 \| 1.57 | 136 \| 1.94 |
| 80 | 56 \| 0.70 | 75 \| 0.94 | 98 \| 1.23 | 124 \| 1.55 | 151 \| 1.89 |
| 90 | 65 \| 0.72 | 85 \| 0.94 | 109 \| 1.21 | 137 \| 1.52 | 165 \| 1.83 |
| 100 | 73 \| 0.73 | 95 \| 0.95 | 120 \| 1.20 | 149 \| 1.49 | 179 \| 1.79 |
| 120 | 89 \| 0.74 | 113 \| 0.94 | 140 \| 1.17 | 171 \| 1.43 | 203 \| 1.69 |

*(110 kg row: 81 / 104 / 131 / 160 / 191.)*

**MEN — Deadlift (kg | ×BW)**

| BW | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | 46 \| 0.92 | 68 \| 1.36 | 96 \| 1.92 | 129 \| 2.58 | 164 \| 3.28 |
| 60 | 61 \| 1.02 | 86 \| 1.43 | 117 \| 1.95 | 153 \| 2.55 | 191 \| 3.18 |
| 70 | 75 \| 1.07 | 103 \| 1.47 | 137 \| 1.96 | 175 \| 2.50 | 216 \| 3.09 |
| 80 | 89 \| 1.11 | 119 \| 1.49 | 155 \| 1.94 | 196 \| 2.45 | 239 \| 2.99 |
| 90 | 102 \| 1.13 | 134 \| 1.49 | 172 \| 1.91 | 215 \| 2.39 | 260 \| 2.89 |
| 100 | 114 \| 1.14 | 148 \| 1.48 | 188 \| 1.88 | 232 \| 2.32 | 279 \| 2.79 |
| 120 | 137 \| 1.14 | 174 \| 1.45 | 217 \| 1.81 | 265 \| 2.21 | 315 \| 2.62 |

*(110 kg row: 126 / 161 / 203 / 249 / 298.)*

**WOMEN — Squat / Bench / Deadlift (kg | ×BW)**

| BW | Lift | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|
| 40 | Squat | 19 \| 0.47 | 34 \| 0.85 | 53 \| 1.32 | 76 \| 1.90 | 102 \| 2.55 |
| 50 | Squat | 26 \| 0.52 | 42 \| 0.84 | 63 \| 1.26 | 88 \| 1.76 | 116 \| 2.32 |
| 60 | Squat | 32 \| 0.53 | 49 \| 0.82 | 72 \| 1.20 | 99 \| 1.65 | 129 \| 2.15 |
| 70 | Squat | 37 \| 0.53 | 56 \| 0.80 | 80 \| 1.14 | 109 \| 1.56 | 140 \| 2.00 |
| 80 | Squat | 42 \| 0.53 | 62 \| 0.78 | 88 \| 1.10 | 117 \| 1.46 | 149 \| 1.86 |
| 90 | Squat | 47 \| 0.52 | 68 \| 0.76 | 94 \| 1.04 | 125 \| 1.39 | 158 \| 1.76 |
| 40 | Bench | 10 \| 0.25 | 19 \| 0.47 | 33 \| 0.82 | 49 \| 1.23 | 68 \| 1.70 |
| 50 | Bench | 14 \| 0.28 | 25 \| 0.50 | 40 \| 0.80 | 58 \| 1.16 | 79 \| 1.58 |
| 60 | Bench | 19 \| 0.32 | 31 \| 0.52 | 47 \| 0.78 | 66 \| 1.10 | 88 \| 1.47 |
| 70 | Bench | 22 \| 0.31 | 36 \| 0.51 | 53 \| 0.76 | 74 \| 1.06 | 96 \| 1.37 |
| 80 | Bench | 26 \| 0.33 | 40 \| 0.50 | 59 \| 0.74 | 80 \| 1.00 | 104 \| 1.30 |
| 90 | Bench | 30 \| 0.33 | 45 \| 0.50 | 64 \| 0.71 | 86 \| 0.96 | 111 \| 1.23 |
| 40 | Deadlift | 26 \| 0.65 | 43 \| 1.07 | 65 \| 1.62 | 92 \| 2.30 | 121 \| 3.02 |
| 50 | Deadlift | 34 \| 0.68 | 52 \| 1.04 | 76 \| 1.52 | 105 \| 2.10 | 136 \| 2.72 |
| 60 | Deadlift | 40 \| 0.67 | 60 \| 1.00 | 86 \| 1.43 | 116 \| 1.93 | 149 \| 2.48 |
| 70 | Deadlift | 46 \| 0.66 | 68 \| 0.97 | 95 \| 1.36 | 126 \| 1.80 | 160 \| 2.29 |
| 80 | Deadlift | 52 \| 0.65 | 74 \| 0.93 | 102 \| 1.27 | 135 \| 1.69 | 170 \| 2.12 |
| 90 | Deadlift | 57 \| 0.63 | 80 \| 0.89 | 109 \| 1.21 | 143 \| 1.59 | 180 \| 2.00 |

Note the shape difference: men's ×BW **rises** then plateaus across the bodyweight range; women's **falls monotonically** from 40 kg upward on every lift. A shared curve shape will mis-rank the female athlete at both ends.

**Overhead (shoulder) press, kg**

| Sex/BW | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| M 60 | 21 | 32 | 45 | 62 | 79 |
| M 70 | 27 | 39 | 54 | 72 | 90 |
| M 80 | 33 | 46 | 62 | 81 | 101 |
| M 90 | 38 | 53 | 70 | 90 | 111 |
| M 100 | 44 | 59 | 77 | 98 | 120 |
| F 50 | 10 | 17 | 27 | 38 | 51 |
| F 60 | 12 | 20 | 31 | 43 | 57 |
| F 70 | 15 | 23 | 34 | 47 | 62 |

**Anchor rows for the remaining lifts** (StrengthLevel, kg; ×BW in brackets). Use §3.2 exponents to extrapolate to other bodyweights.

| Lift | Sex/BW | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|
| Bent-over row | M 80 | 48 (0.60) | 66 (0.83) | 88 (1.10) | 114 (1.43) | 141 (1.76) |
| Bent-over row | F 60 | 18 (0.30) | 29 (0.48) | 43 (0.72) | 59 (0.98) | 78 (1.30) |
| Barbell curl | M 80 | 22 (0.28) | 33 (0.41) | 46 (0.58) | 63 (0.79) | 80 (1.00) |
| Barbell curl | F 60 | 8 (0.13) | 14 (0.23) | 23 (0.38) | 34 (0.57) | 47 (0.78) |
| Power clean | M 80 | 52 | 68 | 88 | 111 | 135 |
| Power clean | F 60 | 27 | 38 | 51 | 66 | 82 |
| Hip thrust (incl. bar) | M 81.6 (180 lb) | 129 lb (0.72) | 218 (1.21) | 335 (1.86) | 478 (2.66) | 639 (3.55) |
| Hip thrust (incl. bar) | F 59 (130 lb) | 76 lb (0.58) | 137 (1.05) | 219 (1.68) | 321 (2.47) | 436 (3.35) |

Hip-thrust values are **pounds** as published and **include the 44 lb bar** [https://strengthlevel.com/strength-standards/hip-thrust].

### 2.3 Bodyweight & weighted-calisthenics standards

**Max reps (StrengthLevel)**

| Exercise | Sex/BW | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|
| Pull-ups | M overall | <1 | 6 | 13 | 24 | 34 |
| Pull-ups | M 80 kg | 1 | 7 | 13 | 21 | 29 |
| Pull-ups | F overall | <1 | <1 | 6 | 14 | 23 |
| Pull-ups | F 60 kg | <1 | <1 | 6 | 12 | 20 |
| Dips | M overall | <1 | 9 | 20 | 34 | 48 |
| Dips | M 80 kg | 4 | 10 | 20 | 31 | 42 |
| Dips | F overall | <1 | <1 | 9 | 20 | 33 |
| Dips | F ~59 kg | <1 | 1 | 9 | 19 | 30 |
| Push-ups | M overall | 2 | 18 | 39 | 65 | 93 |
| Push-ups | M 80 kg | 6 | 20 | 38 | 60 | 84 |
| Push-ups | F overall | <1 | 6 | 18 | 34 | 51 |
| Push-ups | F 60 kg | <1 | 7 | 18 | 32 | 47 |

Rep standards **fall with bodyweight** (Fitness Volt mirror of StrengthLevel: male Elite pull-ups 40 @ 110 lb → 22 @ 300 lb; female Elite 25 @ 90 lb → 13 @ 260 lb) [https://fitnessvolt.com/strength-standards/pull-ups/]. Model as `reps_level(BW) = A_level * BW^(-c)` with c ≈ 0.22 (men), c ≈ 0.30 (women) fitted to those endpoints.

**Weighted calisthenics — added load as ×BW `[C]`** (practitioner aggregations of StrengthLevel data; science here is thin — label as community standards in the UI)

| Movement | Level | Men (added ÷ BW) | Women (added ÷ BW) | Source |
|---|---|---|---|---|
| Weighted pull-up 1RM | Novice | +0.10 | assisted | [Liftoff, 2026, https://liftoffrank.com/blog/weighted-pull-up-standards] |
| | Intermediate | +0.42 | +0.12 | " |
| | Advanced | +0.77 | +0.36 | " |
| | Elite | +1.14 | +0.62 | " |
| Weighted dip 1RM | Novice | 0.35–0.55 | (not differentiated) | [Endura, 2026, https://endura.coach/weighted-dips-strength-standards-calculator/] |
| | Intermediate | 0.55–0.75 | " | " |
| | Advanced | 0.75–1.00 | " | " |
| | Elite | >1.00 | " | " |
| Weighted pistol squat | Intermediate–Advanced | 0.48–0.68 | 0.36–0.52 | [Endura, 2026] |

Cross-check against a gymnastics-strength curriculum [Bodyweight Warrior / Overcoming Gravity lineage, https://www.bodyweightwarrior.co.uk/blog/how-strong-are-you]: *Basics* = 6 dips + 6 chin-ups (4 chin-ups acceptable for women); *Basics+* = 12 dips + 12 chin-ups + 10 pike push-ups; *Intermediate* = 5×**+40% BW** weighted pull-up, 5 chest-to-wall HSPU, tuck planche negative, straddle front lever negative; *Advanced* = one-arm chin-up, 90° HSPU, straddle planche, full front lever. Note the +40%×5 reps ≈ +0.70 BW single by Epley — consistent with the "Advanced" weighted pull-up row above.

---

## 3. Allometric scaling and points systems

### 3.1 Theory

Geometric similarity predicts force ∝ cross-sectional area ∝ mass^(2/3), so the classic normalisation is:

```
allometric_strength = load / BW^0.67
```
[Jarić, 2002; reviewed in *Allometric scaling of strength measurements to body size*]. Empirically the exponent is **not** universally 2/3: judo athletes b = 0.68; other strength measures fit 0.72, 0.78, 0.85; Batterham & George showed 2/3 fails to remove bias in elite weightlifters and powerlifters [https://www.nsca.com/education/articles/kinetic-select/normalizing-fitness-data/]. Vanderburgh (2000, *JSCR*) found allometric models of bench and squat world records are bias-free but **the deadlift is not**.

### 3.2 Empirical exponents fitted from the StrengthLevel tables (do this, not 0.67)

Fitted as `b = ln(S_hi/S_lo) / ln(BW_hi/BW_lo)`; men 60→110 kg, women 50→90 kg.

| Lift | Sex | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|---|
| Squat | M | 1.32 | 1.12 | 0.98 | 0.87 | 0.79 |
| Bench | M | 1.29 | 1.11 | 0.99 | 0.86 | 0.78 |
| Deadlift | M | 1.20 | 1.04 | 0.91 | 0.80 | 0.73 |
| Squat | F | 1.01 | 0.82 | 0.68 | 0.60 | 0.53 |
| Bench | F | 1.30 | 1.00 | 0.80 | 0.67 | 0.58 |
| Deadlift | F | 0.88 | 0.73 | 0.61 | 0.53 | 0.48 |

**Two decision-relevant facts:** (1) the exponent falls monotonically as you move up the levels — heavier *beginners* carry non-contributing mass, heavier *elites* approach geometric scaling; (2) women's exponents run ~0.2–0.3 lower than men's at the same level, so a single unisex scaling constant will systematically mis-rank the female athlete. **Implementation: store the tables, interpolate log–log between bodyweight rows, and only use a fitted `b` for extrapolation beyond table ends.**

### 3.3 Wilks (original, 1994) — total × coefficient, numerator 500

```
Coeff = 500 / (a + b*x + c*x^2 + d*x^3 + e*x^4 + f*x^5)     # x = bodyweight in kg
```
[Wikipedia, *Wilks coefficient*, https://en.wikipedia.org/wiki/Wilks_coefficient]

| | Men | Women |
|---|---|---|
| a | −216.0475144 | 594.31747775582 |
| b | 16.2606339 | −27.23842536447 |
| c | −0.002388645 | 0.82112226871 |
| d | −0.00113732 | −0.00930733913 |
| e | 7.01863e−6 | 4.731582e−5 |
| f | −1.291e−8 | −9.054e−8 |

### 3.4 Wilks-2020 ("Wilks 2") — **numerator 600**, not 500

```
Coeff = 600 / (a + b*x + c*x^2 + d*x^3 + e*x^4 + f*x^5)
```

| | Men | Women |
|---|---|---|
| a | 47.46178854 | −125.4255398 |
| b | 8.472061379 | 13.71219419 |
| c | 0.07369410346 | −0.03307250631 |
| d | −0.001395833811 | −0.001050400051 |
| e | 7.07665973070743e−6 | 9.38773881462799e−6 |
| f | −1.20804336482315e−8 | −2.3334613884954e−8 |

**Do not mix Wilks and Wilks-2020 scores in one chart.** Verified: 80 kg man / 600 kg total → Wilks 409.6 vs Wilks-2020 491.5 (a ~1.20× scale shift).

### 3.5 DOTS — recommended default for cross-sex comparison

```
denom = A*bw^4 + B*bw^3 + C*bw^2 + D*bw + E          # bw kg, clamp 40–210 (M) / 40–150 (F)
DOTS  = total * 500 / denom
```

| | Men | Women |
|---|---|---|
| A (bw⁴) | −0.000001093 | −0.0000010706 |
| B (bw³) | 0.0007391293 | 0.0005158568 |
| C (bw²) | −0.1918759221 | −0.1126655495 |
| D (bw¹) | 24.0900756 | 13.6175032 |
| E (const) | −307.75076 | −57.96288 |

Verified worked examples (implement these as unit tests): M 80 kg/600 kg → **413.7**; M 93 kg/700 kg → **445.4**; F 63 kg/400 kg → **430.2**; F 60 kg/300 kg → **332.6**.

### 3.6 IPF GL Points (official, valid from 2020-05-01) `[B]`

```
IPF_GL = result_kg * 100 / (A - B * exp(-C * bodyweight_kg))
```
Round the coefficient to 6 dp, then the points to 6 dp (federation rule).
[IPF, *The IPF GL Coefficients for Relative Scoring*, May 2020, https://www.powerlifting.sport/fileadmin/ipf/data/ipf-formula/IPF_GL_Coefficients-2020.pdf]

| Category | A | B | C |
|---|---|---|---|
| Men — Equipped Powerlifting | 1236.25115 | 1449.21864 | 0.01644 |
| Men — Classic Powerlifting | 1199.72839 | 1025.18162 | 0.00921 |
| Men — Equipped Bench Press | 381.22073 | 733.79378 | 0.02398 |
| Men — Classic Bench Press | 320.98041 | 281.40258 | 0.01008 |
| Women — Equipped Powerlifting | 758.63878 | 949.31382 | 0.02435 |
| Women — Classic Powerlifting | 610.32796 | 1045.59282 | 0.03048 |
| Women — Equipped Bench Press | 221.82209 | 357.00377 | 0.02937 |
| Women — Classic Bench Press | 142.40398 | 442.52671 | 0.04724 |

**Interpretation is the selling point: 100 points = the average elite athlete at that bodyweight.** Derived from Golden Standard Samples (results ≥ 84% of the weight-class world record) at IPF international events since 2011. Verified: M 80 kg / 600 kg classic → **84.6**; F 60 kg / 300 kg classic → **67.8**. Coefficients are recalculated on a 4-year cycle (the published set was declared valid to 2023-12-31 — check for a refresh before shipping).

---

## 4. Sex differences in strength & performance

### 4.1 Magnitude of the gap

| Domain | Female as % of male | Source |
|---|---|---|
| Upper-limb muscle strength | **50–60%** | Nuzzo, *Narrative Review of Sex Differences in Muscle Strength…*, *JSCR* 37(2), 2023 [https://journals.lww.com/nsca-jscr/fulltext/2023/02000/narrative_review_of_sex_differences_in_muscle.28] |
| Lower-limb muscle strength | **60–70%** | " |
| Whole-body average | ~60% | " |
| Handgrip (mean force) | 329 N vs 541 N = **61%**; 90% of women below the 5th-percentile-adjusted male level — i.e. **90% of females produce less force than 95% of males**. Elite female judo/handball athletes (444 N) still land below the *median* untrained man. Gap persists after adjusting for lean body mass. | Leyk et al., *Eur J Appl Physiol*, 2007 [https://link.springer.com/article/10.1007/s00421-006-0351-1] |
| Bench press (StrengthLevel, same 80 kg BW, Intermediate) | 59/98 = **60%** | computed from §2.2 |
| Squat (same 80 kg BW, Intermediate) | 88/132 = **67%** | computed |
| Deadlift (same 80 kg BW, Intermediate) | 102/155 = **66%** | computed |

The independently-computed StrengthLevel ratios reproduce Nuzzo's 0.60 upper / 0.66–0.67 lower almost exactly — good cross-validation, and a good default if a movement lacks a female table: **female_standard ≈ 0.60 × male at the same BW for upper-body push/pull; 0.66 for hip/knee-dominant.**

### 4.2 Rate of relative gain

Roberts, Nuckols & Krieger, *Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis*, *JSCR* 34(5), 2020 [https://journals.lww.com/nsca-jscr/fulltext/2020/05000/sex_differences_in_resistance_training__a.30]:
- Hypertrophy (12 outcomes / 10 studies): **no significant sex difference** in relative gain.
- Lower-body strength: **no significant difference** in relative gain.
- **Upper-body strength: significant effect favouring females** (19 outcomes / 17 studies).

**Product implication:** absolute progression targets must differ by sex, but *percentage* progression targets should not — and if anything the female athlete should be given equal-or-slightly-faster upper-body % targets. Do not apply a "women progress slower" handicap.

### 4.3 Reps at a given %1RM — the contested claim

- **Meta-analytic answer (largest evidence base): no meaningful sex effect.** *"Sex, age, and training status did not clearly moderate the REPS ~ %1RM relationship."* The only real moderator is **exercise**: at 80% 1RM, leg press 13.1 reps [95% CI 9.8–17.5] vs bench press 8.8 [7.7–10.1] [Nuzzo et al., *Sports Medicine*, 2024].
- **Between-individual SD is the thing that actually matters:** **SD = 2.51 reps at 80% 1RM, SD = 4.36 reps at 60% 1RM.** Heterogeneity grows as load falls.
- Counter-evidence, weaker: Reynolds 2006 found *"women decreased less in chest press strength than men across RM conditions"* and likewise for leg press (though the ANOVA attributed this to relative, not absolute, strength). Mayhew 2008 tested male-derived equations on 103 women and concluded there is *"little difference between the genders in muscular endurance capacity."* Rippetoe's oft-repeated claim that women bench 5 reps at 95–97% of 1RM is **[C] anecdote and is not supported** by the meta-regression.

**Implementation:** use one REPS~%1RM model for both athletes; branch on **exercise family** (upper-body press ≈ bench curve; leg press/squat ≈ leg-press curve), **not** on sex. Carry per-athlete calibration instead: after ~8 logged AMRAP sets, fit an individual offset to the curve — that will capture any real individual difference far better than a sex prior.

---

## 5. Bodyweight-exercise load equivalence

### 5.1 Measured % of bodyweight

| Exercise / position | % BW as load | Method | Source |
|---|---|---|---|
| Push-up, standard (peak GRF) | **64%** (≈65% rounded) | force plate, n=23 | Ebben et al., *Kinetic Analysis of Several Variations of Push-Ups*, *JSCR* 25(10), 2011 |
| Push-up, knees (bent-knee) | **49%** (≈50%) | " | Ebben 2011 |
| Push-up, hands elevated 30.5 cm | **55%** | " | Ebben 2011 |
| Push-up, hands elevated 61.0 cm | **41%** (≈40%) | " | Ebben 2011 |
| Push-up, feet elevated 30.5 cm | **~70%** | " | Ebben 2011 |
| Push-up, feet elevated 61.0 cm | **74–75%** | " | Ebben 2011 |
| Push-up, traditional — UP position | **~69%** | static force plate, 28 strength-trained men | Suprak, Dawes & Stephenson, *JSCR* 25(2):497, 2011 [https://pubmed.ncbi.nlm.nih.gov/20179649/] |
| Push-up, traditional — DOWN position | **~75%** | " | Suprak 2011 |
| Push-up, modified (knees) — up vs down | lower than traditional; **larger up→down change** in the knee variant | " | Suprak 2011 (exact modified values not recoverable from the open abstract — verify against full text before hard-coding) |
| Suspension (TRX) push-up, feet on ground | 72.4% iso / 70.1% isotonic | strap load cells | PLOS ONE 2023 [https://pmc.ncbi.nlm.nih.gov/articles/PMC10516423/] |
| Suspension push-up, feet on device | 75.0% iso / 72.1% isotonic | " | " |
| Suspension inverted row, feet on ground | 69.5% iso / 73.4% isotonic | " | " |
| Suspension inverted row, feet on device | 73.3% iso / 75.7% isotonic | " | " |
| Inverted row, bar, general range | 68–79% depending on body angle; Giancotti et al. 2019 report **58%** at shallower angles/heights | mixed | as above |
| Pull-up / chin-up | **~95%** (BW − forearms & hands) | segment-mass model, not force plate | Dempster/Winter segment parameters; ExRx "Calculating Actual Resistance" applies the same principle at the *hardest static position* [https://exrx.net/WeightTraining/Bodyweight] |
| Dip (parallel bar) | **~93–95%** | segment-mass model | " |
| Pistol squat (working leg) | **~83%** (BW − one leg, leg ≈ 16–18% BW) | segment-mass | Low, S., *Estimates by the Math* [https://stevenlow.org/estimates-by-the-math-a-general-comparison-of-barbell-squats-to-pistol-squats/] |
| Barbell back squat (body component) | **~87%** (BW − shanks & feet) | segment-mass | ExRx |

**Calibration warning:** Ebben's are **peak GRF during motion**, Suprak's are **static holds at two positions**. They are not interchangeable. For e1RM conversion use the **hardest position** (bottom): push-up ≈ **0.75 BW**, not 0.64.

### 5.2 Conversion to external load and e1RM

```
effective_load = f_exercise * BW + added_weight
e1RM_effective = apply_1RM_formula(effective_load, reps)      # reps ≤ 10 only
added_weight_1RM = e1RM_effective - f_exercise * BW           # what to report as "+X kg"
```
Worked example: 70 kg athlete, 12 push-ups. `0.75*70 = 52.5 kg` effective → Epley e1RM = 73.5 kg → equivalent to a push-up with **+21 kg** added. Note that this is a *push-up* e1RM, not a bench-press e1RM; do not equate them without a per-athlete calibration factor.

### 5.3 Pistol squat ↔ back squat bridge `[C]`

Ingredients: single-leg load = `0.83*BW + added`; unilateral force ≈ **55–60% of bilateral** (bilateral deficit); barbell squat body component ≈ `0.87*BW` [Low, stevenlow.org].

```
bar_equiv = 2 * k_BLD * (0.83*BW + added_pistol) - 0.87*BW      # k_BLD default 1.10
```
Validation against Low's three published anchors (BW = 80 kg): added 0 → 0.96×BW bar (Low: "≈1×BW"); added 0.5×BW → **2.06×BW** (Low: 2×BW); added 1.0×BW → **3.16×BW** (Low: 3×BW). Expose `k_BLD` as a per-athlete calibration constant, seeded at 1.10 and refitted the first time a real back-squat 1RM and a real weighted-pistol max coexist in the log. Label this estimate as modelled, not measured.

---

## 6. Trend modelling, confidence, and high-rep sets

### 6.1 Pipeline

1. **Per set** → e1RM by §1 (Epley for compounds, Marzagão for isolation/light).
2. **Effort correction.** Non-failure sets are the dominant error source. Steele et al. 2017 (n=141): experienced trainees under-predict reps-to-failure by **1–2**, inexperienced by **4–5**. Refalo et al. 2024 (n=24 trained): intra-set RIR error **0.65 ± 0.78 reps**, no sex effect. → If RIR is logged, use `r_eff = r + RIR`; if not, apply `r_eff = r + 1.5` for a trained user and widen the CI.
3. **Daily best** — take max e1RM per (athlete, exercise, day) to kill within-session fatigue (Senna 2011: rep decline from set 2 with 1 min rest, from set 3 with 3–5 min rest).
4. **Smoothing** — EWMA on log(e1RM), half-life **21 days** (`α = 1 - 0.5^(1/21)` per day).
5. **Trend** — Theil–Sen slope on log(e1RM) over a trailing 8–12 week window; report as %/week. Robust to the one heroic single that will otherwise distort a linear fit.
6. **Plateau/regression flag** — slope CI excludes 0 and is negative for ≥3 consecutive weeks.

### 6.2 Confidence model (concrete numbers to ship)

Relative SE of a single e1RM, anchored to Mayhew 2008 (±9–10.6% SD at ≤10 reps), Reynolds 2006 (Sy.x 2.98 kg on a 67 kg mean bench = 4.4% at 5RM), and Greig et al. 2023 velocity-based SEE of **9.8% of 1RM**:

```
rel_se(r) = 0.020 + 0.006 * (r - 1)          # r ≤ 12
```
→ r=1: 2.0% · r=3: 3.2% · r=5: 4.4% · r=8: 6.2% · r=10: 7.4% · r=12: 8.6%.

Multipliers: × **1.3** if RIR was not logged; × **1.25** for bodyweight exercises (the `f_exercise` constant is itself uncertain); × **1.4** for the pistol↔squat bridge.
Confidence interval: `e1RM * (1 ± 1.96 * rel_se)`. Minimal detectable change `MDC95 = 1.96 * sqrt(2) * rel_se * e1RM ≈ 2.77 * rel_se * e1RM` — do **not** announce a PR unless the improvement exceeds MDC95.

### 6.3 Handling reps > 10 (unavoidable — the Protean Routine has 15/20/35-rep tiers)

| reps | Handling |
|---|---|
| 1–10 | Full e1RM, full confidence. |
| 11–15 | Use the **Nuzzo empirical curve** (75% @ 12, 70% @ 15) rather than Brzycki/Lander, which collapse. Flag `estimated: low_confidence`. Widen CI by ×1.5. |
| 16–35 | **Do not emit an e1RM.** Track as a separate *strength-endurance* metric: `work_capacity = effective_load × reps` and its own trend. The Protean 35-rep tier is a metabolic/endurance slot; scoring it as strength will corrupt the skill tree. |

Additional guards: Brzycki/Lander must be hard-clamped at r ≤ 12 (singularities at 37 and 38). Lombardi is safe at any r but too flat to be informative above ~10. Mayhew and Epley do not return `w` at r=1 — either use the (r−1) Epley variant or special-case r=1 → e1RM = w.

### 6.4 Overcoming isometrics & quasi-isometric holds (Protean-specific)

There is **no validated equation** converting a 4×7 s overcoming isometric at a fixed joint angle to a dynamic 1RM `[C]`. Isometric max force is joint-angle-specific and typically exceeds concentric 1RM at favourable angles. Recommendation: track isometrics as their own progression axis (load × duration × angle), display alongside e1RM, and never fold them into the e1RM series. Same for the 1-minute quasi-isometric holds — score as time-under-tension at a given load fraction.

---

## 7. Age grading (for later)

Only needed if Protean adds age-matched comparison. Both tables are official USA Powerlifting / WRPF instruments: multiply the total by the coefficient.

**McCulloch (Masters, 40+)** [WRPF, 2022 edition, https://wrpf-latvia.net/downloads/McCulloch%20Coefficients%20WRPF.pdf]

| Age | Coef | Age | Coef | Age | Coef | Age | Coef |
|---|---|---|---|---|---|---|---|
| 40 | 1.000 | 50 | 1.150 | 60 | 1.380 | 70 | 1.700 |
| 41 | 1.005 | 51 | 1.168 | 61 | 1.410 | 71 | 1.740 |
| 42 | 1.014 | 52 | 1.187 | 62 | 1.440 | 72 | 1.780 |
| 43 | 1.028 | 53 | 1.207 | 63 | 1.470 | 73 | 1.820 |
| 44 | 1.044 | 54 | 1.228 | 64 | 1.501 | 74 | 1.860 |
| 45 | 1.060 | 55 | 1.250 | 65 | 1.533 | 75 | 1.900 |
| 46 | 1.078 | 56 | 1.273 | 66 | 1.565 | 76 | 1.940 |
| 47 | 1.096 | 57 | 1.297 | 67 | 1.597 | 77 | 1.980 |
| 48 | 1.114 | 58 | 1.322 | 68 | 1.630 | 78 | 2.020 |
| 49 | 1.132 | 59 | 1.350 | 69 | 1.664 | 79 | 2.060 |

Ages 80–90+ are **capped at 2.060**.

**Foster (Teen/Junior, 14–23)** [USA Powerlifting, https://www.usapowerlifting.com/wp-content/uploads/2023/08/Age-Coefficients-Used-In-USA-Powerlifting.pdf]

| Age | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
|---|---|---|---|---|---|---|---|---|---|---|
| Coef | 1.23 | 1.18 | 1.13 | 1.08 | 1.06 | 1.04 | 1.03 | 1.02 | 1.01 | 1.00 |

Symmetric Strength applies quadratic fits to both curves rather than the step tables — worth copying if you want a continuous age adjustment.

---

## 8. Constants block (drop-in)

```jsonc
{
  "e1rm": {
    "epley":    { "form": "w*(1+r/30)",                       "max_reps": 12 },
    "epley_r1": { "form": "w*(1+(r-1)/30)",                   "max_reps": 12 },
    "brzycki":  { "form": "w/(1.0278-0.0278*r)",              "max_reps": 12, "singularity_r": 36.97 },
    "lander":   { "form": "w/(1.013-0.0267123*r)",            "max_reps": 12, "singularity_r": 37.92 },
    "lombardi": { "form": "w*r^0.10",                          "max_reps": 20 },
    "mayhew":   { "form": "100*w/(52.2+41.9*exp(-0.055*r))",  "max_reps": 15 },
    "oconner":  { "form": "w*(1+0.025*r)",                     "max_reps": 15 },
    "wathan":   { "form": "100*w/(48.8+53.8*exp(-0.075*r))",  "max_reps": 15 },
    "marzagao": { "alpha": 0.85, "a": -2.55, "b": 4.58, "k_floor": 0.5, "units": "kg" }
  },
  "reps_at_pct1rm_nuzzo2024": { "95":3,"90":5,"85":7,"80":10,"75":12,"70":15,"65":17,"60":20,
                                "sd_at_80pct":2.51, "sd_at_60pct":4.36,
                                "bench_at_80pct":8.8, "legpress_at_80pct":13.1 },
  "bw_load_fraction": { "pushup":0.75, "pushup_peak_dynamic":0.64, "pushup_knee":0.49,
                        "pushup_hands_30cm":0.55, "pushup_hands_61cm":0.41,
                        "pushup_feet_30cm":0.70, "pushup_feet_61cm":0.745,
                        "inverted_row":0.72, "pullup":0.95, "dip":0.94,
                        "pistol_working_leg":0.83, "squat_body":0.87 },
  "dots":   { "M":[-0.000001093,0.0007391293,-0.1918759221,24.0900756,-307.75076],
              "F":[-0.0000010706,0.0005158568,-0.1126655495,13.6175032,-57.96288],
              "numerator":500, "bw_clamp_M":[40,210], "bw_clamp_F":[40,150] },
  "ipf_gl": { "M_classic":[1199.72839,1025.18162,0.00921], "F_classic":[610.32796,1045.59282,0.03048],
              "M_bench":[320.98041,281.40258,0.01008],     "F_bench":[142.40398,442.52671,0.04724] },
  "sex_ratio_default": { "upper_body":0.60, "lower_body":0.66 },
  "confidence": { "rel_se": "0.020+0.006*(r-1)", "no_rir_mult":1.3, "bodyweight_mult":1.25,
                  "mdc95_mult":2.77 }
}
```

---

## 9. Open gaps / do not fake these

1. **Suprak's modified push-up percentages** — the open abstract does not print them. Buy/borrow the full text before hard-coding anything other than the traditional 69%/75%.
2. **No peer-reviewed force-plate study of the pull-up or dip** was located; the ~95%/~94% figures are segment-mass models, not measurements. Mark them `[C]`.
3. **Weighted calisthenics standards have no scientific basis** — they are aggregations of self-reported app data. Present as "community percentile", never as "science-backed".
4. **IPF GL coefficients were declared valid to 2023-12-31.** Re-check the federation page for the current 4-year cycle before release.
5. **Isometric → dynamic 1RM conversion does not exist** in validated form. Keep the Protean isometric slots on a separate axis.
6. **Lombardi exponent discrepancy** (0.10 canonical vs 0.13 in Mayhew 2008's reprinted table) is unresolved; the doc assumes 0.10.
