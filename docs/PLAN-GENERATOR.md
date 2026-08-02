# PLAN-GENERATOR — "Train toward a stunt"

Scoping document. Status: **proposal, nothing implemented**. Author date 2026-08-01.
Read alongside `docs/PLAN.md` (13 locked decisions — none may be violated by anything below).

---

## 1. Problem & goal

The user asked, verbatim: *"Are the workouts pulled from the stunt list such that doing the workouts
will mark off stunts?"* Today the answer is "partly, by coincidence". `src/data/seed-plan.ts` is a
verbatim transcription of a PDF routine; `src/data/skills.ts` + `src/data/skills-ext/*.ts` are a
501-node atlas of everything an athlete might ever train. They overlap where an author happened to
reuse an id, not because one was derived from the other. What is wanted is the inverse relationship:
**pick a target stunt, and the app makes the week's training the path up the tree toward it** —
every logged set should visibly move a node the athlete chose to pursue.

Ship these three numbers on Stats and treat them as acceptance criteria:

| Metric | Definition | Today | Target |
|---|---|---|---|
| **Credited-set rate** | % of logged sets whose `EntryLog.exerciseId` credits ≥1 tree node | ~71% (42/144 plan exercises credit nothing) | ≥95% |
| **Goal-relevant set rate** | % of logged sets crediting a node on the *active target's* prerequisite closure | 0% (no goal exists) | ≥40% of weekly hard sets |
| **Frontier motion** | nodes moved `available`→`in-progress`→`achieved` per 4-week block on the active path | n/a | ≥2 |

Non-goals: replacing the progression engine (`src/lib/progression.ts` stays authoritative for
band targets and R-rules), auto-programming acrobatics, or building a periodization-model selector
(`docs/research/03-programming-science.md` §2 — structure beats model, SMD ≈ 0).

---

## 2. Current-state analysis

### 2.1 How Plan and Tree touch today

There is exactly one seam: `src/lib/selectors.ts::bestByExercise()` keys bests by
`EntryLog.exerciseId`, and `src/lib/skilltree.ts::criterionMet()` reads `bestByExercise[node.id]`.
So **a node auto-marks iff its id is literally an exercise id the athlete logged**, plus two
indirections: the 23-entry `src/data/skill-exercise-alias.ts` republish, and `e1rmByLift` for
`e1rm-ratio` criteria. Slot progression and tree credit are deliberately decoupled (PLAN.md
decision 5, addendum-2 §1.4) — that is correct and should stay.

### 2.2 Measured coverage (audit numbers, plus this document's recount)

| Bucket | Nodes | Why |
|---|---|---|
| Auto-marked by doing the routine | **126 / 501 (25%)** | 99 direct id match · 22 via alias · 5 via e1RM |
| No logged source at all | **245 (49%)** | measurable criteria, no producer anywhere |
| Attested-only (by design) | **68** | acrobatics / `balance` sector, NO_AUTO_UNLOCK (addendum-1 §0) |
| Locomotion, no producer wired | **41** | `time` / `distance` criteria; `SkillTreeInput.locomotionBest` is never populated — `skillStatuses()` in `selectors.ts` does not pass it |
| Need the quick lift-log | **21** | `e1rm-ratio` on `squat`/`bench`/`deadlift`, plus `power_clean`/`clean_and_press`/`snatch` which have **no producer at all** (`e1rmByLiftForTree` maps only squat/bench/deadlift/ohp) |

Recounted here with the NO_AUTO_UNLOCK filter applied: 98/22/5 = 125 credited, 246 sourceless —
within ±1 of the audit, same conclusion. The sourceless nodes are **135 `reps`, 100 `hold`,
11 `weighted-reps`**. The 5 e1RM-credited nodes show how thin the seam is: they are the entire
`barbell_ohp.*` ladder, credited only because `standardsKeyByExercise["push.shoulder_press"] =
"ohp"` and Shoulder Press is the band-2 step of `push-02`. That is the routine's *only* e1RM producer.

### 2.3 The other direction: routine exercises that credit nothing

