import { useState } from "react";
import type { AppData, Athlete, Sex, Unit } from "../lib/types";
import { blankData } from "../lib/storage";
import { emptyAthleteState } from "../lib/useAppData";
import { feetInchesToCm, toKg } from "../lib/units";
import { localISODate } from "../lib/dates";

const ACCENTS = ["#00a4c0", "#b67c0d"];

interface Draft {
  name: string;
  sex: Sex;
  bodyweight: string;
  /** cm when unit is kg; total inches when unit is lb (feet field holds the ft part). */
  height: string;
  heightFeet: string;
  unit: Unit;
}

export default function Onboarding({ onDone }: { onDone: (d: AppData) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([
    { name: "", sex: "male", bodyweight: "", height: "", heightFeet: "", unit: "kg" },
    { name: "", sex: "female", bodyweight: "", height: "", heightFeet: "", unit: "kg" },
  ]);

  const valid = drafts.every((d) => d.name.trim() && Number(d.bodyweight) > 0);

  function set(i: number, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function create() {
    const today = localISODate();
    const athletes: Athlete[] = drafts.map((d, i) => {
      const kg = Math.round(toKg(Number(d.bodyweight), d.unit) * 10) / 10;
      // Imperial entry is feet + inches; storage is always cm.
      const cm =
        d.unit === "lb"
          ? feetInchesToCm(Number(d.heightFeet) || 0, Number(d.height) || 0)
          : Number(d.height);
      return {
        id: `athlete-${i === 0 ? "a" : "b"}`,
        name: d.name.trim(),
        sex: d.sex,
        bodyweightKg: kg,
        heightCm: cm > 0 ? Math.round(cm * 10) / 10 : undefined,
        unit: d.unit,
        accent: ACCENTS[i],
        bodyweightLog: [{ date: today, kg }],
      };
    });
    const data = blankData();
    data.athletes = athletes;
    data.activeAthleteId = athletes[0].id;
    for (const a of athletes) data.perAthlete[a.id] = emptyAthleteState();
    onDone(data);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 gap-8">
      <header className="text-center">
        <div className="text-4xl font-extrabold tracking-tight">
          PROTEAN<span className="text-ink-3">⬡</span>
        </div>
        <p className="text-ink-2 mt-2 max-w-sm text-sm leading-relaxed">
          Progressive calisthenics + weights, stunt tracking, and honest numbers — for the two of
          you. Set up both athletes to begin.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {drafts.map((d, i) => (
          <section
            key={i}
            className="flex-1 rounded-2xl bg-surface-1 border border-line p-5"
            style={{ borderTopColor: ACCENTS[i], borderTopWidth: 3 }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: ACCENTS[i] }}>
              ATHLETE {i === 0 ? "1" : "2"}
            </h2>
            <label className="block text-xs text-ink-2 mb-1">Name</label>
            <input
              className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 mb-3 outline-none focus:border-ink-3"
              value={d.name}
              placeholder={i === 0 ? "e.g. Zen" : "e.g. Fern"}
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <label className="block text-xs text-ink-2 mb-1">Sex (standards + norms)</label>
            <div className="flex gap-2 mb-3">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => set(i, { sex: s })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm border capitalize ${
                    d.sex === s
                      ? "bg-surface-3 border-ink-3 text-ink-1"
                      : "bg-surface-2 border-line text-ink-2"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-ink-2 mb-1">
                  Bodyweight ({d.unit})
                </label>
                <input
                  className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
                  inputMode="decimal"
                  value={d.bodyweight}
                  onChange={(e) => set(i, { bodyweight: e.target.value.replace(/[^\d.]/g, "") })}
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-ink-2 mb-1">Units</label>
                <button
                  onClick={() => set(i, { unit: d.unit === "kg" ? "lb" : "kg", height: "", heightFeet: "" })}
                  className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 text-sm"
                  title="Switch between metric and imperial"
                >
                  {d.unit === "kg" ? "kg / cm" : "lb / ft·in"}
                </button>
              </div>
            </div>
            <label className="block text-xs text-ink-2 mb-1">Height</label>
            {d.unit === "kg" ? (
              <div className="flex items-center gap-2">
                <input
                  className="w-28 rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
                  inputMode="decimal"
                  placeholder="178"
                  value={d.height}
                  onChange={(e) => set(i, { height: e.target.value.replace(/[^\d.]/g, "") })}
                />
                <span className="text-ink-3 text-sm">cm</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className="w-20 rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
                  inputMode="numeric"
                  placeholder="5"
                  value={d.heightFeet}
                  onChange={(e) => set(i, { heightFeet: e.target.value.replace(/[^\d]/g, "") })}
                />
                <span className="text-ink-3 text-sm">ft</span>
                <input
                  className="w-20 rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
                  inputMode="decimal"
                  placeholder="10"
                  value={d.height}
                  onChange={(e) => set(i, { height: e.target.value.replace(/[^\d.]/g, "") })}
                />
                <span className="text-ink-3 text-sm">in</span>
              </div>
            )}
          </section>
        ))}
      </div>

      <button
        disabled={!valid}
        onClick={create}
        className="rounded-xl px-8 py-3.5 font-semibold text-surface-0 disabled:opacity-30 transition-opacity"
        style={{ background: "linear-gradient(90deg,#00a4c0,#b67c0d)" }}
      >
        Start Training
      </button>
      <p className="text-ink-3 text-xs max-w-sm text-center">
        Everything stays on this device. Sex is used only to pick the correct strength standards
        and test norms; comparisons between you two are DOTS-normalized so they're fair.
      </p>
    </div>
  );
}
