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
13. **Every sector must be startable by an untrained beginner** — each has ring-0 nodes with no
    prereqs (wall push-up, dead hang, chair sit-to-stand…), enforced by `skills-ext.test.ts`.
    Cross-sector prereq edges must survive per-sector ring normalization; the same test names
    both sectors on violation so a future re-floor fails loudly instead of inverting silently.
14. **Content is additive: authoring must never destroy logged progress.** Adding an exercise, a
    chain rung, or a skill node is a routine content edit and requires no migration. What this
    rests on, and what may therefore never be broken:
    - **Skill progress is derived, never stored as truth** — `skillStatuses()` recomputes from the
      session log, so a new node simply starts appearing. Only attestations are authored state.
    - **Session logs are self-describing** — `EntryLog` stores the resolved `exerciseId`, so a
      historical entry keeps its meaning no matter how its slot is later edited.
    - **Slot progress is keyed, not positional** — `SlotState.stepIndex` is a cache; `stepKey`
      (`slot-identity.ts`) is the progress. Stamp on write, resolve on read. Without this, adding
      one rung silently reassigns the athlete to a different exercise with their confirm count
      intact. Exempt: in-step slots, where `stepIndex` is a T-index into `tiers`.
    - **Exercise and node ids are permanent.** Renaming one is a data migration, not an edit;
      prefer adding a new id and leaving the old one in place.
    - **Migrations archive, never drop** — see `AppData.archived`, written by v1 → v2.

**Goal mode** (2026-08-04, PLAN-GENERATOR.md Phase 3 — shipped): `AthleteState.goal` stores one
starred stunt. `src/lib/goal.ts` is the pure engine: `prereqClosure` (route on the map),
`goalRelevantIds` (closure + the goal's own id-namespace line — sibling drills like the FL
flutter train the goal without being formal prerequisites), `goalPath` (achieved/remaining +
the startable frontier, shallowest ring first), `goalRelevantSetRate` (the §1 acceptance
metric, trailing 7 days, target ≥40%). Surfaces: gold route + double ring on the hex map,
★ GOAL badges on Plan boards, ★ on goal-path nodes in the session credit summary, a Today
progress card ("N steps left" — never dates, per §10), and the Stats rate card. Locked
limits respected: goal mode annotates and measures, never adds volume (§9.3); slot badges
exclude attested/balance nodes, so an acrobatic goal lights no slot it cannot move.

**Six exercises per day** (2026-08-03, athlete-directed): the PDF runs 9–13 slots a day.
`CORE_SLOTS` in `prescription.ts` names the six each day prescribes, chosen to keep every
movement pattern the day owns while dropping duplicates and accessories. Everything else is
flagged `Slot.optional` — still in the plan data, still listed on the Plan screen (dimmed,
marked OPTIONAL), just not in the session. Nothing is deleted and `seed-plan.ts` is untouched.
An alternative to a core slot (legs-04-alt) counts as core: it replaces its base rather than
adding to the six. Changing the selection is one edit to `CORE_SLOTS`.

**Completion is bi-directional** (2026-08-03, athlete-directed). Workout → tree already
worked (`bestByExercise` keys on the logged exercise id). The other direction is
`selectors.effectiveStepIndex()`: a chain step whose skill is already `achieved` — however
it was achieved, whether by a workout, the Stunts skill log, or attestation — is never
prescribed again. Chains are hardest-first, so the frontier walks from the EASIEST end and
skips achieved steps; the result is min()'d with the stored progression, so the athlete is
never regressed to something they have proven. A step with `opts` only counts as done when
EVERY option is achieved. In-step slots are exempt (stepIndex is a T-index there).

**Skill-practice log** (2026-08-03, Phase 2): the routine has three hold slots against a tree
with ~100 hold nodes, so most skill work (planche leans, tuck front levers, wall handstands) had
nowhere to be recorded and ~259 measurable nodes could never move. `AthleteState.skillLog` records
one SET of practice straight against a node id — the same key `criterionMet` already reads — with
entries on one date forming one session, so the enforced `sets` requirement is satisfied honestly.
`balance` and `attested` nodes are skipped by the producer AND hidden in the UI: self-reported reps
must not become a backdoor around locked decision #10. This supersedes PLAN-GENERATOR §8's
"author node-trainers for 245 nodes" — the athlete measuring the skill directly is both cheaper
and more honest than inferring it from a proxy exercise. Reachable-without-manual-marking went
228/557 (41%) → 525/595 (88%); the remaining 70 are the 68 attested-by-design plus 2 session-shape
exclusions.

**Rowing** (2026-08-03): the corpus never covered indoor rowing, so the erg ladder
(`row.*`, `row_speed.2k_*`) is sourced fresh and carries evidence tier D — see the note on
`rowSpeedSpecs` in `skills.ts` for the three anchors and their URLs. `CardioEntry.modality` gained
`"row"`. `row.million_meters` is the ONLY cumulative criterion in the app (`LocomotionSource.
cumulative`); every other distance is one unbroken effort and must stay that way.

