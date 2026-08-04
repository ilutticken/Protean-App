import { useRef, useState } from "react";
import type { DayId, Slot } from "../../lib/types";
import { authorQuestions } from "../../data/seed-plan";
import { plan as prescribedPlan, CORE_SLOT_COUNT } from "../../data/prescription";
import { exercises } from "../../data/exercises";
import { useApp, updateAthlete, updateAthleteState } from "../../lib/useAppData";
import { exportJson, importJson, save } from "../../lib/storage";
import { isInStepSlot, targetFor } from "../../lib/progression";
import { resolveSlotState } from "../../lib/slot-identity";
import { effectiveStepIndex, skillStatuses } from "../../lib/selectors";
import { goalRelevantIds, slotFeedsGoal } from "../../lib/goal";
import { creditedNodes } from "../../lib/credit";
import { localISODate } from "../../lib/dates";
import { cmToFeetInches, feetInchesToCm, formatHeight, fromKg, toKg } from "../../lib/units";
import { SECTORS } from "../sectors";
import BottomSheet from "../components/BottomSheet";

const DAYS: Exclude<DayId, "mobility">[] = ["legs", "pull", "push", "fullbody"];

/**
 * Author questions since RESOLVED by an athlete-directed decision. The questions stay
 * in seed-plan.ts verbatim (it is the transcription record); this overlay is the
 * decision log. Everything not listed here still runs on its seeded default.
 */
const RESOLVED_QUESTIONS: Record<string, string> = {
  Q1: "Resolved 2026-08-02 — rep bands replaced by R-DYN (3 sets × 8) on strength slots; conditioning keeps its PDF doses. See PLAN.md \u201cRep prescription\u201d.",
  Q3: "Resolved 2026-08-02 — R-DYN retired the 2×20: push-03 prescribes 3×8 and the planche push-up node keeps doc 01\u2019s 3×3.",
};
const DAY_LABEL: Record<string, string> = { legs: "Legs", pull: "Pull", push: "Push", fullbody: "Full Body" };

