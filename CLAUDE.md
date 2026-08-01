# Protean

Local-first workout web app for two athletes (one male, one female): progressive
calisthenics + weights plan, fast logging, science-backed strength estimates, hex skill-tree
stunt tracker. React 19 + TypeScript + Vite + Tailwind 4, no router, no chart libs, vitest.

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
- Skill tree: core lines live in `src/data/skills.ts`; per-sector additions go in
  `src/data/skills-ext/<sector>.ts` using the constructors in `src/data/skill-helpers.ts`.
  Extensions may use negative rings for pre-hub beginner content and `rewire` to splice
  prereqs onto existing nodes; `buildSkills()` merges and normalizes rings per sector.
- Hosting: `docs/HOSTING.md` (static site, `netlify.toml` committed).
- `reference_mat/` holds the user's original PDF + hex-map image; `docs/protean-routine-source.md`
  is the faithful transcription.
