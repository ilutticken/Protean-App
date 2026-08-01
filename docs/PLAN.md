# Protean — Master Build Plan

Two-athlete (Ren ♂ / Rei ♀ — placeholder names until the users set their own), local-first web app
that turns "The Protean Routine" + the hex skill map into: a progressive plan, a fast logger,
science-backed strength/performance estimates, and a stunt skill tree.

**Research corpus** (all claims sourced there — read before touching an algorithm):

| Doc | Owns |
|---|---|
| `research/01-skill-progressions.md` | Skill lines, unlock criteria, auto-advance rules (R-DYN/R-STAT/R-STAT-HARD), Skill Load Index, tendon pacing |
| `research/02-strength-standards.md` | e1RM equations, StrengthLevel tables, DOTS/Wilks/IPF GL coefficients, sex differences, %BW load fractions |
| `research/03-programming-science.md` | Volume (fractional sets), RIR policy, progression/deload engine pseudocode, isometrics, tendon 12-week clock |
| `research/04-assessment-domains.md` | Pattern taxonomy, 7-axis radar, field-test norms by sex, symmetry ratios, criterion-anchor scoring |
| `research/05-ux-design.md` | Logging UX, hex-map rendering spec, palette, IA, gamification rules |
| `research/06-addendum-1.md` | Skill lines for acrobatics (NO_AUTO_UNLOCK), rings (iron cross/maltese), locomotion (run/swim tiers) |
| `research/06-addendum-2.md` | **Authoritative seed plan JSON** (42 slots, bands materialized), rep-band ruling, slot schema, open author questions Q1–Q8 |
| `research/06-addendum-3.md` | **Canonical constants** — supersedes conflicts: e1RM = StrengthLevel hybrid, push-up fraction 0.750, re-pulled kg tables |

## Locked decisions (from the corpus — do not re-litigate casually)

1. **e1RM**: StrengthLevel hybrid — Brzycki r<8, Brzycki↔Epley linear blend r=8–10, Epley r>10;
   full confidence r≤10, flag 11–15, r≥16 is work-capacity only (never e1RM). Round-trip
   consistency with StrengthLevel percentile tables is the reason. (addendum-3)
2. **BW load fractions** (static bottom convention): push-up .750, knee push-up .618, pull-up .956,
   dip .956, pistol .839, squat-body .878. Peak-dynamic values stored separately, never for e1RM. (addendum-3)
3. **Standards**: interpolate the re-pulled StrengthLevel kg tables log-log at actual bodyweight;
   linear branch for assisted (negative) cells. No flat ×BW ratio tables. (addendum-3)
4. **Rep tiers are difficulty BANDS** keyed to chain position: `band(i,N)=N==1?1:roundHalfUp(2i/(N-1))`,
   `workTarget = tiers[band]`. Single-step slots use in-step T1/T2/T3. Naming: `stepIndex` + `repBand`,
   never "tier". (addendum-2 §1)
5. **Slot progression vs skill credit are decoupled**: slots advance on band targets; skill-tree
   nodes unlock at doc 01 criteria (min gate). (addendum-2 §1.4)
6. **Straight-arm guard**: `sa:true` steps advance ≤1 step per 21 days; 12-week tendon block before
   ring-cross work. (docs 01/03)
7. **Progression rules**: advance after all sets ≥ target for 2 consecutive sessions; revert one step
   + 14-day cooldown when reps < 60% of target on ≥ half the sets; load channel ±2.5 kg lower /
   1.25 kg upper. Deload = 50% sets at 90% load, never full rest. (doc 03, addendum-2 §1.3)
8. **RIR policy**: 2–3 on heavy/band-0 work, 0–1 acceptable on high-rep band-2 tiers. (doc 03)
9. **Radar**: 7 axes (max strength, relative strength, power, strength-endurance, skill/balance,
   mobility, aerobic), criterion anchors → piecewise-linear 0–100 (anchor scores 10/25/45/60/80/92/100),
   per-sex anchors; cross-athlete comparison via DOTS + percent-of-own-goal, opt-in. (doc 04, 05)
