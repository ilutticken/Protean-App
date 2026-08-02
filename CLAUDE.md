# Protean

Local-first workout web app, **one athlete per install** (partners each run their own copy):
progressive calisthenics + weights plan, fast logging, science-backed strength estimates, hex
skill-tree stunt tracker. React 19 + TypeScript + Vite + Tailwind 4, no router, no chart libs, vitest.

- `npm run dev` / `npm run build` / `npm run typecheck` / `npm test`
- **Read `docs/PLAN.md` first** — architecture, module map, and the locked scientific decisions.
- `docs/research/*.md` is the evidence base. Addendum-3 supersedes conflicting constants;
  addendum-2 is the authoritative seed-plan schema. Never re-derive constants from memory —
  they were verified against sources.
- Conventions: chains are hardest-first (`stepIndex 0` = hardest, advancing decrements);
  `stepIndex`/`repBand` naming, never "tier"; all stored weights in kg **and heights in cm**
  (`src/lib/units.ts` converts for display); dates via `localISODate()` in `src/lib/dates.ts`,
  never `toISOString().slice(0,10)`; e1RM only for reps ≤ 10 (11–15 flagged, ≥16 work-capacity
  only); acrobatic skills never auto-unlock.
- **Adding content must never erase progress** (PLAN.md #14). New exercises, chain rungs, and skill
  nodes need no migration — but slot progress is keyed, not positional: read stored `SlotState`
  through `resolveSlotState()` and write it through `stampSlotState()` (`src/lib/slot-identity.ts`).
  Ids are permanent; renaming one is a migration, and migrations archive rather than drop.
- Goal stunts (PLAN-GENERATOR.md §9.2): `one_arm_pushup.oap`, `front_lever.full`, `human_flag.full`,
  `hspu.free_hspu`, `barbell_deadlift.2_0xbw`, `pistol_squat.pistol_half_bw`.
- Every routine exercise must credit a tree node — the invariant is "0 orphans, 0 dead slots"
  (PLAN-GENERATOR.md §9.6). New slot exercises need a node whose id IS the exercise id. Node names
  must pack into 2 lines for the hex map; `skills-ext.test.ts` enforces it.
- **`seed-plan.ts` is the verbatim PDF and is never edited for training numbers.** What the
  app prescribes comes from `src/data/prescription.ts` (R-DYN 3×8 on strength progressions,
  PDF doses on conditioning). Read the plan via `prescription.plan`, not `seedPlan.days`.
- A criterion's `sets` is **enforced** — N qualifying sets in ONE session (doc 01 R-DYN).
- Straight-arm pacing is **advisory by default** — warn, never block (PLAN.md "Tendon pacing").
- Runs/swims have no home in the routine: `AthleteState.cardioLog` is the sole producer for the
  tree's `time`/`distance` nodes, via `src/data/locomotion-sources.ts` (explicit allowlist — a new
  locomotion node must be registered there or excluded with a reason) and `src/lib/locomotion.ts`.
- Skill tree: core lines live in `src/data/skills.ts`; per-sector additions go in
  `src/data/skills-ext/<sector>.ts` using the constructors in `src/data/skill-helpers.ts`.
  Extensions may use negative rings for pre-hub beginner content and `rewire` to splice
  prereqs onto existing nodes; `buildSkills()` merges and normalizes rings per sector.
- Hosting: `docs/HOSTING.md` (static site, `netlify.toml` committed).
- `reference_mat/` holds the user's original PDF + hex-map image; `docs/protean-routine-source.md`
  is the faithful transcription.