**42 of the 144 exercise ids** referenced by the seed (chains + opts + warm-up + mobility) match no
node and are no alias's target. **Six whole slots credit zero nodes at any chain step**: `pull-07`
(all four curls), `pull-09` (`qi.pullup`/`qi.row`/`qi.band_row`), `full-04` (all four bag-spin/halo
opts), `full-05` (`power.db_runner`), `full-06` (`pull.overhand_curl`), `full-08` (both face-pull
opts). Partial orphans include 3 of push-04's 5 steps (`core.lalanne_pushup*`,
`core.walkout_plank`), `pull.kipping_pullup`, `pull.explosive_pullup_weighted`, `pull.wall_climb`,
`squat.lunge_walk`, `squat.skater_hop`, `cond.backward_jog/walk`, `power.medball_slam`,
`power.sledgehammer`, `power.band_woodchopper`, `cond.sandbag_tug_crawl`.

### 2.4 Headline stunts

21 nodes carry `isStunt: true`. The audit found 4 auto-reachable. Applying the prerequisite gate
(`computeSkillStatuses` requires *every* prereq `achieved`), the picture is harsher: **8 stunts have
a producer for their own criterion**, and **exactly one — `barbell_bench.1_5xbw` — has a fully
creditable prerequisite closure**, and that path runs entirely through the quick lift-log, not the
routine. Everything else is blocked mid-chain:

| Stunt | Own producer | Closure | Uncredited in closure |
|---|---|---|---|
| `barbell_bench.1_5xbw` | lift-log | 4 | **0** |
| `barbell_ohp.1_0xbw` / `barbell_deadlift.2_0xbw` | lift-log | 6 / 8 | 1 each (`ohp_base.band_press`, `posterior_base.glute_bridge_hold`) |
| `barbell_squat.2_0xbw` | lift-log | 10 | 2 (`squat_base.chair_stand`, `squat_base.box_squat`) |
| `pistol_squat.pistol_half_bw` | alias | 18 | 11 |
| `one_arm_pushup.oap` / `hspu.free_hspu` | routine | 20 / 32 | 14 / 23 |
| `front_lever.full` / `planche.full` | none | 24 / 25 | 14 / 20 (8 `sa` each) |
| `one_arm_pullup.one_arm_pullup` | none | 28 | 13 |
| `iron_cross.iron_cross` / `maltese.full` | none | 73 / 79 | 52 / 58 |

### 2.5 Structural reasons for the gap — four distinct problems

1. **Different provenance.** The plan is transcribed from `reference_mat/Printable-Routines.pdf`
   (`seedMeta.source`); the tree is a superset atlas from `docs/research/01`+`06-addendum-1`.
   Nothing reconciled them — `src/data/crossref.test.ts` check 5 only asserts a *non-empty
   intersection* per namespace.
2. **Node ids vs exercise ids.** Credit is string identity. Every on-ramp rung in `skills-ext/*`
   (`pull_base.pullup3`, `squat_base.box_squat`, `pushup_base.partial_pushup`) invented a new id and
   can never auto-mark. `skill-exercise-alias.ts` patches 23 by hand (22 of which the routine can
   actually reach — `posterior_base.hip_thrust_2x` aliases to `barbell.hip_thrust`, which the
   routine never trains); 245 remain.
3. **Nodes that are positions, not slots.** 100 sourceless nodes have `hold` criteria
   (`planche.lean`, `planche.tuck`, `front_lever.tuck_10s`, `handstand.wall_hs`,
   `ring_base.support_60s`). The routine has **three** hold slots (`legs-12`, `pull-08`, `pull-09`)
   plus one iso spec — there is nowhere in the week to log a tuck-planche hold.
4. **Missing producers.** `selectors.skillStatuses()` never passes `locomotionBest`, so all 41
   `time`/`distance` nodes are dead; `e1rmByLiftForTree` never emits `power_clean`,
   `clean_and_press`, `snatch`, or `curl`.

---

## 3. Design options

### Option A — "Annotation only"

Keep the 42 slots exactly as authored. Build a static **credit map** `slotId → nodeIds[]` and show
it: on Plan, "this slot feeds Pull-Up ×10, Weighted Pull-Up +25%"; on the session summary, "you
moved 3 nodes, achieved 1".

*Sketch:* one pure module `src/lib/credit.ts` exporting `nodesCreditedBy(exerciseId)` (inverting
`skillExerciseAlias` + `standardsKeyByExercise`) and `sessionCredit(session)` diffing
`computeSkillStatuses` before/after. No new state, no schema change.

**+** Ships in days, zero safety surface, answers "do my workouts mark off stunts?" honestly, and
exposes the 42 orphans and 6 zero-credit slots. Prerequisite for B and C anyway.
**−** Does not answer "train *toward* a stunt" — no goal, no adaptation; coverage stays at 25%.
**Effort: 1–2 days.**