10. **Acrobatics never auto-unlock** — attestation checkbox + surface/spotter flags. (addendum-1)
11. **Streaks are weekly schedule-relative** (≥4/5 planned sessions), never daily. (doc 05)
12. **Iso protocol**: overcoming iso lives in the daily warm-up (4×7 s × 3 angles, day-pattern
    presets in seed); quasi-iso finishers 1×60 s, max 3/session. (addendum-2 §5)

**Deliberate deviation from doc 05**: persistence is localStorage (synchronous, ~300 KB/yr of logs
for 2 athletes — far under the 5 MB limit) + `navigator.storage.persist()` + JSON export/import,
instead of Dexie/IndexedDB. Revisit only if photos/videos are ever added.

## Architecture

React 19 + TS + Vite + Tailwind 4, no router (tab state), no chart lib (hand-rolled SVG per
dataviz skill), vitest for the numeric engines. All data in TS modules under `src/data/`; all
algorithms pure functions under `src/lib/`; UI in `src/ui/`.

```
src/
  lib/types.ts        domain model (matches addendum-2 schema; DONE)
  lib/storage.ts      versioned localStorage + export/import   (DONE)
  lib/useAppData.ts   store hook + context                     (DONE)
  data/seed-plan.ts   addendum-2 §3 JSON, typed                (agent A)
  data/exercises.ts   ~95 exercises: sector/pattern/planes/bwLoadFactor (agent A)
  data/skills.ts      full skill tree: doc 01 §6 + addendum-1 + addendum-2 §4 (agent B)
  data/standards.ts   StrengthLevel kg tables ×9 lifts ×2 sexes, DOTS/GL coefficients (agent C)
  data/norms.ts       field-test norm tables by sex + test registry (agent D)
  lib/strength.ts     e1RM hybrid, bw-load conversion, table lookup, DOTS, level classify (agent C)
  lib/scoring.ts      radar axes, criterion-anchor scoring, symmetry flags (agent D)
  lib/progression.ts  band/workTarget, R-REP/R-STEP/R-LOAD/R-LAND, sa guard, deload, ghost sets (agent E)
  lib/skilltree.ts    node status derivation from logs + progress (agent B)
  ui/…                shell, 5 screens, components (me)
```

## Screens (doc 05 IA)

1. **Today** — pick day, warm-up checklist incl. iso protocol with per-day angle presets, then
   slot-by-slot logger: ghost previous values, 1-tap repeat, stepper keypad, rest timer, chain
   step picker, quasi-iso countdown. ≤3 taps per set.
2. **Plan** — the 5 days as chain boards: each slot shows the chain with current step highlighted,
   band targets, advancement progress (1/2 confirm sessions), alternative-slot toggle (Q8),
   author-questions banner until confirmed.
3. **Stunts** — the hex map: 9-sector radial SVG skill tree, pan/zoom single transform, node states
   (locked/available/in-progress/achieved), bottom-sheet detail with criterion + prereq chain +
   attestation for acrobatics; list fallback.
4. **Stats** — 7-axis radar per athlete (per-sex anchored), e1RM trend lines per lift, volume
   heatmap, symmetry flags, DOTS-normalized opt-in comparison of the two athletes, field-test
   entry (8-test battery, retest nudge every 6–8 weeks).
5. **Profile** — athlete switcher (persistent header control), bodyweight log, unit toggle,
   export/import, author-questions (Q1–Q8) confirmation, about/methodology page that cites the
   research docs honestly (evidence tiers).

## Build order

1. Data+algorithms workflow (agents A–E in parallel, disjoint files, vitest tests from the docs'
   worked examples: DOTS 413.7/445.4/430.2/332.6, IPF GL 84.6/67.8, Wilks 409.6 / Wilks-2020 491.5,
   band arrays N=2..7, e1RM hybrid continuity at r=8/10).
2. Cross-validation script: every `ex` id in seed-plan resolves in exercises.ts; every skill
   `exerciseId`/prereq resolves; every sector has ≥1 node; typecheck + tests green.
3. UI shell + screens (me; dataviz skill loaded before chart work; doc 05 palette).
4. Verification: build, run, screenshot; adversarial review workflow; fix; final polish.