export default function PlanScreen() {
  const store = useApp();
  const { data, athlete, athleteState } = store;
  const tendonPacing = data.settings.tendonPacing;
  const statuses = skillStatuses(data, athlete, athleteState);
  const goalClosure = athleteState.goal ? goalRelevantIds(athleteState.goal.nodeId) : null;
  const [day, setDay] = useState<Exclude<DayId, "mobility">>("legs");
  const [qOpen, setQOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bw, setBw] = useState("");
  const [htCm, setHtCm] = useState("");
  const [htFt, setHtFt] = useState("");
  const [htIn, setHtIn] = useState("");

  const slots = prescribedPlan.days[day];

  function pickAlternative(baseId: string, altId: string | null) {
    updateAthleteState(store, (s) => {
      const next = { ...s.slotAlternatives };
      if (altId) next[baseId] = altId;
      else delete next[baseId];
      return { ...s, slotAlternatives: next };
    });
  }

  function saveBodyweight() {
    const raw = Number(bw);
    if (!Number.isFinite(raw) || raw <= 0) return;
    // Entry is in the athlete's preferred unit; storage is always kg (finding #26).
    const kg = Math.round(toKg(raw, athlete.unit) * 10) / 10;
    const date = localISODate();
    updateAthlete(store, (a) => ({
      ...a,
      bodyweightKg: kg,
      bodyweightLog: [...a.bodyweightLog, { date, kg }],
    }));
    setBw("");
  }

  function saveHeight() {
    const cm =
      athlete.unit === "kg"
        ? Number(htCm)
        : feetInchesToCm(Number(htFt) || 0, Number(htIn) || 0);
    if (!Number.isFinite(cm) || cm <= 0) return;
    updateAthlete(store, (a) => ({ ...a, heightCm: Math.round(cm * 10) / 10 }));
    setHtCm("");
    setHtFt("");
    setHtIn("");
  }

  function toggleUnit() {
    updateAthlete(store, (a) => ({ ...a, unit: a.unit === "kg" ? "lb" : "kg" }));
    setBw("");
    setHtCm("");
    setHtFt("");
    setHtIn("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">The Protean Routine</h1>
        <p className="text-ink-3 text-xs">
          Chain slots, hardest first — you work the highlighted step; hit every set target in 2
          straight sessions to advance. Each day prescribes {CORE_SLOT_COUNT} exercises; slots
          marked OPTIONAL are extra work from the source routine and are not in the session.
        </p>
      </div>

      <button
        onClick={() => setQOpen(true)}
        className="rounded-xl bg-surface-1 border border-line px-4 py-2.5 text-left text-sm flex items-baseline gap-2"
      >
        <span className="font-medium text-ink-2">⚙️ Seeded defaults &amp; decisions</span>
        <span className="text-ink-3 text-xs nums">
          {Object.keys(RESOLVED_QUESTIONS).length} resolved · {authorQuestions.length - Object.keys(RESOLVED_QUESTIONS).length} defaults in effect
        </span>
      </button>

      <div className="flex gap-1.5">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-full px-3.5 py-1.5 text-sm border ${
              day === d ? "border-ink-3 bg-surface-2 text-ink-1" : "border-line text-ink-3"
            }`}
          >
            {DAY_LABEL[d]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {slots
          .filter((s) => !s.alternativeTo)
          .map((slot) => {
            const altSlot = slots.find((o) => o.alternativeTo === slot.id);
            const usingAlt = altSlot && athleteState.slotAlternatives[slot.id] === altSlot.id;
            const shown = usingAlt && altSlot ? altSlot : slot;
            return (
              <ChainBoard
                key={slot.id}
                slot={shown}
                accent={athlete.accent}
                stateIndex={effectiveStepIndex(shown, resolveSlotState(shown, athleteState.slotState[shown.id])?.stepIndex, statuses)}
                confirms={athleteState.slotState[shown.id]?.confirmCount ?? 0}
                feedsGoal={goalClosure ? slotFeedsGoal(shown, goalClosure) : false}
                alt={
                  altSlot
                    ? { usingAlt: Boolean(usingAlt), toggle: () => pickAlternative(slot.id, usingAlt ? null : altSlot.id) }
                    : undefined
                }
              />
            );
          })}
      </div>

      {/* Settings */}
      <section className="rounded-2xl bg-surface-1 border border-line p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Settings — {athlete.name}</h2>
          <button
            onClick={toggleUnit}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs"
            title="Switch this athlete between metric and imperial"
          >
            Units: {athlete.unit === "kg" ? "kg / cm" : "lb / ft·in"}
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="w-32 rounded-lg bg-surface-2 border border-line px-3 py-2 nums outline-none focus:border-ink-3"
            placeholder={`${Math.round(fromKg(athlete.bodyweightKg, athlete.unit) * 10) / 10} ${athlete.unit}`}
            inputMode="decimal"
            value={bw}
            onChange={(e) => setBw(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <button onClick={saveBodyweight} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
            Update bodyweight
          </button>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {athlete.unit === "kg" ? (
            <input
              className="w-32 rounded-lg bg-surface-2 border border-line px-3 py-2 nums outline-none focus:border-ink-3"
              placeholder={athlete.heightCm ? `${athlete.heightCm} cm` : "height cm"}
              inputMode="decimal"
              value={htCm}
              onChange={(e) => setHtCm(e.target.value.replace(/[^\d.]/g, ""))}
            />
          ) : (
            <>
              <input
                className="w-16 rounded-lg bg-surface-2 border border-line px-3 py-2 nums outline-none focus:border-ink-3"
                placeholder={athlete.heightCm ? String(cmToFeetInches(athlete.heightCm).feet) : "ft"}
                inputMode="numeric"
                value={htFt}
                onChange={(e) => setHtFt(e.target.value.replace(/[^\d]/g, ""))}
              />
              <span className="text-ink-3 text-sm">ft</span>
              <input
                className="w-16 rounded-lg bg-surface-2 border border-line px-3 py-2 nums outline-none focus:border-ink-3"
                placeholder={
                  athlete.heightCm ? String(Math.round(cmToFeetInches(athlete.heightCm).inches)) : "in"
                }
                inputMode="decimal"
                value={htIn}
                onChange={(e) => setHtIn(e.target.value.replace(/[^\d.]/g, ""))}
              />
              <span className="text-ink-3 text-sm">in</span>
            </>
          )}
          <button onClick={saveHeight} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
            Update height
          </button>
          <span className="text-ink-3 text-xs nums">
            current: {formatHeight(athlete.heightCm, athlete.unit)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              exportJson(data);
              store.update((d) => ({
                ...d,
                settings: { ...d.settings, lastBackupISO: localISODate() },
              }));
            }}
            className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm"
          >
            ⬇ Export backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm"
          >
            ⬆ Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const d = await importJson(f);
                save(d);
                store.update(() => d);
              } catch {
                alert("Not a valid Protean backup file.");
              }
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-ink-3 text-xs">
          Everything lives in this browser's storage — export a backup now and then.
        </p>

        <div className="border-t border-line pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Straight-arm pacing</div>
              <div className="text-ink-3 text-xs">
                {tendonPacing === "guided"
                  ? "Advancement on straight-arm steps waits 21 days between steps."
                  : "Warnings only — advancement is never blocked."}
              </div>
            </div>
            <button
              onClick={() =>
                store.update((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    tendonPacing: d.settings.tendonPacing === "guided" ? "advisory" : "guided",
                  },
                }))
              }
              className="shrink-0 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm capitalize"
            >
              {tendonPacing}
            </button>
          </div>
          <p className="text-ink-3 text-[11px] mt-2">
            Tendon and ligament collagen turns over far slower than muscle, so straight-arm work
            (front lever, planche, LaLanne push-ups) outpaces its own connective tissue — that is
            where most calisthenics elbow and shoulder injuries come from. Advisory is the default:
            the warning appears, the decision stays yours.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section className="rounded-2xl bg-surface-1 border border-line p-4">
        <h2 className="font-semibold text-sm mb-1.5">How the numbers work</h2>
        <ul className="text-ink-2 text-xs leading-relaxed list-disc pl-4 flex flex-col gap-1">
          <li>e1RM: Brzycki (&lt;8 reps) blended into Epley (≥10); never estimated above 15 reps.</li>
          <li>Bodyweight moves convert to load via force-plate fractions (push-up 75% BW, pull-up/dip 96%, pistol 84%).</li>
          <li>Levels come from sex-specific strengthlevel.com tables interpolated at your actual bodyweight.</li>
          <li>Strength levels are DOTS/Wilks-normalized, so a score means the same thing at any bodyweight.</li>
          <li>Chain advancement: all sets at target ×2 sessions. Straight-arm steps carry a 21-day tendon-pacing note — advisory by default, enforceable from Settings above.</li>
          <li>Deloads: half the sets at 90% load — never a full week off.</li>
          <li>Flips and high-risk skills never unlock from numbers — you attest them, with surface/spotter guidance.</li>
        </ul>
        <p className="text-ink-3 text-[11px] mt-2">
          Full sourced research in <span className="nums">docs/research/</span> of this project.
        </p>
      </section>

      <BottomSheet open={qOpen} onClose={() => setQOpen(false)}>
        <h2 className="text-xl font-bold mb-1">Seeded defaults &amp; decisions</h2>
        <p className="text-ink-2 text-sm mb-4">
          The printable didn't specify these. Some have since been settled by your decisions;
          the rest run on evidence-based defaults (editable in{" "}
          <span className="nums">src/data/seed-plan.ts</span>).
        </p>
        <div className="flex flex-col gap-3">
          {authorQuestions.map((q) => {
            const resolved = RESOLVED_QUESTIONS[q.id.toUpperCase()];
            return (
              <div key={q.id} className="rounded-xl bg-surface-1 border border-line p-3">
                <div className="text-sm font-medium">{q.id.toUpperCase()} — {q.question}</div>
                {resolved ? (
                  <div className="text-xs mt-1" style={{ color: "#e8b23a" }}>✓ {resolved}</div>
                ) : (
                  <div className="text-ink-2 text-xs mt-1">Default in effect: {q.seedDefault}</div>
                )}
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

function ChainBoard({
  slot,
  accent,
  stateIndex,
  confirms,
  alt,
  feedsGoal,
}: {
  slot: Slot;
  accent: string;
  stateIndex?: number;
  confirms: number;
  alt?: { usingAlt: boolean; toggle: () => void };
  feedsGoal?: boolean;
}) {
  const hue = SECTORS[slot.sector].hex;
  const inStep = isInStepSlot(slot);
  const current = stateIndex ?? (inStep ? 0 : slot.chain.length - 1);
  const info = targetFor(slot, { stepIndex: current, confirmCount: confirms });

  return (
    <section
      className={`rounded-2xl bg-surface-1 border border-line p-4 ${slot.optional ? "opacity-60" : ""}`}
      style={{ borderLeft: `3px solid ${hue}` }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: hue }}>
          {SECTORS[slot.sector].short} · {slot.id} · {slot.sets} sets
          {slot.optional && <span className="text-ink-3"> · OPTIONAL</span>}
          {feedsGoal && <span style={{ color: "#e8b23a" }}> · ★ GOAL</span>}
          {slot.tiers.length === 3 && <span className="nums"> · {slot.tiers.join("/")}</span>}
        </div>
        {alt && (
          <button onClick={alt.toggle} className="text-xs text-ink-3 underline underline-offset-2">
            {alt.usingAlt ? "use main slot" : "use alternative"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {slot.chain.map((step, i) => {
          const isCurrent = inStep || i === current;
          const done = !inStep && i > current; // easier steps already passed
          const name = step.ex ? exercises[step.ex]?.name ?? step.n : step.n;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${
                isCurrent ? "bg-surface-2 border border-ink-3" : ""
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: isCurrent ? accent : done ? hue : "var(--color-surface-3)",
                }}
              />
              <span className={isCurrent ? "text-ink-1 font-medium" : done ? "text-ink-3 line-through decoration-1" : "text-ink-2"}>
                {name}
              </span>
              <span className="ml-auto text-xs text-ink-3 nums shrink-0">
                {inStep ? info.target : slot.tiers[Math.min(step.band, slot.tiers.length - 1)]}
                {slot.unit === "seconds" || slot.type === "quasi_iso" || slot.type === "timed_hold" ? "s" : ""}
                {step.sa ? " · SA" : ""}
                {step.load ? " · +kg" : ""}
              </span>
            </div>
          );
        })}
      </div>
      {(slot.chain.length > 1 || inStep) && (
        <div className="text-xs text-ink-3 mt-2 nums">
          target {info.target}/set{inStep ? ` (tier ${current + 1}/${slot.tiers.length})` : ""} · advance
          progress {confirms}/2 sessions
        </div>
      )}
      <SlotFeeds slot={slot} current={current} inStep={inStep} />
    </section>
  );
}

/** What the CURRENT step of this slot credits in the skill tree. */
function SlotFeeds({ slot, current, inStep }: { slot: Slot; current: number; inStep: boolean }) {
  const step = slot.chain[inStep ? 0 : Math.min(current, slot.chain.length - 1)];
  const exIds = step?.ex ? [step.ex] : (step?.opts ?? []).map((o) => o.ex);
  const nodes = [...new Map(exIds.flatMap((id) => creditedNodes(id)).map((n) => [n.id, n])).values()];
  if (nodes.length === 0) return null;

  const shown = nodes.slice(0, 3);
  return (
    <div className="text-xs text-ink-3 mt-1.5">
      feeds{" "}
      {shown.map((n, i) => (
        <span key={n.id}>
          {i > 0 && ", "}
          <span className={n.isStunt ? "text-ink-1 font-medium" : "text-ink-2"}>{n.name}</span>
          {n.isStunt && " ★"}
        </span>
      ))}
      {nodes.length > shown.length && <span> +{nodes.length - shown.length}</span>}
    </div>
  );
}
