import { useState } from "react";
import type { AppData, Athlete, Sex, Unit } from "../lib/types";
import { blankData } from "../lib/storage";
import { feetInchesToCm, toKg } from "../lib/units";
import { localISODate } from "../lib/dates";

/** Accent options. Protean is one athlete per install, so this is the only
 * thing distinguishing two partners' copies at a glance — worth choosing. */
const ACCENTS = ["#00a4c0", "#b67c0d", "#c04ba0", "#5c8b2f"];

export default function Onboarding({ onDone }: { onDone: (d: AppData) => void }) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [bodyweight, setBodyweight] = useState("");
  /** cm when unit is kg; the inches part when unit is lb. */
  const [height, setHeight] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [accent, setAccent] = useState(ACCENTS[0]);

  const valid = name.trim().length > 0 && Number(bodyweight) > 0;

  function create() {
    const today = localISODate();
    const kg = Math.round(toKg(Number(bodyweight), unit) * 10) / 10;
    // Imperial entry is feet + inches; storage is always cm.
    const cm =
      unit === "lb"
        ? feetInchesToCm(Number(heightFeet) || 0, Number(height) || 0)
        : Number(height);
    const athlete: Athlete = {
      id: "athlete-a",
      name: name.trim(),
      sex,
      bodyweightKg: kg,
      heightCm: cm > 0 ? Math.round(cm * 10) / 10 : undefined,
      unit,
      accent,
      bodyweightLog: [{ date: today, kg }],
    };
    onDone({ ...blankData(), athlete });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 gap-8">
      <header className="text-center">
        <div className="text-4xl font-extrabold tracking-tight">
          PROTEAN<span className="text-ink-3">⬡</span>
        </div>
        <p className="text-ink-2 mt-2 max-w-sm text-sm leading-relaxed">
          Progressive calisthenics + weights, stunt tracking, and honest numbers. Everything lives
          on this device — set yourself up to begin.
        </p>
      </header>

      <section
        className="w-full max-w-md rounded-2xl bg-surface-1 border border-line p-5"
        style={{ borderTopColor: accent, borderTopWidth: 3 }}
      >
        <label className="block text-xs text-ink-2 mb-1">Name</label>
        <input
          className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 mb-3 outline-none focus:border-ink-3"
          value={name}
          placeholder="e.g. Zen"
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-xs text-ink-2 mb-1">Sex (standards + norms)</label>
        <div className="flex gap-2 mb-3">
          {(["male", "female"] as Sex[]).map((s) => (
            <button
              key={s}
              onClick={() => setSex(s)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm border capitalize ${
                sex === s
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
            <label className="block text-xs text-ink-2 mb-1">Bodyweight ({unit})</label>
            <input
              className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
              inputMode="decimal"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-ink-2 mb-1">Units</label>
            <button
              onClick={() => {
                setUnit(unit === "kg" ? "lb" : "kg");
                setHeight("");
                setHeightFeet("");
              }}
              className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 text-sm"
              title="Switch between metric and imperial"
            >
              {unit === "kg" ? "kg / cm" : "lb / ft·in"}
            </button>
          </div>
        </div>

        <label className="block text-xs text-ink-2 mb-1">Height</label>
        {unit === "kg" ? (
          <div className="flex items-center gap-2 mb-4">
            <input
              className="w-28 rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
              inputMode="decimal"
              placeholder="178"
              value={height}
              onChange={(e) => setHeight(e.target.value.replace(/[^\d.]/g, ""))}
            />
            <span className="text-ink-3 text-sm">cm</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4">
            <input
              className="w-20 rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
              inputMode="numeric"
              placeholder="5"
              value={heightFeet}
              onChange={(e) => setHeightFeet(e.target.value.replace(/[^\d]/g, ""))}
            />
            <span className="text-ink-3 text-sm">ft</span>
            <input
              className="w-20 rounded-lg bg-surface-2 border border-line px-3 py-2.5 outline-none focus:border-ink-3 nums"
              inputMode="decimal"
              placeholder="10"
              value={height}
              onChange={(e) => setHeight(e.target.value.replace(/[^\d.]/g, ""))}
            />
            <span className="text-ink-3 text-sm">in</span>
          </div>
        )}

        <label className="block text-xs text-ink-2 mb-1.5">Accent</label>
        <div className="flex gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              aria-label={`Accent ${c}`}
              aria-pressed={accent === c}
              className={`w-9 h-9 rounded-full transition-transform ${
                accent === c ? "ring-2 ring-offset-2 ring-offset-surface-1 ring-ink-1 scale-105" : ""
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </section>

      <button
        disabled={!valid}
        onClick={create}
        className="rounded-xl px-8 py-3.5 font-semibold text-surface-0 disabled:opacity-30 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${accent}, #b67c0d)` }}
      >
        Start Training
      </button>
      <p className="text-ink-3 text-xs max-w-sm text-center">
        Everything stays on this device — nothing is uploaded. Sex is used only to pick the correct
        strength standards and test norms. Training with a partner? Each of you runs your own copy.
      </p>
    </div>
  );
}