**Rep prescription — R-DYN** (2026-08-02, athlete-directed): the PDF gives each chain a
single high rep band (2×25/50/100), which produces nonsense at the hard end (push-03
prescribed 2×20 *full planche push-ups*, flagged in the seed as PENDING-Q3) and, at the easy
end, rep counts far past the point where you should have advanced to a harder variation.
`src/data/prescription.ts` overlays the practitioner standard — **3 sets × 8 clean reps in
one session** (doc 01 rule R-DYN; r/bodyweightfitness RR "advance at 3×8"; Low `3×5→12`) —
on the 26 slots that are strength progressions. The 16 conditioning slots (carries, skips,
crawls, quasi-iso holds, bag rounds, metcon chains, single-step accessories) keep their PDF
doses; `CONDITIONING_SLOTS` in that file is the one place to reclassify a slot.
`seed-plan.ts` remains the untouched verbatim transcription, still pinned by
`seed-plan.test.ts` — the overlay derives from it and never mutates it. Evidence tier is
PRACTITIONER: doc 01 §5 states no controlled trials exist on progression criteria.

**Criterion `sets` is enforced** (2026-08-02): `criterionMet` previously checked only the
best single set, so a node displaying "3×8" unlocked on one hard set. R-DYN is explicitly
"3 sets × 8 in ONE session", so `ExerciseBest.sessions` now carries per-session set values
and the count is enforced. Sets across different days never add up. Skill criteria are
aligned to the plan by `buildSkills` — lowered to 3×8 where they asked for more, never
raised, so doc 01's genuine standards (planche push-up 3×3, HSPU 3×5) keep their numbers.

**Tendon pacing** (2026-08-02, athlete-directed): the straight-arm 21-day step rate limit from
addendum-2 §1.3 is now a **setting**, defaulting to `advisory`. `seedPlan.config` is unchanged at
21 days and `applySession` is unchanged; `Workout.tsx` passes `saStepRateLimitDays: 0` in advisory
mode, so the warning still renders and the advance is never blocked. The athletes are experienced
lifters and asked explicitly for guidance rather than a gate. The evidence behind the number is
undisturbed and Plan → Settings restores enforcement with one tap. This is a *presentation*
override of decision-level pacing, not a re-derivation of it — do not "simplify" it by editing the
seed config.

**Single athlete** (schema v2, 2026-08-02): storage is local-first, so two people run two
independent installs rather than sharing one device's localStorage. `AppData` holds one `athlete`
and one `state`. The v1 → v2 migration keeps the active athlete and moves the other into
`AppData.archived` — retained, never read, still exported, so upgrading cannot destroy a partner's
history.

**Deliberate deviation from doc 05**: persistence is localStorage (synchronous, ~150 KB/yr of logs
— far under the 5 MB limit) + `navigator.storage.persist()` + JSON export/import, instead of
Dexie/IndexedDB. Revisit only if photos/videos are ever added.

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
  data/skills.ts      core skill lines: doc 01 §6 + addendum-1 + addendum-2 §4 (agent B)
  data/skill-helpers.ts   shared node/criterion constructors + SectorExtension type
  data/skills-ext/*.ts    per-sector expansions (beginner on-ramps + intermediate rungs);
                          may use negative/fractional rings and `rewire` to splice prereqs
                          onto existing hubs; buildSkills() merges + normalizes per sector
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
4. **Stats** — 7-axis radar (per-sex anchored), e1RM trend lines per lift, volume heatmap,
   symmetry flags, field-test entry (8-test battery, retest nudge every 6–8 weeks). The
   DOTS-normalized two-athlete comparison was removed with the single-athlete collapse; the
   normalization itself (`dots`, `relativeStrength`) is retained for level naming.
5. **Profile** — profile chip in the header, bodyweight log, unit toggle, export/import,
   author-questions (Q1–Q8) confirmation, about/methodology page that cites the research docs
   honestly (evidence tiers).

## Build order

1. Data+algorithms workflow (agents A–E in parallel, disjoint files, vitest tests from the docs'
   worked examples: DOTS 413.7/445.4/430.2/332.6, IPF GL 84.6/67.8, Wilks 409.6 / Wilks-2020 491.5,
   band arrays N=2..7, e1RM hybrid continuity at r=8/10).
2. Cross-validation script: every `ex` id in seed-plan resolves in exercises.ts; every skill
   `exerciseId`/prereq resolves; every sector has ≥1 node; typecheck + tests green.
3. UI shell + screens (me; dataviz skill loaded before chart work; doc 05 palette).
4. Verification: build, run, screenshot; adversarial review workflow; fix; final polish.
