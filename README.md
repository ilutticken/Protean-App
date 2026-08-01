# Protean ⬡

A local-first training app for two athletes sharing one device: **The Protean Routine** as a
progressive chain-based plan, a fast workout logger, science-backed strength estimates, and a
hexagonal stunt skill tree (218 nodes across 9 movement families).

## Run it

```bash
npm install
npm run dev        # open the printed localhost URL
```

Everything is stored in your browser (localStorage) — no server, no account. Use
**Plan → Export backup** regularly; import restores everything.

Want it on a real URL? See [docs/HOSTING.md](docs/HOSTING.md) — `npm run build`, then drag the
`dist` folder onto <https://app.netlify.com/drop>. Free, no account needed to try.

Metric or imperial: each athlete picks their own units (kg/cm or lb/ft·in) at onboarding, and can
switch any time in **Plan → Settings**.

## What's inside

| Screen | What it does |
|---|---|
| **Today** | Next planned day, weekly streak (≥4 sessions/week — never daily guilt), shared PR feed, deload alerts |
| **Workout** | Warm-up + guided 4×7s overcoming-isometric timer, chain slots with ghost values, 1-tap set logging, auto rest timer, auto chain progression |
| **Stunts** | Pan/zoom hex skill map — unlock criteria per node, tendon-safety pacing on straight-arm work, attestation-only unlocks for flips |
| **Stats** | e1RM trends with strength levels, volume heatmap, 7-axis domain radar vs sex-specific norms, opt-in DOTS-normalized comparison |
| **Plan** | The full routine as chain boards, seeded defaults (Q1–Q8) to confirm, settings, backup, methodology |

## The science, honestly

All numbers trace to `docs/research/` (8 sourced reference docs, built and cross-checked by
research agents on 2026-08-01). Highlights: e1RM uses the Brzycki/Epley hybrid capped at 10 reps
(11–15 flagged, ≥16 never estimated); bodyweight moves convert via force-plate load fractions;
levels interpolate strengthlevel.com sex-specific tables at your actual bodyweight; cross-athlete
comparison is DOTS-normalized; chain advancement needs 2 consecutive target sessions; straight-arm
progressions are rate-limited to 1 step / 3 weeks for tendon adaptation; acrobatic skills never
auto-unlock. Where evidence is practitioner-grade rather than peer-reviewed, the data says so
(evidence tiers A–D).

## Development

```bash
npm run typecheck   # strict TS
npm test            # 143+ vitest tests incl. verified worked examples (DOTS, IPF GL, e1RM…)
npm run build       # production build
```

Architecture and locked scientific decisions: `docs/PLAN.md`. Agent/contributor guide: `CLAUDE.md`.