### Option B — "Goal-weighted substitution" *(recommended)*

Keep the 5-day skeleton, the 42 slot ids, and `SlotState` untouched. Add a per-athlete **target
stunt**. From the target, compute the prerequisite **frontier**, then (i) bias which chain step
each slot prescribes toward frontier-crediting steps, (ii) append at most **2 goal accessory
slots** per week for frontier nodes no existing slot can train, (iii) surface "this session moves
X toward Y" everywhere.

*Sketch:* `src/lib/goal.ts` (frontier + planner, pure) + `src/data/node-trainers.ts` (the node→
prescription table that fixes the 245) + a `PlanOverlay` computed per session and consumed by
`Workout.tsx`. The seed plan is never mutated; the overlay is a function of
`(seedPlan, AthleteState, target)`.

**+** Preserves the PDF routine verbatim (reverting = drop the overlay); volume/pattern balance is
inherited from a week already validated against doc 03 §14; small blast radius — `Workout.tsx`
still calls `targetFor`/`applySession` unchanged; guardrails apply to ≤2 accessory slots, not 42
generated ones.
**−** Needs the `node-trainers.ts` authoring effort (the real cost); biasing is coarse, and some
frontier nodes have no plausible host slot.
**Effort: 3–4 weeks**, ~1.5 of which is authoring node trainers for 245 nodes.

### Option C — "Full generator"

Synthesize the week's slots from the target's prerequisite path: pick 8–12 frontier nodes, turn
each into a Slot, bin-pack them into 5 days under volume/frequency/pattern constraints, and drop
the seed plan to a fallback.

*Sketch:* `generateWeek(target, state, config): Record<DayId, Slot[]>` producing synthetic slot ids
(`gen-pull-01`), with its own `SlotState` namespace and a weekly re-plan trigger.

**+** Maximal goal-relevant set rate (could exceed 80%); handles targets the fixed routine cannot
serve at all (iron cross, manna, marathon).
**−** Every constraint in doc 03 becomes the generator's responsibility (MEV/MAV/MRV, ≥2×/wk
frequency, pattern coverage, interference ordering, `sa` pacing); discards a routine the user
personally transcribed; cold-start is bad — with 245 nodes untrainable the early generated weeks
are *thinner* than the seed; `SlotState` keyed by generated ids churns on every re-plan, so
progression history fragments.
**Effort: 8–12 weeks**, and it is the option most likely to produce a *worse* week than the
existing one.

### Recommendation

**Ship A as Phase 1, then B.** Rationale: the binding constraint is not the scheduler, it is the
**node→exercise mapping** — 49% of the tree is untrainable by *any* algorithm today. Both B and C
need `node-trainers.ts`; only B gets value out of it without also re-deriving a week that doc 03
§14 already validated. C stays a documented Phase 5 escape hatch behind a flag, for targets
(marathon, iron cross) the fixed routine genuinely cannot serve.

---

## 4. The algorithm (Option B)

### 4.1 Prerequisite frontier

```
frontier(target, statuses):
  path  = transitiveClosure(target.prereqs) ∪ {target}        // DAG, AND semantics
  front = { n ∈ path : statuses[n] ≠ "achieved"
                     ∧ ∀p ∈ skills[n].prereqs : statuses[p] = "achieved" }
  // depth = longest remaining chain from n to target; used for ordering
  return sortBy(front, n => -depth(n, target))
```

`skills` is already a `Record<id, SkillNode>` with `prereqs: string[]`; `computeSkillStatuses`
already yields the statuses. Cycle-safety: `src/data/skills.test.ts` enforces strictly increasing
rings along every edge, so the graph is a DAG — but memoize anyway.

Frontier sizes are small and tractable: `front_lever.full` has a 24-node path, of which 8 are
`sa:true`; `pistol_squat.pistol_half_bw` has 18.

### 4.2 Node → trainable prescription (the hard part)

New table `src/data/node-trainers.ts`. This is *authoring*, not inference — the same discipline as
`skill-exercise-alias.ts`, and its SAFETY RULE (never draw from an easier movement) carries over.

```ts
export interface NodeTrainer {
  nodeId: string;
  exerciseId: string;          // must resolve in src/data/exercises.ts
  slotType: SlotType;          // "chain" | "timed_hold" | "quasi_iso" | "rounds"
  unit: SlotUnit;
  sets: number;                // from criterion.sets ?? 3 (doc 01 §0.3 R-DYN/R-STAT default)
  entryTarget: number;         // R-DYN: 5 reps · R-STAT: 10 s · R-STAT-HARD: 5 s
  exitTarget: number;          // R-DYN: 8 · R-STAT: 30 · R-STAT-HARD: 10–15
  perSide?: boolean; sa?: boolean; loadable?: boolean;
  hostSlots?: string[];        // seed slots that can host this instead of an accessory slot
}
```

