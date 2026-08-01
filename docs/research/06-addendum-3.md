# 06 — Addendum 3: Canonical Constants for the Shared Estimation Engine

**Status: NORMATIVE.** This document supersedes all conflicting numeric constants in docs 01, 02, 04 and 05.
**Compiled 2026-08-01.** All StrengthLevel tables below were **re-pulled on 2026-08-01** (not copied from earlier docs). Every worked example was re-computed in Python; the verification script output is reproduced inline.
**Evidence grades:** `[A]` peer-reviewed primary · `[B]` official federation doc / large observational dataset · `[C]` practitioner consensus.

---

## 0. Why this document exists

Four docs encode the same three constant families with different values. Because `e1RM → standards lookup → radar score` **and** `e1RM → barbell stunt unlock` are the same pipeline, a module that follows doc 04 and a module that follows doc 02 will assign **different tiers and different skill-tree unlocks to the same logged set**. Measured swings:

| Constant | doc 01 | doc 02 | doc 04 | doc 05 | Swing |
|---|---|---|---|---|---|
| Push-up bw fraction | — | 0.75 (§5.1, "not 0.64") | 0.64 (§4.1, §7) | — | **17.2% in every push-up e1RM** (computed §3.4) |
| Pull-up / dip fraction | — | 0.95 / 0.94 | 0.96 / 0.96 | — | 1.1% / 2.1% |
| Pistol working-leg fraction | — | 0.83 | 0.85 | — | 2.4% |
| Default e1RM equation | — | Epley | **Wathan** | Epley | up to 3.9% (§2.3) |
| ♀ deadlift Beginner ×BW | 0.75 | ~0.65–0.68 | 0.50 | — | **0.25 ×BW = a full tier** |
| ♂ squat Intermediate ×BW | 1.75 | ~1.63–1.66 | 1.50 | — | **0.25 ×BW** |

---

## 1. Precedence decree

