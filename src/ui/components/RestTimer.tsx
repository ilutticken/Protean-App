import { useEffect, useRef, useState } from "react";

/**
 * Auto-starting rest countdown pill (doc 05 §1): starts on set-✓, ±30 s, skip.
 * Rendered pinned above the bottom nav by the workout screen.
 */
export default function RestTimer({
  seconds,
  onDone,
  onSkip,
}: {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(Date.now() + seconds * 1000);

  useEffect(() => {
    endRef.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        if (navigator.vibrate) navigator.vibrate(80);
        onDone();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bump(delta: number) {
    endRef.current += delta * 1000;
    setLeft(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
  }

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed bottom-20 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-surface-2 border border-line shadow-xl pl-5 pr-2 py-2">
        <span className="text-xs uppercase tracking-wide text-ink-2">Rest</span>
        <span className="nums text-3xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
          {mm}:{ss}
        </span>
        <button onClick={() => bump(-30)} className="rounded-full bg-surface-3 px-3 py-1.5 text-sm text-ink-2">
          −30
        </button>
        <button onClick={() => bump(30)} className="rounded-full bg-surface-3 px-3 py-1.5 text-sm text-ink-2">
          +30
        </button>
        <button onClick={onSkip} className="rounded-full bg-surface-3 px-3 py-1.5 text-sm text-ink-2">
          Skip
        </button>
      </div>
    </div>
  );
}
