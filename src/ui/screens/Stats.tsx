import { useMemo, useState } from "react";
import type { CardioEntry, TestResult } from "../../lib/types";
import { useApp, updateAthleteState } from "../../lib/useAppData";
import {
  heatmapValues,
  latestTest,
  liftAggregates,
  radarInputFor,
  type LiftAggregate,
} from "../../lib/selectors";
import { radar, AXIS_LABELS, AXIS_ORDER } from "../../lib/scoring";
import { cardioSummary, formatDuration, formatMeters } from "../../lib/locomotion";
import { goalRelevantIds, goalRelevantSetRate } from "../../lib/goal";
import { relativeStrength } from "../../lib/strength";
import { tests as testDefs } from "../../data/norms";
import { STANDARDS_LEVEL_NAMES, STANDARDS_PULLED_DATE, type LiftKey } from "../../data/standards";
import TrendChart from "../components/TrendChart";
import { localISODate } from "../../lib/dates";
import Heatmap from "../components/Heatmap";
import RadarChart from "../components/RadarChart";
import BottomSheet from "../components/BottomSheet";

type StatsTab = "lifts" | "volume" | "domains";

/** Radar-fitting short labels; full names stay in the table below the chart. */
const SHORT_AXIS: Record<string, string> = {
  max_strength: "Max strength",
  relative_strength: "Rel. strength",
  power: "Power",
  strength_endurance: "Endurance",
  skill_balance: "Skill",
  mobility: "Mobility",
  aerobic: "Aerobic",
};

const LIFT_LABEL: Record<LiftKey, string> = {
  back_squat: "Back Squat",
  bench_press: "Bench Press",
  deadlift: "Deadlift",
  ohp: "Overhead Press",
  barbell_row: "Barbell Row",
  curl: "Curl",
  hip_thrust: "Hip Thrust",
  weighted_pullup: "Weighted Pull-Up",
  weighted_dip: "Weighted Dip",
};

const TESTABLE_LIFTS: { exerciseId: string; label: string }[] = [
  { exerciseId: "barbell.back_squat", label: "Back Squat" },
  { exerciseId: "barbell.bench_press", label: "Bench Press" },
  { exerciseId: "barbell.deadlift", label: "Deadlift" },
  { exerciseId: "barbell.ohp", label: "Overhead Press" },
  { exerciseId: "barbell.row", label: "Barbell Row" },
  { exerciseId: "barbell.curl", label: "Curl" },
  { exerciseId: "barbell.hip_thrust", label: "Hip Thrust" },
  // Seed ids (not the pull.weighted_pullup / dip.weighted_dip aliases): identical
  // bwLoadFactor and standards key, but these are what skillExerciseAlias sources
  // from, so a quick-logged set also feeds the weighted pull-up / dip skill rungs.
  { exerciseId: "one_arm_pullup.wpu_25pct", label: "Weighted Pull-Up (added kg)" },
  { exerciseId: "dip.dip_weighted", label: "Weighted Dip (added kg)" },
  { exerciseId: "pull.weighted_muscleup", label: "Weighted Muscle-Up (added kg)" },
  // Loaded feats — no StrengthLevel table, so these feed skill criteria only.
  { exerciseId: "barbell.front_squat", label: "Front Squat" },
  { exerciseId: "barbell.overhead_squat", label: "Overhead Squat" },
  { exerciseId: "barbell.zercher_squat", label: "Zercher Squat" },
  { exerciseId: "barbell.clean_and_jerk", label: "Clean & Jerk" },
  { exerciseId: "barbell.power_snatch", label: "Power Snatch" },
  { exerciseId: "barbell.snatch_balance", label: "Snatch Balance" },
  { exerciseId: "barbell.sots_press", label: "Sots Press" },
  { exerciseId: "barbell.suitcase_deadlift", label: "Suitcase Deadlift" },
  { exerciseId: "barbell.jefferson_deadlift", label: "Jefferson Deadlift" },
  { exerciseId: "barbell.hack_lift", label: "Hack Lift" },
  { exerciseId: "barbell.steinborn", label: "Steinborn Lift" },
  { exerciseId: "kb.turkish_getup", label: "Turkish Get-Up" },
  { exerciseId: "kb.windmill", label: "Windmill" },
  { exerciseId: "kb.bent_press", label: "Bent Press" },
  { exerciseId: "db.crucifix_hold", label: "Crucifix Hold (per hand)" },
  { exerciseId: "barbell.two_hands_anyhow", label: "Two Hands Anyhow" },
];

