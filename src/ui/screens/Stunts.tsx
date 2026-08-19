import { useMemo, useState } from "react";
import type { Sex, SkillNode, SkillProgress } from "../../lib/types";
import { skills, locomotionTimeBySex } from "../../data/skills";
import { useApp, updateAthleteState } from "../../lib/useAppData";
import { skillStatuses } from "../../lib/selectors";
import { sectorCompletion, effectiveBwRatio } from "../../lib/skilltree";
import { goalPath as computeGoalPath } from "../../lib/goal";
import { localISODate } from "../../lib/dates";
import StuntMap, { type MapNode } from "../components/StuntMap";
import BottomSheet from "../components/BottomSheet";
import { SECTORS, SECTOR_ORDER } from "../sectors";

// Displayed thresholds must match what criterionMet actually checks for THIS
// athlete: female bwRatio overrides and per-sex locomotion times (finding #17).
function criterionText(node: SkillNode, sex: Sex): string {
  const c = node.criterion;
  switch (c.kind) {
    // `sets` is a real requirement now — criterionMet counts qualifying sets within ONE
    // session (doc 01 R-DYN: "3 sets x 8 clean reps in one session"), so it is displayed.
    case "hold":
      return `${c.sets && c.sets > 1 ? `${c.sets} sets × ` : ""}${c.seconds}s hold`;
    case "reps":
      return `${c.sets && c.sets > 1 ? `${c.sets} sets × ` : ""}${c.reps} reps${c.perSide ? "/side" : ""}, one session`;
    case "weighted-reps": {
      const r = effectiveBwRatio(node.id, c.bwRatio, sex);
      return `${c.sets && c.sets > 1 ? `${c.sets} sets × ` : ""}${c.reps} reps @ +${Math.round(r * 100)}% BW`;
    }
    case "e1rm-ratio": {
      const r = effectiveBwRatio(node.id, c.bwRatio, sex);
      return `${r}× bodyweight ${c.liftId} (e1RM)`;
    }
    case "time": {
      const secs = locomotionTimeBySex[node.id]?.[sex] ?? c.seconds;
      return `${Math.floor(secs / 60)} min ${secs % 60 ? (secs % 60) + "s" : ""}${c.note ? ` — ${c.note}` : ""}`;
    }
    case "distance":
      return `${c.meters >= 1000 ? c.meters / 1000 + " km" : c.meters + " m"}${c.note ? ` — ${c.note}` : ""}`;
    case "total-ratio": {
      const r = effectiveBwRatio(node.id, c.bwRatio, sex);
      return `Squat + bench + deadlift total ≥ ${r}× bodyweight`;
    }
    case "total-kg":
      return `Squat + bench + deadlift total ≥ ${Math.round(c.totalKg)} kg`;
    case "dots":
      return `DOTS ${c.score} on your SBD total (sex- and weight-normalized)`;
    case "composite":
      return "Everything below it — a combination badge";
    case "attested":
      return "Self-attested — no auto-unlock (safety)";
  }
}

/**
 * Log one set of deliberate practice straight against this node.
 *
 * The routine has three hold slots for a tree with ~100 hold nodes, so most skill work
 * (planche leans, tuck front levers, wall handstands) had nowhere to be recorded and those
 * nodes could never move. Same fix as the cardio log: when the plan cannot produce the
 * measurement, give the athlete somewhere to put it.
 *
 * Hidden for attested / balance nodes — those never auto-unlock (locked decision #10) and
 * the producer ignores them anyway, so offering the box would be a lie.
 */
