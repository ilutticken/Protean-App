# 05 — UX & Visual Design for Protean

Research reference for engineering. Scope: logging speed, gamification psychology, progress visualization, the hex skill map component, two-athlete UX, local-first storage, visual identity, and information architecture. Claims meant to become code carry concrete numbers. Where evidence is practitioner-grade rather than peer-reviewed, it is flagged.

---

## 1. What makes the best loggers fast — extracted interaction patterns

Competitive teardown of Strong, Hevy, Boostcamp, Alpha Progression, Caliber. The consistent finding: the best loggers are designed around the assumption that the user is mid-rest, tired, and has ~10 seconds of attention per set [RepReturn, 2026, https://repreturn.com/strong-app-vs-hevy/].

| Pattern | Who does it | Concrete mechanic | Protean spec |
|---|---|---|---|
| **Ghost/previous values** | Strong, Hevy, Boostcamp | Previous session's weight×reps pre-loaded as placeholder text in each set row; tapping the checkmark accepts them unchanged | Pre-fill every set row from last session of the *same exercise at the same chain tier*; render as 40%-opacity placeholder; ✓ commits placeholder as actual |
| **1-tap set completion** | Strong, Hevy | If ghost values are correct, logging a set = one tap on ✓; editing = tap field → numeric pad → ✓ | Target: 1 tap (unchanged), ≤3 taps (changed). See §8 flow |
| **Auto rest timer** | Strong (auto-start on set completion), Alpha Progression | Timer starts on ✓, shows countdown as pill/overlay, ±15 s or ±30 s adjust buttons, local notification on expiry | Auto-start on ✓; default per exercise-type (isolation 90 s, compound 180 s, isometric 60 s); +30/−30 buttons; Notification API + vibration when PWA installed |
| **Plate calculator** | Strong ("one tap away") | Long-press or icon on weight field → shows plates-per-side for the entered barbell weight | Long-press weight field → plate breakdown from a user-configured plate inventory (pairs of 25/20/15/10/5/2.5/1.25 kg) |
| **Custom numeric keypad** | Strong, Hevy | In-app keypad (not OS keyboard): digits + decimal + "+/−" steppers using per-exercise increment (2.5 kg default) | Build custom keypad; steppers use `exercise.increment`; avoids OS keyboard focus lag |
| **Set-type labels** | Boostcamp (warm-up/working/failure), Hevy (W/D/F flags) | Tap set number → cycle or menu: Warm-up (W), Working, Drop (D), Failure (F); warm-ups excluded from volume/e1RM analytics [BarBend, 2026, https://barbend.com/boostcamp-review/] | Same 4 types + **Isometric** (logs seconds & joint angle, not reps) + **Quasi-isometric hold** (logs seconds) |
| **Auto warm-up generation** | Alpha Progression | App generates warm-up sets whose count scales with first working-set load and exercise size (big compounds get more) [Fitness Drum, 2026, https://fitnessdrum.com/alpha-progression-app-review/] | Ramp: 40%×8, 60%×5, 80%×2 of first working weight for compounds ≥60 kg; single 50%×8 below that; none for bodyweight-only slots |
| **Supersets** | Hevy, Boostcamp | Multi-select exercises → "group as superset"; grouped exercises render color-banded and alternate in guided flow; one shared rest timer after the last exercise of the round [Boostcamp, 2026, https://www.boostcamp.app/features] | Support pairing any two slots; render with a shared colored left border; rest timer fires after B, not A |
| **RPE/RIR field** | Alpha Progression (RIR), Hevy (RPE) | Optional third column per set; drives next-session recommendation | Optional RIR column (0–5), used by progression engine (see doc 02) |
| **Mid-workout substitution** | Boostcamp | Swap exercise; weights carry to the substitute | Trivial for Protean: chain slots ARE the substitution list — swap = pick a different tier in the chain |
| **Exercise notes & history** | All five | Per-exercise note + last-5-sessions history one tap from the logging row | Include; history sheet also shows chain-tier timeline |

**Protean-specific logging requirements no commercial app handles natively:**
- **Progression-chain slots**: a slot is a chain (`Weighted Pistol > Pistol > Weighted Lunge > Lunge`) with three rep tiers (e.g., 15/20/35). The logging row must show the *currently assigned* tier + exercise, with a one-tap "▼ tier" control to drop down (fatigue day) or "▲" to attempt the harder tier. Log records `(chainId, exerciseIndex, tier, weight, reps)` so analytics can compare like-with-like.
- **Overcoming isometrics (4×7 s at 3 joint angles)**: needs a countdown-beep timer (3-2-1-push), auto-advancing through angle prompts ("bottom / mid / top"), logging only `angle, seconds, perceived intensity`. No reps field.
- **Quasi-isometric 1-min holds**: single 60 s countdown with elapsed display; log seconds achieved if failed early.

**Anti-patterns to avoid** (observed in weaker apps): OS keyboard for numbers (slow focus, covers content); modal dialogs mid-set; requiring navigation away from the workout screen to see history; social feed between the user and the log button [SensAI, 2026, https://www.sensai.fit/blog/hevy-vs-strong-2026].

---

## 2. Gamification that works vs dark patterns

### Grounding: Self-Determination Theory (SDT)
Intrinsic motivation in health apps is driven by **competence, autonomy, relatedness**. Achievement/progression affordances (badges, levels, skill unlocks) feed competence; choice/customization feeds autonomy; social features feed relatedness. Competence + relatedness are the strongest predictors of continued mHealth app use [Mendoza-Herrera et al., PMC, 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC8391751/]. More gamification is not monotonically better: adherence intention follows an S-shaped curve over feature richness, and low-self-efficacy users are harmed by gamification overload [Frontiers in Psychology, 2025, https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1671543/full]. **Implication: ship few, deep mechanics (skill tree + PR detection), not badge spam.**

### Habit-formation numbers (for streak/reminder logic)
| Finding | Number | Source |
|---|---|---|
| Median days to automaticity for a new daily behavior | 66 (range 18–254) | [Lally et al., Eur J Soc Psychol, 2010, https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674] |
| Missing a single day | No measurable damage to habit formation | Lally et al., 2010 (same) |
| Minimum "dosage" for a self-sustaining gym habit | ~4 sessions/week for ≥6 weeks | [Kaushal & Rhodes, J Behav Med, 2015, https://www.uvic.ca/research/labs/bmed/assets/docs/Kaushal,%20Rhodes,%202015.pdf] |
| Implementation intentions ("if it's Monday 6pm, I do Legs") effect on goal attainment | d = 0.65 (94 studies) | [Gollwitzer & Sheeran, Adv Exp Soc Psychol, 2006, https://www.scirp.org/reference/referencespapers?referenceid=1138676] |

**Code implications:** (a) the plan should let each athlete bind sessions to weekday+time (implementation intention), and the Today screen leads with that binding; (b) streaks must be **schedule-relative, not daily** — a 5-day split athlete hitting all 5 planned sessions = perfect week; (c) a single missed session must not zero anything.

### Streaks: light pattern vs dark pattern
Streaks work via loss aversion (losses ≈ 2× the psychological weight of gains), which is exactly why naive implementations become anxiety machines; Duolingo-style daily streaks "skirt the edge of dark pattern" [UX Magazine, 2025, https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame; Burke, 2023, https://www.andrewburke.me/blogposts/my_app_habits_duolingo_353].

| Do (competence-supporting) | Don't (dark pattern) |
|---|---|
| **Weekly streak**: "weeks with ≥4 of 5 planned sessions" (matches Kaushal dosage) | Daily streak for a 5-day program (guarantees failure 2 days/week) |
| Auto "rest-week token": 1 free missed week per 8 (deload = planned) | Paid/earned streak freezes, streak-loss countdown notifications |
| On break: show longest-streak record retained, restart at "week 1 of new streak" | Punishing reset animations, guilt copy ("you let your streak die") |
| Achievements = real training milestones (first pistol squat, 1.5×BW squat, 10 s tuck planche) auto-detected from logs | Badges for opening the app, engagement-only achievements |
| Skill-tree node unlocks as the *primary* reward loop (visible competence) | Leaderboards between the two athletes on absolute load (see §5) |
| Notifications: max 1/day, only on planned days, at the athlete's chosen time | Re-engagement spam, "your coach is sad" messages |

---

## 3. Progress visualization patterns

Design-system note: chart specs below follow mark/interaction conventions validated with a palette checker (see §7); every multi-series chart needs a legend, direct labels for ≤4 series, and a data-table fallback view.

### 3.1 e1RM trend line (per lift)
- Formula: **Epley** `e1RM = w × (1 + r/30)` for r ≤ 10; ignore sets with r > 10 (error grows unacceptably); alternative Brzycki `w × 36/(37 − r)` agrees within ~2% at r ≤ 8 [ExRx / strengthlevel convention — practitioner-grade].
- Plot: per-session best e1RM (max over working sets), 2 px line, dot per session (≥8 px hit target), with a 7-session rolling median as the trend layer to suppress daily noise.
- Overlay: bodyweight on a *separate* small-multiple chart, never a dual axis.
- Annotate PRs (all-time max e1RM) with a single marker + label; this doubles as the achievement trigger.

### 3.2 Volume heatmap (GitHub-style)
- Grid: 52 columns (weeks) × 7 rows (days), cell = one day, ~11 px cells with 2 px gaps; mobile shows last 26 weeks with horizontal scroll.
- Metric: hard sets completed that day (working + failure sets; warm-ups excluded).
- Bins: 5 levels — 0 sets = surface color; then quartile thresholds computed over the athlete's own nonzero days (e.g., 1–9 / 10–19 / 20–29 / 30+ until enough history exists). Single-hue sequential ramp of the athlete's accent color, light→dark; recompute quantiles monthly. GitHub-style heatmaps are a proven pattern for fitness/habit data [Tomer-Barak/contribution-graph, 2024, https://github.com/Tomer-Barak/contribution-graph].
- Tap cell → tooltip: date, session name, sets, tonnage.

### 3.3 Radar/spider chart for domains
- Axes: 6–9 movement domains (recommend 8: Horizontal Push, Vertical Push, Horizontal Pull, Vertical Pull, Squat, Hinge, Core, Locomotion/Conditioning — matching doc 03's domain model). Cap at 9; more axes make radar unreadable.
- Scale: normalize each axis to 0–100 where 100 = the athlete's *goal standard* for that domain (e.g., 2×BW squat, one-arm pull-up) and intermediate anchors from strengthlevel.com percentile standards (practitioner data, ~134M lifts; science is thin here — flag as estimate in UI).
- Radar charts distort area (outer rings dominate); mitigate: draw as stroked polygon (2 px) + 15%-alpha fill, gridlines at 25/50/75, and always pair with a numbers table below the chart.
- Two-athlete overlay only in the opt-in Compare view, using the two athlete accents (§5), each ≥8 px vertex markers, legend mandatory.

### 3.4 Skill-node states (used in tree + lists)
| State | Rule (computable) | Visual |
|---|---|---|
| **Locked** | ≥1 prerequisite node not yet "achieved" | 35% opacity, desaturated, outline only, lock glyph |
| **Available** | All prerequisites achieved, zero logged attempts | Full-color outline, hollow fill, subtle 2 px ring in sector hue |
| **In progress** | ≥1 logged attempt/working set on the node's exercise | Sector-hue fill + circular progress ring = `min(best/target, 1)` (e.g., best hold 4 s / target 10 s = 40%) |
| **Achieved** | Target met once (e.g., 3×5 reps, or 10 s hold) | Solid fill + checkmark |
| **Mastered** | Target met in ≥3 sessions across ≥3 weeks | Solid fill + gold/ivory ring |

---

## 4. Translating the KNightNox hex map into an interactive component

Reference artifact: u/KNightNox's bodyweight skill tree — a hexagonal map, ~9 color-coded movement-family sectors radiating from a central muscle-map figure, each sector a branching graph from easy hub nodes to elite skills; the original mixes calisthenics, weights, plyometrics, isometrics, yoga, martial arts [Gravgear summary, 2023, https://sg.thegravgear.com/blogs/calisthenics/bodyweight-fitness-progression]. Estimated node count if fully encoded: 300–600 nodes, 400–800 edges.

### 4.1 Rendering technology
- **SVG, not canvas.** SVG stays smooth into the low thousands of elements and degrades past ~5,000 [LogRocket, 2023, https://blog.logrocket.com/svg-vs-canvas/; Felt, 2022, https://felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster]. 600 nodes + 800 edges + labels ≈ 2,500–3,500 elements — inside budget, and SVG gives free DOM hit-testing, CSS theming (sector hues as CSS vars), and accessibility (`role="button"`, `aria-label` per node).
- Pan/zoom: apply one `transform="translate(…) scale(…)"` on a single root `<g>`; drive it with a small library — `svg-pan-zoom` (vanilla, touch + pinch) [bumbu, https://github.com/bumbu/svg-pan-zoom] or `react-svg-pan-zoom` if React [chrvadala, https://github.com/chrvadala/react-svg-pan-zoom]. Pinch-zoom via Pointer Events; `touch-action: none` on the SVG container only.
- Performance guards: no CSS filters/drop-shadows on nodes (biggest SVG jank source); use pre-baked ring strokes instead. `will-change: transform` on the root group during gestures only.

### 4.2 Layout
- Radial-tier layout, computed once at build time (not force-directed at runtime — deterministic > organic): center = human figure (inline SVG with per-muscle `id`s so sector hover can highlight muscles); tier 0 hub nodes at radius r₁, elite skills outermost. Sector *i* of 9 owns the angular wedge `[i·40°, (i+1)·40°)`.
- Node = hexagon (matches source chart identity), flat-top, 28 px circumradius at zoom = 1; edges = 2 px curved paths in sector hue at 40% alpha; achieved paths render at 100% alpha (the "lit route" effect).
- Cross-sector prerequisite edges (e.g., planche ← push-up line) drawn dashed.

### 4.3 Mobile usability rules (this is where hex maps die)
| Rule | Number |
|---|---|
| Minimum touch target | 44×44 px effective (Apple HIG); hexes may render smaller but carry an invisible ≥44 px hit circle |
| Zoom range | 0.4× (whole map) to 2.5×; double-tap = zoom-to-sector |
| Level-of-detail | zoom < 0.7×: hide node labels, show only sector labels + node fills; zoom ≥ 0.7×: show short labels (≤14 chars); full names only in detail sheet |
| Tap behavior | Tap node → **bottom sheet** (not modal): name, state, prerequisite list (tappable), current best, target, "log attempt" button. Never navigate away from the map |
| Sector jump | Horizontal chip row above the map — 9 chips in sector hues; tap = animated pan/zoom to that sector (300 ms, skipped under reduced motion) |
| Orientation cue | 80 px mini-map in corner at zoom > 1.2× showing viewport rectangle; hide otherwise |
| First paint | Default view = fit-whole-map, athlete's most recently progressed sector pulsed once |
| List fallback | Every sector also renders as a plain accordion list (accessibility + screen readers + tiny phones). The map is progressive enhancement, not the only path |

---

## 5. Two-athlete UX

### 5.1 Instant profile switching
- **Switcher placement:** persistent avatar chip in the top bar of every screen; one tap toggles (two athletes = toggle, no menu). Optionally long-press → profile sheet.
- **Cost of switching must be zero:** all state (active workout in progress, scroll positions) is stored per-athlete; switching mid-workout of athlete A preserves A's in-progress session (autosaved every set anyway).
- **Color-coding:** every screen carries the active athlete's accent as: top-bar underline (3 px), avatar ring, primary buttons, heatmap ramp, chart series color. Accent A (cyan family) `#00A4C0`, Accent B (amber family) `#B67C0D` — validated as a chart pair on the dark surface (CVD ΔE 20.4, contrast ≥3:1; §7). Never rely on color alone: the athlete's name/avatar is always visible in the bar.
- **Guard rail:** the ✓-set action shows the accent color at the point of tap; if the wrong profile is active, the mismatch is visible where the eyes already are. Add an "undo / reassign last set to other athlete" action (common shared-device error).

### 5.2 Fair comparison (male vs female)
Absolute-load comparison between a male and female athlete is demoralizing and meaningless. Normalize:

1. **Relative strength** (default, easiest to explain): `lift ÷ bodyweight`, shown as "×BW". Goals are already framed this way (2×BW squat).
2. **DOTS score** (for a single cross-athlete "strength score"): `DOTS = weight_kg × 500 / (A + B·bw + C·bw² + D·bw³ + E·bw⁴)`, bw = bodyweight kg [RPE Training, 2025, https://rpetraining.com/dots-calculator; Vitruve, https://vitruve.fit/calculators/dots-calculator/]:

| Coefficient | Male | Female |
|---|---|---|
| A | −307.75076 | −57.96288 |
| B | 24.0900756 | 13.6175032 |
| C | −0.1918759221 | −0.1126655495 |
| D | 0.0007391293 | 0.0005158568 |
| E | −0.000001093 | −0.0000010706 |
| bw clamp | 40–210 kg | 40–150 kg |

Same scale both sexes: a 380 DOTS woman = a 380 DOTS man in relative terms. (Coefficients are the OpenPowerlifting/IPF-adopted DOTS polynomial; verify against openpowerlifting source in code review — one secondary source printed a 5th-order variant, which is wrong.)
3. **Percent-of-own-goal**: each metric can display as `current / athlete's own target` — comparison of *progress rates*, fully sex-neutral. Use this for the radar Compare overlay.

**Motivation-preserving rules:** default views compare the athlete to *their own past* (SDT competence); side-by-side is a separate, opt-in "Compare" tab; Compare never shows absolute kg deltas without the normalized figure beside it; celebrate both athletes' PRs on a shared "recent PRs" feed (relatedness) rather than ranking them.

---

## 6. Local-first architecture

| Store | Limit | Use in Protean |
|---|---|---|
| `localStorage` | ~5 MB/origin, synchronous (blocks main thread), strings only | Only: last-active athlete id, theme, UI prefs. Nothing else |
| **IndexedDB** | Up to ~50–60% of free disk (Chromium); async; structured data + blobs | All domain data: sessions, sets, chains, skill states, bodyweight log |
| Cache API + service worker | Counts toward same origin quota | App shell for offline/PWA |

[web.dev, 2023, https://web.dev/articles/storage-for-the-web; MDN, https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria]

- **Wrapper:** use Dexie.js over raw IndexedDB (typed tables, compound indexes like `[athleteId+exerciseId+date]`, migration versioning) [LogRocket, 2025, https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/].
- **Eviction defense:** call `navigator.storage.persist()` at first launch and surface the result; check `navigator.storage.estimate()` in Settings. Critical Safari fact: script-writable storage (incl. IndexedDB) is deleted after **7 days of no interaction** with the site — but **installed (Add-to-Home-Screen) PWAs are exempt** [WebKit, 2023, https://webkit.org/blog/14403/updates-to-storage-policy/]. Therefore: aggressively prompt installation on iOS, and treat export as backup, not an edge feature.
- **Backup:** one-tap "Export JSON" → single file `{schemaVersion, exportedAt, athletes[], exercises[], chains[], sessions[], sets[], skillStates[], bodyweights[]}` via `Blob` download; Import validates `schemaVersion` and merges by `uuid` + `updatedAt` (last-write-wins). Auto-remind to export if last export > 30 days and > 20 new sessions. Data scale is tiny: 2 athletes × 5 sessions/wk × ~25 sets ≈ 13k sets/yr ≈ 2–4 MB/yr as JSON — IndexedDB headroom is effectively infinite here.
- **PWA:** manifest (`display: standalone`, theme_color = surface `#0E0F13`, maskable icons 192/512), service worker precaching the shell (Workbox or hand-rolled, cache-first for assets, no network dependency at all for data). Everything already works offline because there is no server.

---

## 7. Visual identity — "Protean" (shape-shifting/adaptation)

**Concept:** Protean = adaptive. Express it through *state change*, not decoration: the UI's hue context shifts with the active sector and athlete; nodes morph locked→mastered; the logo can be a hexagon that subtly morphs between the 9 sector silhouettes (static under reduced motion).

### 7.1 Color system (dark-first)
Near-black base with restrained accents is the established dark-fitness pattern (base ≈ `#0B0B0F`, one high-energy accent for CTAs, oversized numerals) [Canvas Builder, 2026, https://canvasbuilder.co/blog/fitness-website-design-trends-2026].

Core neutrals (dark theme default; light theme derived, both required):

| Token | Hex | Role |
|---|---|---|
| `surface-0` | `#0E0F13` | App background |
| `surface-1` | `#16181E` | Cards |
| `surface-2` | `#1E2129` | Sheets, raised |
| `ink-primary` | `#E8EAF0` | Primary text (not pure white — glare) |
| `ink-secondary` | `#9AA0AE` | Secondary text |
| `ink-muted` | `#5C6270` | Placeholders, ghost values |
| `success` | `#3DBE7B` | PR/achieved (always with icon+label) |
| `danger` | `#E0564F` | Destructive only |

**9 sector hues** — machine-validated (OKLCH lightness band 0.48–0.67, chroma ≥ 0.10, adjacent-pair CVD ΔE ≥ 8 under protan/deutan simulation, normal-vision ΔE ≥ 15, contrast ≥ 3:1 on `#0E0F13`; all checks pass):

| Sector | Hex | OKLCH (L/C/H) |
|---|---|---|
| Push-up family | `#E1514E` | .63/.18/25 |
| Dips–planche–handstand | `#8D5406` | .50/.11/65 |
| Core | `#AB9017` | .66/.13/95 |
| Squat family | `#3F7B04` | .52/.15/135 |
| Posterior legs | `#00AA95` | .66/.12/180 |
| Pull-up–levers | `#006DA8` | .51/.13/240 |
| Back chain | `#848DDE` | .67/.12/278 |
| Balance–acrobatics | `#7F4BB1` | .52/.16/305 |
| Locomotion (run/swim/MA) | `#D1649C` | .65/.15/350 |

Assignment is fixed (never re-ordered when filtering); sector identity is never color-alone — every sector carries its label/icon. Athlete accents: **A `#00A4C0`, B `#B67C0D`** (validated pair, §5.1); brighter chrome-only variants (`#35C6E4`, `#E8A33C`) may be used for large UI fills but never as chart series. Light-theme variants of all of the above must be re-validated against the light surface, not auto-flipped.

### 7.2 Typography (glanceable mid-workout)
- Family: **Inter** (self-hosted woff2 — CSP/local-first forbids Google Fonts CDN) or system stack fallback; regular/medium body, bold headings; thin weights unreadable on dark [UX Design Institute, 2024, https://www.uxdesigninstitute.com/blog/dark-mode-design-practical-guide/].
- **All numerals: `font-variant-numeric: tabular-nums`** so ghost→actual and timer digits don't jitter.
- Scale: rest-timer countdown 64–80 px; active set weight/reps 32 px; body 16 px (never below 14 px); labels 13 px uppercase +0.05 em tracking. Line-height 1.5 body, 1.1 numerals.
- Contrast: text ≥ 4.5:1 on its surface (WCAG AA); big numerals ≥ 3:1 minimum but target 4.5:1 anyway (gym lighting, sweat, distance).

### 7.3 Motion & micro-interactions
- Durations: micro-feedback (✓ set, chip select) 120–200 ms; sheet/panel transitions 250–300 ms; map pan-to-sector 300 ms; nothing over 1 s [Pope Tech, 2025, https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/].
- Signature moments (worth the polish budget): set-✓ ripple in athlete accent; PR = one confetti-free pulse + haptic (`navigator.vibrate(50)`); skill-node unlock = ring draw-in 400 ms.
- **`prefers-reduced-motion: reduce`** must disable: node pulses, pan/zoom animations (jump-cut instead), logo morph, timer ring animation (show digits only). WCAG 2.3.3: interaction-triggered motion must be disableable unless essential [W3C, https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html]. Implement as a global CSS media query + a JS `matchMedia` flag consulted by all imperative animations; also expose an in-app "reduce motion" override.

---

## 8. Information architecture & the ≤3-tap logging flow

### Screen map (bottom nav, 5 items — persistent bottom navigation is the standard for fitness apps [Stormotion, 2025, https://stormotion.io/blog/fitness-app-ux/])

```
┌─ Top bar: [Protean ⬡]  … [Athlete avatar-chip ⇄]
├─ TODAY    — today's planned session card (implementation-intention binding),
│             start/resume button, weekly streak ring, recent PRs feed (both athletes)
├─ WORKOUT  — active logging screen (reachable only via Today/start; full-screen takeover,
│             bottom nav hidden while a session is live)
├─ STUNTS   — hex skill map (default) ⇄ list view toggle; node bottom-sheet detail
├─ STATS    — tabs: Lifts (e1RM trends) · Volume (heatmap) · Domains (radar) · Compare (opt-in)
└─ PLAN     — 5-day split editor: chains per slot, tier assignments, rep tiers,
              iso protocols; program history/deload scheduling; Settings & Export live here
```

Deep links: Stunts node → its chain in Plan; Stats lift → its exercise history; Today card → Workout.

### Logging flow (per set, from the Workout screen)
| Case | Taps | Sequence |
|---|---|---|
| Ghost values correct | **1** | tap ✓ (row commits previous weight×reps; rest timer auto-starts) |
| Change reps only | 2–3 | tap reps field → keypad `+`/`−` (1 tap per step) → ✓ |
| Change weight & reps | ≤5 | weight field → stepper → reps field → stepper → ✓ (worst case; steppers use exercise increment so 1 tap ≈ 1 change) |
| Drop chain tier mid-set | 2 | tap tier ▼ chip → pick easier exercise (ghosts reload from that tier's history) → normal flow |
| Isometric set | 1 | tap ▶ (runs 7 s ×3 angle guided timer; auto-logs on completion) |

Row anatomy: `[set# / type] [prev ghost: 60kg × 8] [weight] [reps] [RIR·opt] [✓]` — one row per set, whole row is the tap surface for ✓ except the two input fields; row height ≥ 56 px. During rest: countdown pill pinned bottom (+30/−30/skip), next-set ghost pre-focused. Finishing the last set → session summary (tonnage, PRs, new node states) → returns to Today.

---

## 9. Engineering checklist (condensed decisions)

1. One-tap set logging with ghost values; custom keypad; auto rest timer; set types incl. isometric — §1.
2. Weekly schedule-relative streak (≥4/5 sessions), no daily streaks, no punitive resets; achievements = auto-detected training milestones only — §2.
3. Charts: Epley e1RM + rolling median; athlete-quantile 5-bin heatmap; 8-axis goal-normalized radar; 5 skill-node states with computable rules — §3.
4. Skill map: build-time radial SVG layout, single-transform pan/zoom, 44 px hit circles, LOD at 0.7×, bottom-sheet details, sector chips, list fallback — §4.
5. Two athletes: 1-tap avatar toggle, accent-colored chrome, per-athlete state isolation, DOTS/relative-strength normalized Compare (opt-in) — §5.
6. Dexie/IndexedDB for all data; localStorage for prefs only; `storage.persist()`; PWA install (Safari 7-day eviction exemption); versioned JSON export/import — §6.
7. Dark-first token system with the 9 validated sector hues + 2 athlete accents; Inter with tabular numerals; reduced-motion compliance — §7.
8. Five-screen IA (Today/Workout/Stunts/Stats/Plan); Workout is a nav-hidden takeover — §8.