export default function Stats() {
  const store = useApp();
  const { data, athlete, athleteState } = store;
  const [tab, setTab] = useState<StatsTab>("lifts");

  // Goal-relevant set rate over the trailing 7 days — the PLAN-GENERATOR §1 acceptance
  // metric (target ≥40% of weekly hard sets on the goal's prerequisite closure).
  const goalRate = useMemo(() => {
    const g = athleteState.goal;
    if (!g) return null;
    const since = localISODate(new Date(Date.now() - 7 * 86400e3));
    const closure = goalRelevantIds(g.nodeId);
    return {
      nodeId: g.nodeId,
      ...goalRelevantSetRate(data.sessions, athleteState.skillLog, athlete.id, closure, since),
    };
  }, [athleteState.goal, athleteState.skillLog, data.sessions, athlete.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {(["lifts", "volume", "domains"] as StatsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-sm capitalize border ${
              tab === t ? "border-ink-3 bg-surface-2 text-ink-1" : "border-line text-ink-3"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {goalRate && (
        <section className="rounded-2xl bg-surface-1 border border-line px-4 py-3 text-sm flex items-baseline gap-2">
          <span style={{ color: "#e8b23a" }}>★</span>
          <span className="text-ink-2">Last 7 days:</span>
          <span className="nums text-ink-1 font-semibold">
            {goalRate.rate === null ? "—" : `${Math.round(goalRate.rate * 100)}%`}
          </span>
          <span className="text-ink-3 text-xs">
            of {goalRate.total} sets moved your goal path{goalRate.rate !== null && goalRate.rate >= 0.4 ? " · on target" : goalRate.rate !== null ? " · target 40%" : ""}
          </span>
        </section>
      )}
      {tab === "lifts" && <LiftsTab />}
      {tab === "volume" && (
        <section className="rounded-2xl bg-surface-1 border border-line p-4">
          <h2 className="font-semibold text-sm mb-3">Hard sets per day — {athlete.name}</h2>
          <Heatmap values={heatmapValues(data.sessions, athlete.id)} color={athlete.accent} />
        </section>
      )}
      {tab === "domains" && <DomainsTab />}
      <p className="text-ink-3 text-[10px]">
        Standards: strengthlevel.com tables pulled {STANDARDS_PULLED_DATE}; e1RM = Brzycki/Epley hybrid, reps ≤ 10
        (11–15 shown hollow, ≥16 never estimated). Estimates, not measurements.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function LiftsTab() {
  const store = useApp();
  const { data, athlete, athleteState } = store;
  const [sel, setSel] = useState<LiftKey | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  const aggs = useMemo(
    () => liftAggregates(data.sessions, athleteState, athlete),
    [data.sessions, athleteState, athlete],
  );
  const keys = Object.keys(aggs) as LiftKey[];
  const active: LiftAggregate | undefined = aggs[sel ?? keys[0]];

  return (
    <div className="flex flex-col gap-3">
      {keys.length === 0 ? (
        <section className="rounded-2xl bg-surface-1 border border-line p-6 text-center">
          <p className="text-ink-2 text-sm">
            No estimable lifts yet. Log weighted sets in workouts — or test a barbell lift directly.
          </p>
        </section>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setSel(k)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  (sel ?? keys[0]) === k ? "border-ink-3 bg-surface-2 text-ink-1" : "border-line text-ink-3"
                }`}
              >
                {LIFT_LABEL[k]}
              </button>
            ))}
          </div>
          {active && (
            <section className="rounded-2xl bg-surface-1 border border-line p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-semibold">{LIFT_LABEL[active.key]}</h2>
                <div className="nums text-2xl font-extrabold" style={{ color: athlete.accent }}>
                  {active.e1rmKg}
                  <span className="text-sm font-medium text-ink-2"> kg e1RM</span>
                </div>
              </div>
              <div className="text-xs text-ink-2 mb-3 capitalize">
                {active.level.name}
                {active.level.level < 4 && (
                  <span className="nums">
                    {" "}
                    · {Math.round(active.level.percentOfNext * 100)}% to {STANDARDS_LEVEL_NAMES[active.level.level + 1]}
                  </span>
                )}
                <span className="text-ink-3 nums">
                  {" "}
                  · ×BW {relativeStrength(active.e1rmKg, athlete.bodyweightKg).toFixed(2)}
                </span>
              </div>
              {/* level meter */}
              <div className="flex gap-0.5 mb-4">
                {STANDARDS_LEVEL_NAMES.map((n, i) => (
                  <div key={n} className="flex-1">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        background:
                          i < active.level.level || (i === active.level.level && active.level.level === 4)
                            ? athlete.accent
                            : i === active.level.level
                              ? `color-mix(in oklab, ${athlete.accent} ${Math.round(active.level.percentOfNext * 100)}%, var(--color-surface-3))`
                              : "var(--color-surface-3)",
                      }}
                    />
                    <div className="text-[9px] text-ink-3 mt-0.5 capitalize">{n.slice(0, 3)}</div>
                  </div>
                ))}
              </div>
              <TrendChart points={active.series} unit="kg" color={athlete.accent} />
            </section>
          )}
        </>
      )}

      <button
        onClick={() => setTestOpen(true)}
        className="rounded-xl border border-line bg-surface-1 px-4 py-3 text-sm font-medium text-ink-2"
      >
        ＋ Test a lift (quick log weight × reps)
      </button>
      <LiftTestSheet open={testOpen} onClose={() => setTestOpen(false)} />
      <CardioLog />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cardio log — the ONLY producer for the tree's time/distance nodes, since the
// routine contains no running or swimming (src/lib/locomotion.ts).

function CardioLog() {
  const store = useApp();
  const { athlete, athleteState } = store;
  const [open, setOpen] = useState(false);
  const log = athleteState.cardioLog ?? [];
  const summary = cardioSummary(log);
  const recent = [...log].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  return (
    <>
      <section className="rounded-2xl bg-surface-1 border border-line p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">Cardio log</h2>
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs"
          >
            ＋ Log
          </button>
        </div>
        {log.length === 0 ? (
          <p className="text-ink-3 text-sm">
            The routine has no running, rowing or swimming, so nothing else can unlock the
            Loco sector — log a piece here and those nodes start moving.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-sm mb-2">
              {(["run", "row", "swim"] as const)
                .filter((m) => summary[m].count > 0)
                .map((m) => (
                  <div key={m} className="flex items-baseline gap-2">
                    <span className="text-ink-2 capitalize w-11 shrink-0">{m}</span>
                    <span className="nums text-ink-1">{formatMeters(summary[m].farthestM)}</span>
                    <span className="text-ink-3 text-xs">farthest</span>
                    <span className="text-ink-3 text-xs nums ml-auto">
                      {formatMeters(summary[m].totalM)} total · {summary[m].count}
                    </span>
                  </div>
                ))}
            </div>
            <div className="flex flex-col gap-1">
              {recent.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-ink-3 text-xs w-12 shrink-0 capitalize">{e.modality}</span>
                  <span className="text-ink-1 nums">{formatMeters(e.meters)}</span>
                  {e.seconds !== undefined && (
                    <span className="text-ink-3 text-xs nums">{formatDuration(e.seconds)}</span>
                  )}
                  <span className="text-ink-3 text-xs ml-auto nums">{e.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <CardioSheet open={open} onClose={() => setOpen(false)} accent={athlete.accent} />
    </>
  );
}

function CardioSheet({
  open,
  onClose,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
}) {
  const store = useApp();
  const [modality, setModality] = useState<CardioEntry["modality"]>("run");
  const [distance, setDistance] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");

  // Runs are entered in km; rowing and swimming in metres — nobody says "0.5 km erg".
  const meters = modality === "run" ? Number(distance) * 1000 : Number(distance);

  function save() {
    if (!Number.isFinite(meters) || meters <= 0) return;
    const total = (Number(mins) || 0) * 60 + (Number(secs) || 0);
    updateAthleteState(store, (s) => ({
      ...s,
      cardioLog: [
        ...(s.cardioLog ?? []),
        {
          date: localISODate(),
          modality,
          meters: Math.round(meters),
          ...(total > 0 ? { seconds: total } : {}),
        },
      ],
    }));
    setDistance("");
    setMins("");
    setSecs("");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-xl font-bold mb-3">Log a piece</h2>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(["run", "row", "swim"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setModality(m);
                setDistance("");
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm border capitalize ${
                modality === m
                  ? "bg-surface-3 border-ink-3 text-ink-1"
                  : "bg-surface-1 border-line text-ink-2"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="flex-1 rounded-lg bg-surface-1 border border-line px-3 py-2.5 nums outline-none focus:border-ink-3"
            placeholder={modality === "run" ? "distance km" : "distance m"}
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <span className="text-ink-3 text-sm w-6">{modality === "run" ? "km" : "m"}</span>
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="w-24 rounded-lg bg-surface-1 border border-line px-3 py-2.5 nums outline-none focus:border-ink-3"
            placeholder="min"
            inputMode="numeric"
            value={mins}
            onChange={(e) => setMins(e.target.value.replace(/[^\d]/g, ""))}
          />
          <span className="text-ink-3 text-sm">min</span>
          <input
            className="w-24 rounded-lg bg-surface-1 border border-line px-3 py-2.5 nums outline-none focus:border-ink-3"
            placeholder="sec"
            inputMode="numeric"
            value={secs}
            onChange={(e) => setSecs(e.target.value.replace(/[^\d]/g, ""))}
          />
          <span className="text-ink-3 text-sm">sec</span>
        </div>

        <p className="text-ink-3 text-xs">
          One entry = one continuous effort; distances are never added together. Time is optional —
          it is only needed for the 5K/10K/half/marathon percentile tiers.
        </p>
        <button
          onClick={save}
          className="rounded-xl py-3 font-semibold text-surface-0"
          style={{ background: accent }}
        >
          Save
        </button>
      </div>
    </BottomSheet>
  );
}

function LiftTestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useApp();
  const { athlete } = store;
  const [exerciseId, setExerciseId] = useState(TESTABLE_LIFTS[0].exerciseId);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  function save() {
    const w = Number(weight);
    const r = Number(reps);
    // Non-finite weight would make e1rm() throw and white-screen (finding #13).
    if (!Number.isFinite(w) || w === 0 || !Number.isFinite(r) || r <= 0) return;
    updateAthleteState(store, (s) => ({
      ...s,
      liftLog: [...(s.liftLog ?? []), { date: localISODate(), exerciseId, weightKg: w, reps: r }],
    }));
    setWeight("");
    setReps("");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-xl font-bold mb-3">Test a lift</h2>
      <div className="flex flex-col gap-3">
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="rounded-lg bg-surface-1 border border-line px-3 py-2.5 outline-none"
        >
          {TESTABLE_LIFTS.map((l) => (
            <option key={l.exerciseId} value={l.exerciseId}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-surface-1 border border-line px-3 py-2.5 nums outline-none focus:border-ink-3"
            placeholder="weight kg (neg = assisted)"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.-]/g, ""))}
          />
          <input
            className="w-24 rounded-lg bg-surface-1 border border-line px-3 py-2.5 nums outline-none focus:border-ink-3"
            placeholder="reps"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
        <p className="text-ink-3 text-xs">
          Best e1RM confidence at ≤10 reps. Weighted pull-up/dip: enter ADDED weight only.
        </p>
        <button onClick={save} className="rounded-xl py-3 font-semibold text-surface-0" style={{ background: athlete.accent }}>
          Save
        </button>
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------

function DomainsTab() {
  const store = useApp();
  const { data, athlete, athleteState } = store;
  const [entryOpen, setEntryOpen] = useState(false);

  const result = useMemo(
    () => radar(radarInputFor(data, athlete, athleteState)),
    [data, athlete, athleteState],
  );
  const axes = AXIS_ORDER.map((id) => SHORT_AXIS[id] ?? AXIS_LABELS[id]);
  const values = result.axes.map((a) => a.score);

  const staleTests = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 56);
    const cut = localISODate(cutoff);
    return testDefs.filter((t) => {
      if (t.computed) return false;
      const latest = latestTest(data.tests, athlete.id, t.id);
      return latest !== undefined && latest.date < cut;
    });
  }, [data.tests, athlete.id]);

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl bg-surface-1 border border-line p-4">
        <h2 className="font-semibold text-sm mb-2">Domains — {athlete.name} (vs {athlete.sex} norms)</h2>
        <RadarChart axes={axes} series={[{ name: athlete.name, color: athlete.accent, values }]} />
        <table className="w-full mt-3 text-sm">
          <tbody>
            {result.axes.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="py-1.5 text-ink-2">{a.label}</td>
                <td className="py-1.5 text-right nums font-semibold">
                  {a.score === null ? <span className="text-ink-3 font-normal">—</span> : Math.round(a.score)}
                </td>
                <td className="py-1.5 pl-3 text-ink-3 text-xs text-right">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {staleTests.length > 0 && (
        <p className="text-ink-3 text-xs px-1">
          ⏳ Retest due (&gt;8 weeks): {staleTests.map((t) => t.name).join(", ")}
        </p>
      )}

      <button
        onClick={() => setEntryOpen(true)}
        className="rounded-xl border border-line bg-surface-1 px-4 py-3 text-sm font-medium text-ink-2"
      >
        ＋ Enter a field-test result
      </button>
      <TestEntrySheet open={entryOpen} onClose={() => setEntryOpen(false)} />
    </div>
  );
}

function TestEntrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useApp();
  const { data, athlete } = store;
  const enterable = testDefs.filter((t) => !t.computed);
  const [testId, setTestId] = useState(enterable[0].id);
  const [value, setValue] = useState("");
  const def = enterable.find((t) => t.id === testId)!;
  const prev = latestTest(data.tests, athlete.id, testId);

  function save() {
    const v = Number(value);
    // Sit-and-reach can legitimately be zero or negative cm (finding: value>0 guard).
    if (value === "" || !Number.isFinite(v)) return;
    if (v <= 0 && testId !== "sit_and_reach") return;
    const r: TestResult = {
      id: `t-${Date.now().toString(36)}`,
      athleteId: athlete.id,
      testId,
      date: localISODate(),
      value: v,
    };
    store.update((d) => ({ ...d, tests: [...d.tests, r] }));
    setValue("");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-xl font-bold mb-3">Field test</h2>
      <div className="flex flex-col gap-3">
        <select
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          className="rounded-lg bg-surface-1 border border-line px-3 py-2.5 outline-none"
        >
          {enterable.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.unit})
            </option>
          ))}
        </select>
        <p className="text-ink-3 text-xs">{def.entryHint}</p>
        <input
          className="rounded-lg bg-surface-1 border border-line px-3 py-2.5 nums outline-none focus:border-ink-3"
          placeholder={prev ? `last: ${prev.value} ${def.unit} (${prev.date})` : `value in ${def.unit}`}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.-]/g, ""))}
        />
        <button onClick={save} className="rounded-xl py-3 font-semibold text-surface-0" style={{ background: athlete.accent }}>
          Save result
        </button>
      </div>
    </BottomSheet>
  );
}
