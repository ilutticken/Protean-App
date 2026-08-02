import { useMemo, useState } from "react";
import type { TestResult } from "../../lib/types";
import { useApp, updateAthleteState } from "../../lib/useAppData";
import {
  heatmapValues,
  latestTest,
  liftAggregates,
  radarInputFor,
  type LiftAggregate,
} from "../../lib/selectors";
import { radar, AXIS_LABELS, AXIS_ORDER } from "../../lib/scoring";
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
];

export default function Stats() {
  const store = useApp();
  const { data, athlete } = store;
  const [tab, setTab] = useState<StatsTab>("lifts");

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
    </div>
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