1. **Doc 02 is canonical** for `e1rm.*`, `bw_load_fraction.*`, `standards.*`, scaling exponents, DOTS/IPF-GL/Wilks coefficients, and the confidence model. It carries the verified transcriptions and the only re-computed worked examples (all four DOTS values, both IPF GL values and both Wilks values reproduce **exactly** — see §7).
2. **This addendum amends doc 02** in exactly four places, each on new evidence obtained today: §2 (e1RM branch, doc 02 §0/§1.1), §3.2 (Suprak modified push-up values, doc 02 open gap #1), §3.3 (pull-up/dip/pistol unification), §4 (regenerated standards from a fresh pull).
3. **Docs 01, 04 and 05 must not carry independent numeric copies.** Required edits:

| Doc / section | Action |
|---|---|
| **doc 04 §4.1** | Delete the Wathan mandate and the inline `c ≈ 0.64 / 0.96 / 0.85`. Replace with: *"e1RM and bodyweight-load fractions per doc 06 §2 and §3; do not inline constants."* |
| **doc 04 §4.3** | **Delete the whole ×BW anchor table.** Replace with a call to `standards_lookup(lift, sex, bw_kg)` (doc 06 §4.3). |
| **doc 04 §7 item 3** | Rewrite: *"e1RM per doc 06 §2.2 (canonical), rep cap per doc 06 §2.4; bw fractions per doc 06 §3.5."* |
| **doc 01 §4** | **Delete the freestanding ratio table.** It is a hand-rounded 2026-era transcription and is wrong by up to 0.26 ×BW (§4.4). Replace with computed lookup. |
| **doc 01 §4.1 / §6** | Keep the *named stunts* (they are product, not data) but re-derive their tier labels from §4.3; see §5. |
| **doc 05 §3.1** | Replace the inline Epley formula with *"e1RM per doc 06 §2.2"*. The chart is unaffected — see §2.3. |

> **Rule for all future docs:** no research doc may restate a constant that lives in the constants block (§6). It may only cite `doc 06 §x`.

---

## 2. e1RM — the single canonical estimator

### 2.1 CORRECTION TO THE BRIEF: StrengthLevel does **not** use Epley

The stated rationale for decreeing Epley ("StrengthLevel percentile tables were built with Epley") is **false as of the current site**. StrengthLevel's own FAQ states the rule verbatim [Strength Level FAQ, 2026, https://strengthlevel.com/faq]:

> *"For fewer than 8 repetitions, we use the **Brzycki** formula … For repetitions between 8 and 10, we use a **linear interpolation of the Brzycki and Epley** formulas … For more than 10 repetitions, we use the **Epley** formula."* (their example: "9 repetitions would be a 50-50 mix").

Doc 02 §2.1 ("Multi-rep sets converted to e1RM **via Epley**") is therefore an error and must be corrected. Symmetric Strength genuinely does use Wathan capped at 10 reps [Symmetric Strength, *About*, https://symmetricstrength.com/about] — doc 04's citation was accurate; its *choice* is what we are overriding.

### 2.2 DECREE — canonical estimator `e1rm_canonical`

Implement the StrengthLevel piecewise rule exactly. It contains Epley (the r ≥ 10 branch), so the decree's intent — *be self-consistent with the rank source* — is honoured literally rather than approximately.

```
e1rm(w, r):                                  # w in kg, r = reps to momentary failure
  if r <= 0:  error
  if r == 1:  return w                        # exact by construction
  brz = w / (1.0278 - 0.0278*r)
  epl = w * (1 + r/30)
  if r < 8:   return brz
  if r <= 10: return (1 - (r-8)/2) * brz + ((r-8)/2) * epl     # 8→100% Brzycki, 9→50/50, 10→100% Epley
  return epl                                  # r >= 11 (flagged, see §2.4)
```

**Rationale (three independent reasons, ranked):**

1. **It is what built the percentile tables.** e1RM feeds `standards_lookup`; using a different equation than the table's own convention introduces a systematic tier bias that no amount of table accuracy can fix.
2. **It is exact at r = 1.** Pure Epley returns `1.0333·w` for a true single — it *invents 3.33% of load out of nothing*. That is not a rounding issue for Protean, because doc 01 §4.1 gates skill-tree unlocks on hard ×BW thresholds. Concrete failure (M 80 kg, "double-bodyweight squat" = 160 kg):

   | Logged set | pure Epley | canonical | Epley unlocks? | canonical unlocks? |
   |---|---|---|---|---|
   | 156 kg × 1 | 161.2 | **156.0** | ✅ (wrong) | ❌ |
   | 150 kg × 3 | 165.0 | **158.8** | ✅ (wrong) | ❌ |
   | 140 kg × 5 | 163.3 | **157.5** | ✅ (wrong) | ❌ |
   | 145 kg × 3 | 159.5 | 153.5 | ❌ | ❌ |

   Three of five near-threshold sets falsely fire the stunt achievement under pure Epley.
3. **Wathan's own claim doesn't survive the newer evidence.** Symmetric Strength cites a single 1990s comparison; Mayhew 2008 (n=103) puts Wathan at +0.7 ± 10.6% — mid-pack, and the largest evidence base (Nuzzo 2024, 952 tests / 7,289 people / 269 studies [https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/] `[A]`) shows *all* classical equations over-predict above 10 reps.

**Where Marzagão still applies:** doc 02 §1.3's weight-dependent equation remains the estimator for **light/isolation external-load work (< ~30 kg)** only. Unchanged. It must never be used for bodyweight or assisted exercises — the fit explicitly excluded them.

### 2.3 Migration: none required

Divergence of the two rejected equations from canonical, computed (`w = 100`, so values read directly as % of canonical):

| r | **canonical** | Epley | Δ vs canon | Wathan | Δ vs canon |
|---|---|---|---|---|---|
| 1 | 100.00 | 103.33 | **+3.33%** | 101.30 | +1.30% |
| 2 | 102.86 | 106.67 | +3.70% | 105.15 | +2.22% |
| 3 | 105.89 | 110.00 | **+3.88%** | 108.98 | +2.92% |
| 4 | 109.10 | 113.33 | +3.88% | 112.80 | +3.39% |
| 5 | 112.51 | 116.67 | +3.69% | 116.58 | **+3.62%** |
| 6 | 116.14 | 120.00 | +3.32% | 120.33 | +3.60% |
| 7 | 120.02 | 123.33 | +2.76% | 124.03 | +3.34% |
| 8 | 124.16 | 126.67 | +2.02% | 127.67 | +2.83% |
| 9 | 129.30 | 130.00 | +0.54% | 131.25 | +1.50% |
| 10–15 | =Epley | — | **0.00%** | — | +1.06% → +0.60% |

Max deviation over r ∈ [1,10]: **Epley +3.88%, Wathan +3.62%** — both are *below* the r = 5 measurement noise of a single e1RM (rel_se 4.4%, doc 02 §6.2) and far below MDC95 (2.77 × rel_se ≈ 12.2% at r = 5). **No historical data needs migration:** just recompute `e1rm` from the stored `(w, r)` tuples on next app open. Protean stores raw sets (doc 05 §5, ~13k sets/yr), so this is a pure derived-value refresh.

> Note for doc 02 §1.1: Wathan and Epley are **not** "near-identical, max divergence 1.5 pts" as %1RM in the useful range — they diverge by ~3.6% *as e1RM* at r = 5. The 1.5-point figure was a %1RM-scale comparison and is misleading when used to justify swapping equations.

### 2.4 The single rep cap (one rule, everywhere)

| r | Behaviour | Confidence |
|---|---|---|
| 1–10 | Emit e1RM, full confidence. `rel_se = 0.020 + 0.006·(r−1)` (doc 02 §6.2) | full |
| 11–15 | Emit e1RM **flagged** `estimated: low_confidence`; widen CI ×1.5; **may not fire a stunt unlock or a PR announcement** | degraded |
| ≥ 16 | **Do not emit an e1RM.** Log as `work_capacity = effective_load × reps` on the strength-endurance axis only | n/a |

Doc 04 §4.1's "reject r > 10" and doc 02 §6.3's "11–15 flagged" are reconciled: **11–15 produces a number but that number is inert for tiering and unlocks.** This is the only rule; delete both other statements. The Protean Routine's 15/20/35 tiers therefore contribute: 15 → flagged e1RM; 20 and 35 → endurance only.

---

## 3. Bodyweight-load fractions

### 3.1 The convention (this is the actual fix)

Doc 02 and doc 04 were not measuring the same thing. Ebben's numbers are **peak vertical GRF during dynamic reps**; Suprak's are **static holds at fixed positions**. Store both, use one:

> **CONVENTION:** `bw_load_fraction[x]` = the **static fraction at the hardest (bottom) position**, and it is the ONLY value that enters `effective_load` and therefore e1RM.
> `bw_peak_dynamic[x]` = peak GRF during the concentric; stored for display/plyometric analytics; **never** enters e1RM.

### 3.2 Suprak 2011 — doc 02's open gap #1, now closed

Suprak, Dawes & Stephenson, *JSCR* 25(2):497–503, 2011 [https://pubmed.ncbi.nlm.nih.gov/20179649/] `[A]` — **28 highly strength-trained males**, hands on force platform, 4 static positions. Full-text values recovered via two independent secondary transcriptions that agree exactly [Boot Camp & Military Fitness Institute, 2024, https://bootcampmilitaryfitnessinstitute.com/exercises/the-classic-press-up/; corroborated by search-indexed full text of the JSCR record]:

| Variant | UP (elbows extended) | DOWN (elbows flexed) | Up→Down change |
|---|---|---|---|
| **Traditional push-up** | **69.16 %BW** | **75.04 %BW** | +5.88 pts |
| **Modified (knees) push-up** | **53.56 %BW** | **61.80 %BW** | **+8.24 pts** |

This confirms doc 02's qualitative note ("larger up→down change in the knee variant") and supplies the two missing numbers. SDs are not reproduced in either secondary source — treat as point estimates and keep the ×1.25 bodyweight uncertainty multiplier (doc 02 §6.2).

### 3.3 Cross-check and the sex caveat

| Source | Population | Traditional push-up %BW | Notes |
|---|---|---|---|
| Suprak 2011 `[A]` | 28 strength-trained M | 69.16 up / **75.04 down** | static — **canonical** |
| Ebben et al., *JSCR* 25(10), 2011 `[A]` | 23 recreationally fit (14M/9F) | ~64 (peak GRF) | dynamic — `bw_peak_dynamic` |
| Mier & Amasay, *IJES*, 2014 `[A]` | 37 M+F | M 64–72 (up position) | sex difference is real |
| Hewit et al., 2019 [https://crimsonpublishers.com/rism/fulltext/RISM.000591.php] `[A]` | M+F, 1-min bout | M ~70 → ~52; **F ~48 → <45** | **fraction decays with fatigue** |

**Decision:** ship one sex-neutral fraction (0.750) because (a) the female-specific values disagree wildly across studies (48% vs 80%) and none is a static bottom-position measurement, and (b) both athletes are scored against their *own sex's* standards table, so a shared fraction cannot create a cross-sex bias in the radar — it can only shift both athletes' push-up e1RM by the same relative amount. **Log this as a residual gap (§8), not as a solved constant.**

Two further consequences to encode: fraction decays ~18 pts (M) over a 60 s bout, so a 35-rep set's *average* load is materially lower than 0.750 — another reason r ≥ 16 must not produce an e1RM (§2.4).

### 3.4 The 0.64 → 0.750 swing, quantified

Computed with the canonical estimator at r = 8:

| BW | f = 0.64 (doc 04) | f = 0.750 (canonical) | e1RM swing |
|---|---|---|---|
| 60 kg | 47.68 kg (eff 38.40) | 55.87 kg (eff 45.00) | **+17.2%** |
| 70 kg | 55.62 kg (eff 44.80) | 65.19 kg (eff 52.50) | **+17.2%** |
| 80 kg | 63.57 kg (eff 51.20) | 74.50 kg (eff 60.00) | **+17.2%** |

The swing is exactly the fraction ratio (0.7504/0.64 = 1.1725) because e1RM is linear in `w`. It is ~3.9× the r=8 measurement SE — **this is the single largest unresolved contradiction in the codebase.**

### 3.5 Unified segment-model fractions (pull-up / dip / pistol / squat)

Resolved from Winter's anthropometric table (segment mass ÷ total body mass) rather than by choosing between docs [Winter, *Biomechanics and Motor Control of Human Movement*; values as tabulated at https://www1.udel.edu/biology/rosewc/kaap686/notes/anthropometry.html] `[B]`:

| Segment | Fraction | Segment | Fraction |
|---|---|---|---|
| Hand | 0.006 | Foot | 0.0145 |
| Forearm | 0.016 | Leg (shank) | 0.0465 |
| **Forearm + hand** | **0.022** | **Foot + leg** | **0.061** |
| Upper arm | 0.028 | Thigh | 0.100 |
| Total arm | 0.050 | **Total leg** | **0.161** |

| Exercise | Derivation | **Canonical** | doc 02 | doc 04 | Δ |
|---|---|---|---|---|---|
| Pull-up / chin-up | 1 − 2×0.022 | **0.956** | 0.95 | 0.96 | ±0.6% |
| Dip (parallel bar) | 1 − 2×0.022 | **0.956** | 0.94 | 0.96 | +1.7% vs doc 02 |
| Pistol (working leg) | 1 − 0.161 | **0.839** | 0.83 | 0.85 | ±1.3% |
| Back squat (body component) | 1 − 2×0.061 | **0.878** | 0.87 | — | +0.9% |

All four deltas are **below the r=1 measurement SE (2.0%)**, so unlike the push-up this is a tidiness fix, not a correctness fix — but it must still be single-sourced or the two modules will drift. ExRx publishes 0.95 for both pull-up and dip [ExRx, *Calculating Actual Resistance*, https://exrx.net/WeightTraining/Bodyweight] `[C]`; we adopt the segment-derived 0.956 for both and note the 0.6% disagreement. **Doc 02's 0.94 for dips is dropped — there is no derivation behind it.**

Steven Low's pistol arithmetic is confirmed compatible: *"total leg mass is on average about 16–18% of total body mass"*, bilateral single-limb capacity *"~55–60%"* of bilateral, worked ratio `155/275 = .56`, conclusion *"approximately 50% bodyweight pistol = 2× bodyweight squat"* [https://stevenlow.org/estimates-by-the-math-a-general-comparison-of-barbell-squats-to-pistol-squats/] `[C]`. Doc 02 §5.3's bridge equation is retained unchanged **except** `0.83 → 0.839` and `0.87 → 0.878`; `k_BLD` default stays 1.10.

---

## 4. Strength standards — regenerate, don't transcribe

### 4.1 Fresh pull (2026-08-01), StrengthLevel kg tables `[B]`

Source pages, all fetched today: `https://strengthlevel.com/strength-standards/{squat,bench-press,deadlift,shoulder-press,power-clean,bent-over-row,hip-thrust,pull-ups,dips}/kg`. Tier ≡ percentile of the **logging-lifter** population: Beginner 5th · Novice 20th · Intermediate 50th · Advanced 80th · Elite 95th. Dataset sizes (n lifts): squat 24,988,444 · bench 48,718,584 · deadlift 22,978,599 · OHP 5,644,500 · power clean 1,069,314 · row 2,162,181 · hip thrust 1,221,785 · pull-ups 4,852,758 · dips 2,162,628.

**MEN (1RM kg)**

| Lift \ BW | 60 | 70 | 80 | 90 |
|---|---|---|---|---|
| Squat | 49/71/98/129/162 | 62/86/116/149/185 | 75/101/132/168/206 | 87/115/148/186/226 |
| Bench | 37/53/72/95/119 | 47/64/85/110/136 | 56/75/98/124/151 | 65/85/109/137/165 |
| Deadlift | 61/86/117/153/191 | 75/103/137/175/216 | 89/119/155/196/239 | 102/134/172/215/260 |
| OHP | 21/32/45/62/79 | 27/39/54/72/90 | 33/46/62/81/101 | 38/53/70/90/111 |
| Power clean | 37/51/69/89/110 | 45/60/79/100/123 | 52/68/88/111/135 | 59/76/97/121/146 |
| Bent-over row | 31/46/65/87/111 | 40/56/77/101/127 | 48/66/88/114/141 | 56/75/99/125/154 |
| Hip thrust¹ | 32/63/107/163/227 | 44/80/129/189/257 | 56/96/149/213/285 | 68/111/168/236/311 |
| Weighted pull-up² | −4/+11/+27/+45/+64 | −2/+13/+31/+50/+71 | −2/+14/+33/+54/+75 | −2/+15/+35/+57/+79 |
| Weighted dip² | −1/+17/+39/+64/+91 | +2/+22/+46/+73/+101 | +5/+26/+52/+81/+111 | +6/+30/+57/+87/+118 |

**WOMEN (1RM kg)**

| Lift \ BW | 50 | 60 | 70 |
|---|---|---|---|
| Squat | 26/42/63/88/116 | 32/49/72/99/129 | 37/56/80/109/140 |
| Bench | 14/25/40/58/79 | 19/31/47/66/88 | 22/36/53/74/96 |
| Deadlift | 34/52/76/105/136 | 40/60/86/116/149 | 46/68/95/126/160 |
| OHP | 10/17/27/38/51 | 12/20/31/43/57 | 15/23/34/47/62 |
| Power clean | 23/33/46/60/75 | 27/38/51/66/82 | 31/42/55/71/87 |
| Bent-over row | 15/25/38/54/72 | 18/29/43/59/78 | 20/32/46/64/83 |
| Hip thrust¹ | 30/56/92/137/187 | 35/63/100/147/199 | 39/69/108/155/209 |
| Weighted pull-up² | −14/−4/+8/+21/+35 | −16/−4/+9/+23/+38 | −18/−5/+9/+24/+40 |
| Weighted dip² | −15/−2/+14/+32/+52 | −15/0/+17/+37/+58 | −16/0/+19/+40/+62 |

Cells are `Beg/Nov/Int/Adv/Elite`.
¹ Hip thrust **includes the 20 kg bar** (site convention). ² Pull-up/dip figures are **ADDED weight**; negative = assistance required. Note this supersedes doc 02 §2.2's *pounds* hip-thrust row and doc 02 §2.3's third-party ("Liftoff"/"Endura") weighted-calisthenics ratios, which over-stated male Advanced/Elite weighted pull-ups by 0.09–0.20 ×BW.

### 4.2 Interpolation algorithm (normative)

```
standards_lookup(lift, sex, bw_kg) -> {beginner, novice, intermediate, advanced, elite}   # kg
  rows = TABLE[lift][sex]                       # sorted by bodyweight
  (lo, hi) = bracketing rows; if bw outside table, use the two nearest rows (extrapolate)
  for each level i:
      a = rows[lo][i]; b = rows[hi][i]
      if a > 0 and b > 0:
          e = ln(b/a) / ln(hi/lo)               # local allometric exponent
          out[i] = a * (bw/lo)^e                # LOG-LOG  (doc 02 §3.2)
      else:
          out[i] = a + (b-a)*(bw-lo)/(hi-lo)    # LINEAR fallback: assisted (negative) rows only
```

The `a > 0` guard is mandatory: female weighted pull-up/dip Beginner–Novice rows are **negative** (assistance), and `ln` of a negative is a crash. This case does not arise in doc 02 §3.2's original formulation and is a new requirement.

**Local exponents** `b = ln(S_hi/S_lo)/ln(BW_hi/BW_lo)`, recomputed from the fresh tables (M 60→90, F 50→70). Use only to extrapolate beyond table ends:

| Lift | Sex | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|
| Squat | M | 1.42 | 1.19 | 1.02 | 0.90 | 0.82 |
| Bench | M | 1.39 | 1.16 | 1.02 | 0.90 | 0.81 |
| Deadlift | M | 1.27 | 1.09 | 0.95 | 0.84 | 0.76 |
| OHP | M | 1.46 | 1.24 | 1.09 | 0.92 | 0.84 |
| Power clean | M | 1.15 | 0.98 | 0.84 | 0.76 | 0.70 |
| Row | M | 1.46 | 1.21 | 1.04 | 0.89 | 0.81 |
| Hip thrust | M | 1.86 | 1.40 | 1.11 | 0.91 | 0.78 |
| Squat | F | 1.05 | 0.85 | 0.71 | 0.64 | 0.56 |
| Bench | F | 1.34 | 1.08 | 0.84 | 0.72 | 0.58 |
| Deadlift | F | 0.90 | 0.80 | 0.66 | 0.54 | 0.48 |
| OHP | F | 1.21 | 0.90 | 0.69 | 0.63 | 0.58 |
| Power clean | F | 0.89 | 0.72 | 0.53 | 0.50 | 0.44 |
| Row | F | 0.85 | 0.73 | 0.57 | 0.50 | 0.42 |
| Hip thrust | F | 0.78 | 0.62 | 0.48 | 0.37 | 0.33 |
| W. pull-up (added) | M | n/a | 0.76 | 0.64 | 0.58 | 0.52 |
| W. dip (added) | M | n/a | 1.40 | 0.94 | 0.76 | 0.64 |

Doc 02 §3.2's exponents were fitted over M 60→110 / F 50→90 and differ by up to 0.10; **use the table above** (it matches the fresh pull and the actual bodyweight range of the two athletes). Both confirm doc 02's two structural facts: exponent falls monotonically with level, and women's exponents run ~0.2–0.35 below men's — a single unisex `BW^0.67` (doc 04 §2 axis 2, §4.4) is wrong for **every** cell in this table and must be replaced by the table lookup.

### 4.3 Computed ×BW anchors (derived — DO NOT hard-code; shown for review only)

No athlete bodyweights exist in the repo (`src/lib/types.ts` has no seeded profile), so these are computed at three reference pairs. In production, call `standards_lookup` with the athlete's **current logged bodyweight** and divide by it.

**M 80 kg / F 60 kg** (Beg/Nov/Int/Adv/Elite, ×BW)

| Lift | ♂ | ♀ |
|---|---|---|
| Squat | 0.94 / 1.26 / **1.65** / 2.10 / 2.58 | 0.53 / 0.82 / **1.20** / 1.65 / 2.15 |
| Bench | 0.70 / 0.94 / **1.23** / 1.55 / 1.89 | 0.32 / 0.52 / **0.78** / 1.10 / 1.47 |
| Deadlift | 1.11 / 1.49 / **1.94** / 2.45 / 2.99 | **0.67** / 1.00 / 1.43 / 1.93 / 2.48 |
| OHP | 0.41 / 0.57 / 0.78 / 1.01 / 1.26 | 0.20 / 0.33 / 0.52 / 0.72 / 0.95 |
| Power clean | 0.65 / 0.85 / 1.10 / 1.39 / 1.69 | 0.45 / 0.63 / 0.85 / 1.10 / 1.37 |
| Bent-over row | 0.60 / 0.82 / 1.10 / 1.43 / 1.76 | 0.30 / 0.48 / 0.72 / 0.98 / 1.30 |
| Hip thrust (incl. bar) | 0.70 / 1.20 / 1.86 / 2.66 / 3.56 | 0.58 / 1.05 / 1.67 / 2.45 / 3.32 |
| W. pull-up (added) | −0.03 / 0.17 / 0.41 / 0.68 / 0.94 | −0.27 / −0.07 / 0.15 / 0.38 / 0.63 |
| W. dip (added) | 0.06 / 0.33 / 0.65 / 1.01 / 1.39 | −0.25 / 0.00 / 0.28 / 0.62 / 0.97 |

**Ratios are not bodyweight-invariant** — recomputed at M 75 / F 58 the squat Elite moves 2.58 → 2.61 (♂) and 2.15 → 2.18 (♀); at M 85 / F 65 it moves to 2.54 / 2.07. A frozen ratio table is wrong by ~±0.05 ×BW over a realistic 10 kg bodyweight swing, and by much more at the tails. **This is why docs 01 §4 and 04 §4.3 must be deleted rather than corrected.**

### 4.4 Error in the superseded tables (the reviewer's headline cases, confirmed)

Δ = superseded value − canonical, at M 80 / F 60:

| Lift | Sex | Doc | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|---|
| Squat | M | 01 | −0.19 | −0.01 | **+0.10** | +0.15 | +0.17 |
| Squat | M | 04 | −0.19 | −0.01 | **−0.15** | −0.10 | −0.08 |
| Squat | F | 04 | −0.03 | −0.07 | **−0.20** | −0.15 | −0.15 |
| Bench | M | 04 | −0.20 | −0.19 | **−0.23** | −0.05 | +0.11 |
| Deadlift | F | 01 | **+0.08** | 0.00 | +0.07 | +0.07 | +0.02 |
| Deadlift | F | 04 | **−0.17** | 0.00 | −0.18 | −0.18 | −0.23 |
| Deadlift | M | 01 | −0.11 | +0.01 | +0.06 | +0.05 | **+0.26** |

Confirmed: **♀ deadlift Beginner** canonical **0.67**, doc 01 says 0.75 (+0.08), doc 04 says 0.50 (−0.17) — a 0.25 ×BW spread. **♂ squat Intermediate** canonical **1.65**, doc 01 1.75, doc 04 1.50 — 0.25 ×BW spread, i.e. doc 04's "Intermediate" sits between canonical Novice (1.26) and Intermediate (1.65) and would tier a genuine Novice as Intermediate. Doc 01's female tables are the closer of the two but are hand-rounded to 0.25 steps and drift up to +0.10 at the top.

---

## 5. Consequences for the stunt-unlock criteria (doc 01 §4.1, §6)

The named stunts stay; their advertised *tier labels* were derived from the deleted tables and are re-derived here at M 80 / F 60:

| Stunt | Criterion (unchanged) | ♂ tier now | ♀ tier now | doc 01 label |
|---|---|---|---|---|
| Bodyweight bench | 1.0 / 0.75 ×BW | ~Novice–Int | ~Int–Adv | — (**mislabelled as headline**) |
| Bodyweight OHP | 1.0 / 0.70 ×BW | Advanced (1.01) | Advanced (0.95) | "advanced" ✅ |
| 2× BW squat | 2.0 / 1.5 ×BW | ~Advanced (2.10) | ~Advanced (1.65) | ✅ |
| 2× BW deadlift | 2.0 / 1.5 ×BW | Intermediate (1.94) | Int–Adv (1.43–1.93) | "intermediate" ✅ |
| 3× BW deadlift | 3.0 / 2.25 ×BW | Elite (2.99) | Adv–Elite | "near elite" ✅ |
| W. pull-up ½ BW | +0.50 / +0.35 ×BW | Int (0.41)–Adv (0.68) | Advanced (0.38) | "OAP checkpoint" ✅ |
| W. dip ½ BW | +0.50 / +0.35 ×BW | ~Intermediate (0.65) | ~Advanced (0.28–0.62) | — |

Only the bench stunt is materially mislabelled (♂ 1.0×BW is Novice-to-Intermediate on current data). **All unlock evaluations must use `e1rm_canonical` (§2.2) and require r ≤ 10** — see the false-unlock table in §2.2.

---

## 6. Constants block (extends doc 02 §8 — this is the file to ship)

```jsonc
{
  "$schema": "protean.constants/1.0.0",
  "supersedes": ["doc02§8", "doc04§4.1", "doc04§4.3", "doc04§7.3", "doc01§4", "doc05§3.1"],
  "e1rm": {
    "canonical": {
      "id": "strengthlevel_hybrid",
      "form": "r==1 ? w : (r<8 ? brzycki : r<=10 ? lerp(brzycki,epley,(r-8)/2) : epley)",
      "brzycki": "w/(1.0278-0.0278*r)",
      "epley":   "w*(1+r/30)",
      "source":  "https://strengthlevel.com/faq",
      "reps_full_confidence": [1, 10],
      "reps_flagged":         [11, 15],
      "reps_no_estimate_at_or_above": 16,
      "flagged_ci_multiplier": 1.5,
      "flagged_may_unlock_stunt": false,
      "flagged_may_announce_pr": false
    },
    "isolation_light": { "id": "marzagao", "applies_when": "external_load_kg < 30 && !bodyweight_exercise",
                         "form": "w*(1+(r-1)^0.85/max(0.5,-2.55+4.58*ln(w_kg)))", "units": "kg" },
    "deprecated": { "wathan": "doc04 §4.1 — max +3.62% vs canonical",
                    "pure_epley": "doc02 §0, doc05 §3.1 — max +3.88%; inflates r=1 by 3.33%" }
  },
  "bw_load_fraction": {
    "_convention": "static fraction at hardest (bottom) position; e1RM input",
    "pushup": 0.750, "pushup_knee": 0.618,
    "pushup_hands_30cm": 0.55, "pushup_hands_61cm": 0.41,
    "pushup_feet_30cm": 0.70,  "pushup_feet_61cm": 0.745,
    "inverted_row": 0.72,
    "pullup": 0.956, "chinup": 0.956, "dip": 0.956,
    "pistol_working_leg": 0.839, "squat_body": 0.878
  },
  "bw_peak_dynamic": {
    "_convention": "peak GRF during motion; display/plyo only; NEVER an e1RM input",
    "pushup": 0.64, "pushup_knee": 0.49,
    "pushup_hands_30cm": 0.55, "pushup_hands_61cm": 0.41,
    "pushup_feet_30cm": 0.70, "pushup_feet_61cm": 0.745
  },
  "bw_static_up_position": { "pushup": 0.6916, "pushup_knee": 0.5356 },
  "segment_mass_fraction": { "hand": 0.006, "forearm": 0.016, "forearm_hand": 0.022,
                             "upper_arm": 0.028, "total_arm": 0.050, "foot": 0.0145,
                             "shank": 0.0465, "thigh": 0.100, "foot_leg": 0.061, "total_leg": 0.161 },
  "pistol_bridge": { "form": "2*k_BLD*(0.839*BW + added) - 0.878*BW", "k_BLD_default": 1.10,
                     "ci_multiplier": 1.4, "label": "modelled, not measured" },
  "standards": {
    "source": "strengthlevel.com", "pulled": "2026-08-01",
    "tier_percentiles": { "beginner": 5, "novice": 20, "intermediate": 50, "advanced": 80, "elite": 95 },
    "population": "self-reporting logging lifters — NOT general public",
    "interpolation": "log-log on positive cells; linear on non-positive (assisted) cells",
    "units": "kg", "added_weight_lifts": ["weighted_pullup", "weighted_dip"],
    "bar_included_lifts": ["hip_thrust"],
    "table": { "squat": { "M": { "60":[49,71,98,129,162], "70":[62,86,116,149,185],
                                 "80":[75,101,132,168,206], "90":[87,115,148,186,226] },
                          "F": { "50":[26,42,63,88,116], "60":[32,49,72,99,129], "70":[37,56,80,109,140] } }
               /* …bench, deadlift, ohp, power_clean, row, hip_thrust,
                  weighted_pullup, weighted_dip exactly as §4.1… */ }
  },
  "sex_ratio_default": { "upper_body": 0.60, "lower_body": 0.66 },
  "confidence": { "rel_se": "0.020+0.006*(r-1)", "no_rir_mult": 1.3,
                  "bodyweight_mult": 1.25, "pistol_bridge_mult": 1.4, "mdc95_mult": 2.77 },
  "dots":   { "M":[-0.000001093,0.0007391293,-0.1918759221,24.0900756,-307.75076],
              "F":[-0.0000010706,0.0005158568,-0.1126655495,13.6175032,-57.96288],
              "numerator":500, "bw_clamp_M":[40,210], "bw_clamp_F":[40,150] },
  "ipf_gl": { "M_classic":[1199.72839,1025.18162,0.00921], "F_classic":[610.32796,1045.59282,0.03048],
              "M_bench":[320.98041,281.40258,0.01008],     "F_bench":[142.40398,442.52671,0.04724],
              "valid_from":"2020-05-01", "declared_valid_to":"2023-12-31",
              "recheck": "IPF publishes on a 4-yr cycle; https://www.powerlifting.sport/rules/codes/info/ipf-formula still links only the 2020 set as of 2026-08-01" },
  "wilks":  { "numerator":500, "M":[-216.0475144,16.2606339,-0.002388645,-0.00113732,7.01863e-6,-1.291e-8] },
  "wilks2020": { "numerator":600, "M":[47.46178854,8.472061379,0.07369410346,-0.001395833811,7.07665973070743e-6,-1.20804336482315e-8],
                 "F":[-125.4255398,13.71219419,-0.03307250631,-0.001050400051,9.38773881462799e-6,-2.3334613884954e-8],
                 "never_mix_with": "wilks" }
}
```

---

## 7. Unit tests (all values below were produced by running the reference implementation today)

```
# --- points systems: doc 02's worked examples, all reproduce EXACTLY ---
dots(600, 80, M)            == 413.7      ✅
dots(700, 93, M)            == 445.4      ✅
dots(400, 63, F)            == 430.2      ✅
dots(300, 60, F)            == 332.6      ✅
ipf_gl(600, 80, M_classic)  == 84.62      ✅  (doc 02: 84.6)
ipf_gl(300, 60, F_classic)  == 67.81      ✅  (doc 02: 67.8)
wilks(600, 80, M)           == 409.6      ✅
wilks2020(600, 80, M)       == 491.5      ✅  (ratio 1.200 — never mix)

# --- e1rm_canonical ---
e1rm(100,  1) == 100.00        # exact at a true single (pure Epley would give 103.33)
e1rm(100,  3) == 105.89
e1rm(100,  5) == 112.51
e1rm(100,  8) == 124.16        # pure Brzycki boundary
e1rm(100,  9) == 129.30        # 50/50 blend
e1rm(100, 10) == 133.33        # == Epley exactly
e1rm(100, 15) == 150.00        # == Epley; MUST carry flag low_confidence
e1rm(100, 16) -> raises / returns null + work_capacity path
assert abs(epley(w,r) - e1rm(w,r))  / e1rm(w,r) <= 0.0388 for r in 1..10
assert abs(wathan(w,r) - e1rm(w,r)) / e1rm(w,r) <= 0.0362 for r in 1..10

# --- bodyweight conversion ---
effective_load("pushup", bw=70, added=0)        == 52.50
e1rm(52.50, 8)                                  == 65.19   # +12.69 kg "added-equivalent"
effective_load("pushup", bw=80, added=0)        == 60.00
e1rm(60.00, 8)                                  == 74.50
# regression guard against the doc-04 constant:
assert e1rm(0.750*bw, 8) / e1rm(0.64*bw, 8)     == approx(1.1725)   # the 17.2% bug
effective_load("pullup", bw=80, added=20)       == 96.48
effective_load("pistol_working_leg", bw=60, a=0)== 50.34

# --- standards lookup (log-log) ---
standards("squat","M",80)["intermediate"] == 132.0   ->  1.650 xBW
standards("squat","M",75)["intermediate"] == 124.0   ->  1.653 xBW   # interpolated row
standards("squat","F",60)["intermediate"] ==  72.0   ->  1.200 xBW
standards("deadlift","F",60)["beginner"]  ==  40.0   ->  0.667 xBW   # NOT 0.75 (doc01), NOT 0.50 (doc04)
standards("squat","M",80)["intermediate"]/80 != 1.75 # doc01 regression guard
standards("squat","M",80)["intermediate"]/80 != 1.50 # doc04 regression guard
standards("weighted_pullup","F",55)["beginner"] < 0  # negative branch must not call ln()

# --- stunt-unlock guards ---
unlock("squat_2xbw", set=(156,1), bw=80) == False    # canonical 156.0 < 160
unlock("squat_2xbw", set=(150,3), bw=80) == False    # canonical 158.8 < 160
unlock("squat_2xbw", set=(160,1), bw=80) == True
unlock(any, set=(w, 12), ...)            == False    # flagged reps can never unlock
```

---

## 8. Residual gaps — do not fake these

1. **Suprak SDs are still unrecovered.** The two point estimates (69.16 / 75.04 / 53.56 / 61.80) come from secondary transcriptions that agree exactly, but neither prints SDs and the JSCR full text is paywalled (HTTP 402). Keep `bodyweight_mult = 1.25`. *Downgraded from doc 02 open gap #1 (blocking) to a precision gap (non-blocking).*
2. **No female static bottom-position push-up measurement exists.** Reported female values span 45–80 %BW across four studies with incompatible protocols. The shared 0.750 is a *convention*, not a measurement, for the female athlete.
3. **The push-up fraction is not constant within a set** — decays ~70% → ~52% (M), ~48% → <45% (F) over 60 s [Hewit 2019]. Any multi-rep push-up e1RM is an upper bound.
4. **Pull-up / dip fractions remain segment-model estimates, never force-plate measurements.** Grade `[C]`: 0.956 is arithmetic on Winter's table, not data.
5. **IPF GL coefficients are past their declared validity** (2023-12-31); the federation page still links only the 2020 set. Re-check before public release.
6. **StrengthLevel tables are self-reported and drift.** Re-pull and diff each release; store `standards.pulled` and surface it in the UI ("percentile vs. logging gym population, data of 2026-08-01"). Weighted-calisthenics tiers now come from StrengthLevel directly — this removes doc 02 §2.3's third-party aggregation error but does not make them science; still `[C]`.
7. **Lombardi exponent (0.10 vs 0.13)** unresolved — now irrelevant, Lombardi is not in the canonical path.