Resolution order for any frontier node `n`:

1. **`exercises[n.id]` exists** → direct; 98 nodes; targets come from the criterion.
2. **`skillExerciseAlias[n.id]` exists** → alias; 22 nodes.
3. **`nodeTrainers[n.id]` exists** → new catalog exercise + prescription; covers the 245.
4. **`criterion.kind === "e1rm-ratio"`** → not a slot: emit a *lift-log prompt* ("test your
   deadlift") on Stats. Never schedule a 1RM inside a normal week (doc 03 §8.2: test week only).
5. **`criterion.kind === "time" | "distance"`** → not a slot: emit a *locomotion entry prompt*,
   and wire `locomotionBest` into `selectors.skillStatuses()` (a 41-node fix worth doing in Phase 1
   regardless).
6. **`criterion.kind === "attested"` or `sector === "balance"`** → **never trainable**; the planner
   must exclude these from the frontier entirely and route the user to the attestation checkbox
   (PLAN.md decision 10, addendum-1 §0).

Entry/exit targets follow doc 01 §0.3: R-DYN 3×5→3×8; R-STAT 3×10 s→3×30 s; **R-STAT-HARD
3×10–15 s for elite straight-arm statics — never wait for 30 s** (adv-tuck planche onward,
straddle FL onward). Getting this wrong makes `planche.adv_tuck` unreachable.

The 42 orphans are fixed from the same table in reverse — add the missing node (`pull.curl` → a
`curl_base.*` rung) or an alias. `pull-07`/`full-06` (five curls) and `full-08` (face pulls)
plausibly want new `back_chain` nodes; `full-04` and `full-05` may legitimately stay uncredited —
they are conditioning, and inventing nodes to flatter the metric would be a dark pattern (open
question 5).

### 4.3 Slot biasing

For each seed slot `s` and its `SlotState`:

```
biasSlot(s, state, front, athlete):
  candidates = [ i for i in 0..s.chain.length-1
                 if creditsFrontier(step(s,i), front) ]
  if candidates empty: return state.stepIndex          // untouched
  best = argmin_i |i - state.stepIndex|                // nearest step, not hardest
  // feasibility: never jump more than one step, and never past a failed landing
  if |best - state.stepIndex| > 1: return state.stepIndex
  if best < state.stepIndex and blockedByGuards(s, state, best): return state.stepIndex
  return best
```

`blockedByGuards` reuses `progression.ts` semantics verbatim: `cooldownUntil`, and the
`saStepRateLimitDays = 21` check when either the current or destination step has `sa: true`. The
planner **suggests**; `applySession` remains the only writer of `SlotState.stepIndex` on the
advancement path, so a biased suggestion the athlete cannot hit degrades through R-LAND normally
(revert + 14-day cooldown).

### 4.4 Accessory slots and the week

At most `MAX_GOAL_SLOTS = 2` accessory slots per week (doc 03 §10: "≤2 concurrent priority skills"
— stacking 3 straight-arm progressions is the best-documented failure mode). Placement is fixed by
doc 03 §10 and §14: **skill work immediately after the warm-up, before all strength work**,
10–15 min, RIR 4–6, 3–6 sets of 5–15 s for statics.

```
planWeek(target, state, seed, config):
  front   = frontier(target, statuses) minus attested/balance nodes
  if count(front where sa) > 2: front = front.take(2, preferring sa)   // doc 03 §10
  overlay = {}
  for day in seed.config.weekOrder:
    for slot in seed.days[day]:
      overlay.steps[slot.id] = biasSlot(slot, state.slotState[slot.id], front, athlete)

  unhosted = [ n in front : no seed slot chain step credits n ]
  goalSlots = []
  for n in unhosted (ordered by depth, then by sector diversity):
      t = resolveTrainer(n);  if !t: continue
      d = dayFor(t.exerciseId)                     // sector/pattern → day, see below
      if violatesVolume(d, t) or violatesFrequency(t) or violatesSa(n, state): continue
      goalSlots.push(makeSlot(n, t, d)); if goalSlots.length == MAX_GOAL_SLOTS: break

  // pattern-balance invariant: the overlay may never REMOVE a pattern
  assert patternsCovered(overlay ∪ goalSlots) ⊇ patternsCovered(seed)
  return { overlay, goalSlots, reasons }             // reasons drive the UI copy
```

**`dayFor`**: map `exercises[id].pattern` to the day whose seed slots share that pattern — the seed
week is already `vertical-pull`→pull, `horizontal-push`→push, `squat`/`hinge`→legs,
`power`/`locomotion`→fullbody. Straight-arm skill work goes on Pull (front lever) or Push (planche)
per doc 03 §14's day table, never both in one week.

**`violatesVolume`** — fractional set counting, direct 1.0 / indirect 0.5 (doc 03 §3.1, the
counting rule the meta-regression used):

| Check | Threshold | Source |
|---|---|---|
| Per session, per muscle | soft warn >10, hard block >13 fractional sets | doc 03 §3.2 (≈11-set plateau) |
| Per week, per muscle | green 10–18, amber 19–24, **block >24 (MRV)** | doc 03 §3.2 |
| Below MEV | 8–12 weekly sets — warn, don't block | doc 03 §3.2 |
| Frequency floor | every major muscle ≥2×/week — accessory slots may not push a pattern below it | doc 03 §4 |

Crossing MRV without explicit override is forbidden (doc 03 §3.2, final bullet), so **accessory
slots reallocate, they do not add**: if a goal slot pushes `vertical-pull` past MAV, the planner
drops a *set* from the lowest-depth non-goal slot of the same pattern instead of exceeding the ceiling.

**`violatesSa`** — the tendon clock, four mandatory rules: ≤1 chain-step advance per **21 days** on
any `sa: true` step (`PlanConfig.saStepRateLimitDays`; doc 03 §12, doc 01 §2.1's 3–4-week dwell);
≤2 concurrent `sa` priority skills (doc 03 §10); week-over-week straight-arm static TUT capped at
**+10–15%** (doc 01 §2.1, "the highest-value safety constant in the system"); elite straight-arm
nodes (`maltese.*`, `iron_cross.*`) blocked from the frontier until a **12-week tendon block** is
complete (doc 03 §12, PLAN.md decision 6).

**Interference** (doc 03 §9): within a generated day the block order is skill → power/plyo → heavy
strength → hypertrophy → conditioning. A goal slot with `pattern: "power"` must be inserted before
any `locomotion`/conditioning slot, because power is the only quality with real interference
(−28%, worst same-session); strength/hypertrophy interference is ≈0 and must **not** be warned about.

### 4.5 Worked example — target `front_lever.full`

Frontier at zero history = `{pull.dead_hang, pull.band_pull}` (both routine-credited, both already
in `pull-08`/`pull-03`). After the pull-up ladder is achieved, the frontier becomes
`{front_lever.tuck_hang}` → `{front_lever.tuck_10s}` → `{front_lever.tuck}` … all `sa`, none
trainable today. `pull-04` already contains `front_lever.fl_flutter` and
`front_lever.tuck_fl_kick` (both `sa: true`), so the overlay biases `pull-04` to step 1
(`tuck_fl_kick`) and adds **one** accessory `timed_hold` slot for `front_lever.tuck_hang`
(3×10 s→3×30 s, R-STAT) on Pull day, immediately after warm-up. Total new weekly volume: 3 sets,
counted 1.0 to lats / 0.5 to core — inside MAV. The next `sa` advance is blocked for 21 days.

---

## 5. Data model changes

### 5.1 New types (`src/lib/types.ts`)

```ts
export interface GoalState {
  targetNodeId: string;            // must exist in skills; never attested/balance
  startedDate: string;             // ISO; drives the 12-week tendon clock for sa targets
  paused?: boolean;
}

export interface GoalSlot extends Slot {
  goalNodeId: string;              // the frontier node this slot exists to train
  generated: true;                 // marks it non-seed for storage + analytics
}

export interface PlanOverlay {
  targetNodeId: string;
  stepBias: Record<string, number>;                          // seed slot id -> suggested stepIndex (advisory)
  goalSlots: Record<Exclude<DayId, "mobility">, GoalSlot[]>;
  credits: Record<string, string[]>;                         // slot id -> node ids it credits, for the UI
  reasons: string[];                                         // "held pull-04 at step 2 — sa 21-day limit (14 d left)"
}

// AthleteState gains exactly one optional field; nothing else changes.
export interface AthleteState { /* … */ goal?: GoalState }
```

`SlotState` is reused verbatim for `GoalSlot`s: ids are namespaced `goal:<nodeId>` so they never
collide with `legs-01`…`full-11`, and `AthleteState.slotState` holds them alongside seed slots.
Because the id derives from the *node*, not from a plan revision, `confirmCount` /
`lastAdvanceDate` / `cooldownUntil` **survive re-planning** — the failure mode that sinks Option C.
`EntryLog` and `SessionLog` are **unchanged**: credit stays derived, so no history is invalidated
and `bestByExercise` keeps working exactly as today.

### 5.2 New modules

| File | Contents |
|---|---|
| `src/lib/credit.ts` | `nodesCreditedBy(exerciseId)` (inverse index over `skills` + `skillExerciseAlias` + `standardsKeyByExercise`), `sessionCredit(before, after)` |
| `src/lib/goal.ts` | `frontier()`, `biasSlot()`, `planWeek()`, `volumeCheck()` — all pure, no React |
| `src/data/node-trainers.ts` | the `NodeTrainer` table (+ new catalog entries in `exercises.ts`) |
| `src/lib/volume.ts` | fractional per-muscle set counting (doc 03 §3.1) + a `muscleMap` per exercise |

`src/data/exercises.ts` grows: every `NodeTrainer.exerciseId` must resolve there, with `pattern`,
`planes`, and `bwLoadFactor` per the existing conventions (addendum-3 §6 constants only; estimates
must stay commented as estimates).

### 5.3 Storage migration

`SCHEMA_VERSION` in `src/lib/storage.ts` goes **1 → 2**; the migration is additive and total —
`migrations[1] = (d) => ({ ...d, version: 2 })`, since `AthleteState.goal` is optional and nothing
needs backfilling. No v1 field is reinterpreted, so importing an older backup stays lossless;
`load()` already runs the migration chain and `importJson` already tolerates the version bump.

---

## 6. UI/UX changes

Conventions from `docs/research/05-ux-design.md`: ≤3 taps per set (§8), opt-in comparison (§5.2),
no dark patterns (§2), bottom sheets not modals (§4.3), never navigate away from the log (§1).

**Stunts (`src/ui/screens/Stunts.tsx`)** — the goal is *set here*, at the point of desire. The node
bottom sheet gains a primary **"Train toward this"** action on any node that is not attested/balance
(those keep only the attestation checkbox), plus a **path preview** (`N steps · M achieved · next
up: <frontier node>`) and, for `sa` nodes, an honest tendon note ("one step per 3 weeks, 12-week
tendon block first — doc 03 §12"). Setting a goal replaces the prior one via a confirm sheet; no
streak, badge, or penalty is attached to it.

**Today (`src/ui/screens/Today.tsx`)** — a **goal chip** under the day card (target name, sector hue,
`3 of 24 on the path`) and one line of forecast copy: *"Today's Pull moves Tuck Front Lever and
Pull-Up ×10."* If a guard is holding a step back, say so instead of silently complying:
*"Front-lever step held 14 more days (tendon pacing)."* No notification changes.

**Workout (`src/ui/screens/Workout.tsx`)** — a small sector-hue badge per slot listing credited nodes
(tap → node sheet, without leaving the workout). Goal slots render first, labelled **Skill — goal**,
RIR 4–6 shown (doc 03 §10 placement). **The logging flow is untouched**: 1 tap on ✓ with ghosts,
same `targetFor`/`applySession`. The existing session summary gains a "moved toward *target*"
section — nodes newly `in-progress` / `achieved`, achieved ones using the existing node-unlock ring
animation (doc 05 §7.3), reduced-motion respected.

**Plan (`src/ui/screens/PlanScreen.tsx`)** — goal banner with a **"Plain Protean Routine"** toggle:
off = overlay discarded, every slot renders exactly as today, and the goal is *remembered* rather
than deleted, so the toggle is reversible and lossless. Each slot card gains a "credits" line
(slots that credit nothing say so: "no tree node — conditioning"), and `reasons[]` renders in a
collapsible "Why this week looks like this" — the anti-dark-pattern requirement (doc 05 §2): every
automated decision is visible and overridable.

**Stats (`src/ui/screens/Stats.tsx`)** — the three §1 metrics plus the lift-log/locomotion prompts
from resolution steps 4–5 ("your deadlift hasn't been tested in 9 weeks — 3 nodes wait on it").
Everything above is per-athlete (`AthleteState.goal`) in the active accent; goals are never compared
or ranked (doc 05 §5.2).

---

## 7. Safety & scientific guardrails — what the generator must NEVER do

| # | Never | Source |
|---|---|---|
| 1 | Advance an `sa: true` chain step or goal slot within **21 days** of the last advance | PLAN.md decision 6; doc 03 §12; doc 01 §2.1 (3–4 wk dwell) |
| 2 | Run more than **2 concurrent straight-arm priority skills** | doc 03 §10 |
| 3 | Let an elite straight-arm node (`maltese.*`, `iron_cross.*`, `planche.straddle`+) enter the frontier before a **12-week tendon block** | doc 03 §12; PLAN.md decision 6 |
| 4 | Raise straight-arm static TUT more than **+10–15% week over week** | doc 01 §2.1 |
| 5 | Push any muscle over **MRV (18–25 weekly fractional sets)**, or past **13 fractional sets in one session**, without explicit override | doc 03 §3.2 |
| 6 | Drop a `MovementPattern` present in the seed week — the overlay may only re-weight | doc 03 §4 (≥2×/wk floor), doc 04 §1.2 taxonomy |
| 7 | Auto-program or auto-unlock anything in `sector: "balance"` or with `criterion.kind === "attested"` (flips, tumbling) | PLAN.md decision 10; addendum-1 §0 |
| 8 | Derive an e1RM from a set of **>15 reps**, or let an 11–15-rep estimate set a headline/unlock | PLAN.md decision 1; `selectors.liftAggregates` already enforces `reps > 15 → skip` and `confidence === "full"` |
| 9 | Schedule a 1RM test inside a normal training week, or any advancement during a deload | doc 03 §8.1/§8.2; `DELOAD_PRESCRIPTION.chainAdvancement === false` |
| 10 | Prescribe near-failure work on skill slots (must be RIR 4–6, 50–70% of max) | doc 03 §6.2, §10 |
| 11 | Put conditioning/power in an order that costs power (−28% interference) — power before conditioning, always | doc 03 §9 |
| 12 | Warn the user that conditioning "kills gains" — interference on strength/hypertrophy is ≈0 | doc 03 §9 rule 1 |
| 13 | Bias a slot more than **one chain step** from its current `SlotState.stepIndex`, or override a `cooldownUntil` | addendum-2 §1.3 R-LAND/R-STEP |
| 14 | Silently change the plan — every planner decision must appear in `PlanOverlay.reasons` | doc 05 §2 (no dark patterns) |

---

## 8. Phasing

**Phase 1 — make credit visible, complete the producers *(≈1 week)***. `src/lib/credit.ts`; credit
badges on Plan and in the session summary; wire `locomotionBest` into `selectors.skillStatuses()`
(+ a locomotion entry UI) — unlocking **41 dead nodes**; handle or explicitly document
`power_clean`/`clean_and_press`/`snatch` as manual. No schema change; independently valuable
because it literally answers the user's question.
*Tests:* `credit.test.ts` — every seed exercise id maps to a (possibly empty) node list; the inverse
index round-trips `skillExerciseAlias`; a pinned count of zero-credit slots so it can only go down;
extend `crossref.test.ts` with "every alias target is a real exercise".

**Phase 2 — node trainers + orphan closure *(≈1.5–2 weeks, mostly authoring)***.
`src/data/node-trainers.ts` for the 245 sourceless nodes (stunt closures first — `iron_cross` +
`maltese` alone are 110 of them); new catalog exercises; new nodes/aliases for the 42 orphans where
warranted.
*Tests:* every `NodeTrainer.exerciseId` resolves in `exercises.ts`; entry/exit targets obey doc 01
§0.3 (R-STAT-HARD nodes must not carry a 30 s exit); no trainer maps a node to an *easier* movement
(`skill-exercise-alias.test.ts`'s safety rule, generalised); coverage assertion ≥400/501 credited.

**Phase 3 — goal state, frontier, overlay *(≈1.5 weeks)***. `GoalState`, `SCHEMA_VERSION` 2 +
migration, `src/lib/goal.ts` (`frontier`, `biasSlot`), Stunts "Train toward this", Today goal chip,
Plan banner + plain-routine toggle. **No accessory slots yet** — biasing only, so the volume profile
is provably unchanged.
*Tests:* `goal.test.ts` — frontier with no history = the target's ring-0 roots; achieving a node
moves the frontier one layer; attested/balance nodes never appear; biasing never moves >1 step,
never violates `cooldownUntil`, never advances an `sa` step inside 21 days (reuse
`progression.test.ts` fixtures); v1→v2 migration is lossless.

**Phase 4 — accessory slots + volume governor *(≈1.5 weeks)***. `src/lib/volume.ts` fractional
counting + muscle map; `planWeek` with `MAX_GOAL_SLOTS = 2`, reallocation instead of addition,
interference ordering; goal slots in `Workout.tsx`; `reasons[]` UI.
*Tests:* fractional counting reproduces doc 03 §14's weekly check (quads 12–16, lats 14–18, chest
12–16); property test — for 50 random athlete states × all 21 stunt targets, every generated week
satisfies all 14 guardrails in §7.

*(Phase 5, optional/unscheduled: Option C behind a flag, for marathon/swim/iron-cross targets the
fixed routine cannot serve.)*

---

## 9. Open questions for the user

1. **Replace or coexist?** Does a goal-driven plan *replace* the Protean Routine, or ride on top of
   it as assumed here (5-day skeleton intact, ≤2 added slots, one-tap revert)? If the routine is
   negotiable, the accessory budget can be far larger.
2. **PDF fidelity.** Must `seed-plan.ts` stay the verbatim default forever (it is pinned by
   `seed-plan.test.ts` and `seedMeta.source`)? If yes, all adaptation must be overlay-only — the
   assumption §4 is built on.
3. **One goal per athlete, or one shared?** Separate goals are trivial (`AthleteState` is already
   per-athlete); a shared "we're both chasing the front lever" needs a new top-level field.
4. **Volume reallocation budget.** (a) 0% — bias chain steps only; (b) ≤2 added slots, no removals
   (net volume +~6%); (c) ≤2 added slots with equal removals (net flat). This doc assumes (c).
5. **The 42 orphan exercises.** For `full-04` (bag spins/halos), `full-05` (dumbbell runner),
   `pull-07`/`full-06` (five curls), `full-08` (face pulls): invent tree nodes so they credit
   something, or leave them as honest conditioning that credits nothing?
6. **Which stunts actually matter?** Of the 21 `isStunt` nodes, which 2–4 are real ambitions?
   Phase 2's authoring order should follow that answer, not node count.
7. **Barbell access.** Four stunts are pure `e1rm-ratio` and 21 nodes need the quick lift-log. Is
   there a barbell? If not, those nodes should be visibly *deferred*, not permanently `locked`.
8. **Tendon-block consent.** For `sa` targets this mandates a 12-week tendon block before elite
   nodes unlock. Hard gate, or advisory with an override?

---

## 10. Risks

| Risk | Why it could be worse than today | Mitigation |
|---|---|---|
| **Goal myopia** — biasing every slot toward one target hollows out the other 8 sectors | The seed week's balance was validated against doc 03 §14; a target-biased week may not be | Guardrail §7.6 (never drop a pattern) enforced as a hard assertion in `planWeek`, plus the ≤2 accessory-slot cap |
| **Tendinopathy** — the tree's shortest path to a stunt is often straight-arm | Calisthenics injury load is 1.288/1000 h, >73% upper-limb, mean 40 days lost (doc 01 §2.1) | Guardrails §7.1–§7.4; frontier excludes elite `sa` nodes pre-tendon-block; UI states the 21-day clock rather than hiding it |
| **Bad `node-trainers.ts` entries** unlock hard skills from easy work | A single wrong mapping silently marks a stunt achieved — worse than 25% coverage, because it is *false* | Port `skill-exercise-alias.ts`'s SAFETY RULE verbatim; test that no trainer's exercise has a lower `bwLoadFactor` than the node's own line; "when in doubt, leave unmapped" |
| **Overpromising ETAs** | doc 03 §10 names this the main UX failure mode for planche apps ("years typical") | Show `estMonths` ranges as-is, never a countdown; path preview shows *steps remaining*, not dates |
| **Chasing the coverage metric** | Inventing nodes so `full-04` credits something inflates §1's metrics without training anything | Open question 5 puts the call with the user; the metric is credited-set *rate*, and conditioning slots are allowed to score zero |
| **Two athletes, one device, two overlays** | A mis-attributed set now also mis-moves a goal | The existing "reassign last set" affordance (doc 05 §5.1) must also recompute credit; accent color on the ✓ stays the guard rail |
| **Scope creep into Option C** | The generator is the fun part; the mapping table is the valuable part | Phase gates: Phase 4 may not start until Phase 2's coverage assertion (≥400/501) is green |