function LogAttempt({ node }: { node: SkillNode }) {
  const store = useApp();
  const { athlete, athleteState } = store;
  const [value, setValue] = useState("");
  const [weight, setWeight] = useState("");

  const kind = node.criterion.kind;
  if (kind === "attested" || node.sector === "balance") return null;
  if (kind === "time" || kind === "distance") return null; // cardio log owns these
  if (kind === "e1rm-ratio") return null; // quick lift-log owns these
  // Derived from the barbell lifts (or from other nodes); nothing to log here.
  if (kind === "total-ratio" || kind === "total-kg" || kind === "dots" || kind === "composite") {
    return null;
  }

  const isHold = kind === "hold";
  const wantsWeight = kind === "weighted-reps";
  const mine = (athleteState.skillLog ?? []).filter((p) => p.nodeId === node.id);
  const todayCount = mine.filter((p) => p.date === localISODate()).length;

  function log() {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return;
    const w = Number(weight);
    updateAthleteState(store, (s) => ({
      ...s,
      skillLog: [
        ...(s.skillLog ?? []),
        {
          date: localISODate(),
          nodeId: node.id,
          value: v,
          ...(wantsWeight && Number.isFinite(w) && w > 0 ? { weightKg: w } : {}),
        },
      ],
    }));
    setValue("");
  }

  return (
    <div className="mt-4 rounded-xl bg-surface-1 border border-line p-3">
      <div className="text-xs text-ink-3 uppercase tracking-wide mb-1.5">Log an attempt</div>
      <div className="flex gap-2 items-center">
        <input
          className="w-24 rounded-lg bg-surface-2 border border-line px-3 py-2 nums outline-none focus:border-ink-3"
          placeholder={isHold ? "seconds" : "reps"}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
        />
        {wantsWeight && (
          <input
            className="w-24 rounded-lg bg-surface-2 border border-line px-3 py-2 nums outline-none focus:border-ink-3"
            placeholder="+kg"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
          />
        )}
        <button
          onClick={log}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-surface-0"
          style={{ background: athlete.accent }}
        >
          Log set
        </button>
      </div>
      <p className="text-ink-3 text-[11px] mt-2">
        One set per tap. {todayCount > 0 ? `${todayCount} logged today · ` : ""}
        {mine.length} total. Sets counted within a single day are what unlock the node.
      </p>
    </div>
  );
}

function pctToward(node: SkillNode, p: SkillProgress | undefined, bw: number, sex: Sex): number {
  if (!p?.best) return 0;
  const c = node.criterion;
  switch (c.kind) {
    case "hold":
      return p.best / c.seconds;
    case "reps":
      return p.best / c.reps;
    case "weighted-reps":
      return bw > 0 ? p.best / (effectiveBwRatio(node.id, c.bwRatio, sex) * bw) : 0;
    case "e1rm-ratio":
      return p.best / effectiveBwRatio(node.id, c.bwRatio, sex);
    case "time": {
      const secs = locomotionTimeBySex[node.id]?.[sex] ?? c.seconds;
      return p.best > 0 ? Math.min(secs / p.best, 0.99) : 0;
    }
    case "distance":
      return p.best / c.meters;
    case "total-ratio":
      return p.best / effectiveBwRatio(node.id, c.bwRatio, sex);
    case "total-kg":
      return p.best / c.totalKg;
    case "dots":
      return p.best / c.score;
    case "composite":
    case "attested":
      return 0;
  }
}

