import { useEffect, useRef, useState } from "react";

/**
 * Guided overcoming-isometric timer (doc 05 §1): for each angle, `sets` reps of
 * `holdSec` max-effort pushes with a 3-2-1 lead-in; auto-advances through angles.
 * Also usable for quasi-iso holds (1 angle, 1 set, 60 s).
 */
export default function IsoTimer({
  angles,
  sets,
  holdSec,
  restRepSec = 30,
  restAngleSec = 60,
  onFinish,
  onCancel,
}: {
  angles: string[]; // e.g. ["Knee 90°", "Knee 115°", "Knee 140°"]
  sets: number;
  holdSec: number;
  restRepSec?: number;
  restAngleSec?: number;
  onFinish: () => void;
  onCancel: () => void;
}) {
  type PhaseKind = "lead" | "push" | "rest";
  const [angleIx, setAngleIx] = useState(0);
  const [setIx, setSetIx] = useState(0);
  const [phase, setPhase] = useState<PhaseKind>("lead");
  const [left, setLeft] = useState(3);
  const stateRef = useRef({ angleIx, setIx, phase });
  stateRef.current = { angleIx, setIx, phase };

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((l) => {
        if (l > 1) return l - 1;
        const s = stateRef.current;
        if (navigator.vibrate) navigator.vibrate(60);
        if (s.phase === "lead") {
          setPhase("push");
          return holdSec;
        }
        if (s.phase === "push") {
          const lastSet = s.setIx === sets - 1;
          const lastAngle = s.angleIx === angles.length - 1;
          if (lastSet && lastAngle) {
            clearInterval(t);
            onFinish();
            return 0;
          }
          setPhase("rest");
          return lastSet ? restAngleSec : restRepSec;
        }
        // rest -> next rep or next angle
        if (s.setIx === sets - 1) {
          setAngleIx(s.angleIx + 1);
          setSetIx(0);
        } else {
          setSetIx(s.setIx + 1);
        }
        setPhase("lead");
        return 3;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phaseLabel = phase === "lead" ? "GET READY" : phase === "push" ? "PUSH MAX" : "REST";
  const phaseColor =
    phase === "push" ? "var(--accent)" : phase === "lead" ? "#e8a33c" : "var(--color-ink-2)";

  return (
    <div className="fixed inset-0 z-50 bg-surface-0/97 grid place-items-center">
      <div className="text-center px-6">
        <div className="text-ink-2 text-sm uppercase tracking-widest mb-1">
          {angles[angleIx]} · rep {setIx + 1}/{sets}
        </div>
        <div className="text-2xl font-bold mb-4" style={{ color: phaseColor }}>
          {phaseLabel}
        </div>
        <div className="nums font-extrabold leading-none" style={{ fontSize: 96, color: phaseColor }}>
          {left}
        </div>
        <div className="flex justify-center gap-1.5 mt-6">
          {angles.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === angleIx ? 24 : 10,
                background: i < angleIx ? "var(--accent)" : i === angleIx ? phaseColor : "var(--color-surface-3)",
              }}
            />
          ))}
        </div>
        <button onClick={onCancel} className="mt-10 text-ink-3 text-sm underline underline-offset-4">
          Cancel
        </button>
      </div>
    </div>
  );
}