export default function Stunts() {
  const store = useApp();
  const { data, athlete, athleteState } = store;
  const [selected, setSelected] = useState<string | null>(null);
  const [listMode, setListMode] = useState(false);

  const statuses = useMemo(
    () => skillStatuses(data, athlete, athleteState),
    [data, athlete, athleteState],
  );
  const sectors = useMemo(() => sectorCompletion(statuses, skills), [statuses]);

  const mapNodes: MapNode[] = useMemo(
    () =>
      Object.values(skills).map((node) => ({
        node,
        status: statuses[node.id]?.status ?? "locked",
        pct: Math.min(pctToward(node, statuses[node.id], athlete.bodyweightKg, athlete.sex), 1),
      })),
    [statuses, athlete.bodyweightKg, athlete.sex],
  );

  const goal = athleteState.goal ?? null;
  const path = useMemo(
    () => (goal ? computeGoalPath(goal.nodeId, statuses) : null),
    [goal, statuses],
  );

  const sel = selected ? skills[selected] : null;
  const selProgress = selected ? statuses[selected] : undefined;

  const achievedTotal = Object.values(sectors).reduce((n, s) => n + s.achieved, 0);
  const total = Object.values(sectors).reduce((n, s) => n + s.total, 0);

  function attest(id: string) {
    const date = localISODate();
    updateAthleteState(store, (s) => ({
      ...s,
      skillProgress: {
        ...s.skillProgress,
        [id]: { ...(s.skillProgress[id] ?? { status: "achieved" }), status: "achieved", attestedDate: date, achievedDate: date },
      },
    }));
  }

  function unattest(id: string) {
    updateAthleteState(store, (s) => {
      const next = { ...s.skillProgress };
      delete next[id];
      return { ...s, skillProgress: next };
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stunts</h1>
          <p className="text-ink-3 text-xs nums">
            {achievedTotal}/{total} unlocked · {athlete.name}
          </p>
          {path && (
            <button
              onClick={() => setSelected(path.goal.id)}
              className="text-xs mt-0.5 text-left"
              style={{ color: "#e8b23a" }}
            >
              ★ {path.goal.name} — {path.achieved}/{path.total} on path · {path.remaining} steps left
            </button>
          )}
        </div>
        <button
          onClick={() => setListMode((m) => !m)}
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2"
        >
          {listMode ? "⬡ Map" : "☰ List"}
        </button>
      </div>

      {listMode ? (
        <div className="flex flex-col gap-3">
          {SECTOR_ORDER.map((sec) => {
            const nodes = Object.values(skills)
              .filter((n) => n.sector === sec)
              .sort((a, b) => a.ring - b.ring);
            return (
              <details key={sec} className="rounded-2xl bg-surface-1 border border-line overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer font-semibold text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: SECTORS[sec].hex }} />
                  {SECTORS[sec].label}
                  <span className="ml-auto text-ink-3 nums text-xs">
                    {sectors[sec].achieved}/{sectors[sec].total}
                  </span>
                </summary>
                <div className="px-2 pb-2">
                  {nodes.map((n) => {
                    const st = statuses[n.id]?.status ?? "locked";
                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelected(n.id)}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-2 text-left"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border"
                          style={{
                            background: st === "achieved" ? SECTORS[sec].hex : st === "in-progress" ? `color-mix(in oklab, ${SECTORS[sec].hex} 40%, transparent)` : "transparent",
                            borderColor: st === "locked" ? "var(--color-surface-3)" : SECTORS[sec].hex,
                          }}
                        />
                        <span className={`text-sm ${st === "locked" ? "text-ink-3" : "text-ink-1"} ${n.isStunt ? "font-semibold" : ""}`}>
                          {n.name}
                        </span>
                        <span className="ml-auto text-[11px] text-ink-3">{criterionText(n, athlete.sex)}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <StuntMap nodes={mapNodes} onSelect={setSelected} goalId={goal?.nodeId} goalPath={path?.closure} />
      )}

      <BottomSheet open={sel !== null} onClose={() => setSelected(null)}>
        {sel && (
          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: SECTORS[sel.sector].hex }}>
              {SECTORS[sel.sector].label}
              {sel.isStunt && " · STUNT"} · evidence {sel.evidence}
            </div>
            <h2 className="text-2xl font-bold mt-0.5">{sel.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <StatusPill status={selProgress?.status ?? "locked"} hue={SECTORS[sel.sector].hex} />
              {selProgress?.best !== undefined && (
                <span className="text-ink-2 text-sm nums">best: {Math.round(selProgress.best * 100) / 100}</span>
              )}
              {sel.estMonths && (
                <span className="text-ink-3 text-xs nums ml-auto">~{sel.estMonths[0]}–{sel.estMonths[1]} mo</span>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-surface-1 border border-line p-3">
              <div className="text-xs text-ink-3 uppercase tracking-wide mb-1">Unlock</div>
              <div className="text-sm text-ink-1">{criterionText(sel, athlete.sex)}</div>
              {sel.sa && (
                <p className="text-xs text-ink-2 mt-1.5">
                  Straight-arm work. Tendon collagen remodels on a ~12-week clock — far slower than
                  muscle — so this line is where elbows get hurt. Roughly one step per 3 weeks is the
                  pace the research supports. Advice, not a lock.
                </p>
              )}
              {(sel.surface || sel.spotterRequired) && (
                <p className="text-xs text-danger mt-1.5">
                  ⚠️ {sel.spotterRequired ? "Spotter required. " : ""}
                  {sel.surface ? `Progress surface: ${sel.surface} first.` : ""} Never unlockable by numbers alone.
                </p>
              )}
            </div>

            {sel.description && <p className="text-ink-2 text-sm mt-3 leading-relaxed">{sel.description}</p>}

            {sel.prereqs.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-ink-3 uppercase tracking-wide mb-1.5">Prerequisites</div>
                <div className="flex flex-col gap-1">
                  {sel.prereqs.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelected(p)}
                      className="flex items-center gap-2 text-sm text-left py-1"
                    >
                      <span className={statuses[p]?.status === "achieved" ? "text-success" : "text-ink-3"}>
                        {statuses[p]?.status === "achieved" ? "✓" : "○"}
                      </span>
                      <span className="text-ink-2 underline-offset-2 hover:underline">{skills[p]?.name ?? p}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sel.isStunt && (
              <button
                onClick={() => {
                  const isCurrent = goal?.nodeId === sel.id;
                  updateAthleteState(store, (s) => ({
                    ...s,
                    goal: isCurrent ? undefined : { nodeId: sel.id, startedDate: localISODate() },
                  }));
                }}
                className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold border"
                style={
                  goal?.nodeId === sel.id
                    ? { borderColor: "#e8b23a", color: "#e8b23a" }
                    : { borderColor: "var(--color-line)", color: "var(--color-ink-2)" }
                }
              >
                {goal?.nodeId === sel.id ? "★ Your goal — tap to clear" : "☆ Set as goal"}
              </button>
            )}
            {!sel.isStunt && path?.closure.has(sel.id) && selProgress?.status !== "achieved" && (
              <p className="mt-3 text-xs" style={{ color: "#e8b23a" }}>
                ★ On your path to {path.goal.name}
              </p>
            )}

            <LogAttempt node={sel} />

            <div className="mt-5 flex gap-2">
              {selProgress?.status !== "achieved" ? (
                <button
                  onClick={() => attest(sel.id)}
                  className="flex-1 rounded-xl py-3 font-semibold text-surface-0"
                  style={{ background: athlete.accent }}
                >
                  {sel.criterion.kind === "attested" ? "I did this — attest ✓" : "Mark achieved manually"}
                </button>
              ) : selProgress.attestedDate ? (
                <button
                  onClick={() => unattest(sel.id)}
                  className="flex-1 rounded-xl py-3 font-semibold border border-line text-ink-2"
                >
                  Undo attestation
                </button>
              ) : (
                <div className="flex-1 rounded-xl py-3 text-center text-success font-semibold bg-surface-1 border border-line">
                  Unlocked{selProgress.achievedDate ? ` · ${selProgress.achievedDate}` : ""} ✓
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function StatusPill({ status, hue }: { status: string; hue: string }) {
  const label = status === "in-progress" ? "in progress" : status;
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-medium capitalize"
      style={{
        background: status === "achieved" ? hue : "var(--color-surface-3)",
        color: status === "achieved" ? "var(--color-surface-0)" : "var(--color-ink-2)",
      }}
    >
      {label}
    </span>
  );
}
