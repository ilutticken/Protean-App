import { useMemo, useState } from "react";
import { localISODate } from "../../lib/dates";

/**
 * GitHub-style volume heatmap (doc 05 §3.2): weeks × 7 days, 5 bins — 0 = surface,
 * then quartiles of the athlete's own nonzero days, single-hue ramp of the accent.
 */
export default function Heatmap({
  values, // ISO date -> hard sets
  weeks = 26,
  color = "var(--accent)",
}: {
  values: Record<string, number>;
  weeks?: number;
  color?: string;
}) {
  const [tip, setTip] = useState<{ date: string; v: number } | null>(null);

  const model = useMemo(() => {
    const today = new Date();
    // grid ends on the current week's Sunday-start column
    const end = new Date(today);
    const days: { date: string; v: number; col: number; row: number }[] = [];
    const totalDays = weeks * 7;
    const startOffset = (end.getDay() + 6) % 7; // Monday=0 rows
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      // LOCAL date key — mixing UTC keys with local weekday rows shifts every
      // cell one row whenever local != UTC day (review finding #8).
      const iso = localISODate(d);
      const idx = totalDays - 1 - i;
      days.push({
        date: iso,
        v: values[iso] ?? 0,
        col: Math.floor((idx + ((7 - ((totalDays - 1 - startOffset) % 7)) % 7)) / 7),
        row: (d.getDay() + 6) % 7,
      });
    }
    const nonzero = days.filter((d) => d.v > 0).map((d) => d.v).sort((a, b) => a - b);
    const q = (p: number) => (nonzero.length ? nonzero[Math.min(nonzero.length - 1, Math.floor(p * nonzero.length))] : 1);
    const thresholds = [q(0.25), q(0.5), q(0.75)];
    const maxCol = Math.max(...days.map((d) => d.col));
    return { days, thresholds, maxCol };
  }, [values, weeks]);

  const CELL = 11;
  const GAP = 2;
  const W = (model.maxCol + 1) * (CELL + GAP);
  const H = 7 * (CELL + GAP);

  function fill(v: number): string {
    if (v === 0) return "var(--color-surface-2)";
    const [q1, q2, q3] = model.thresholds;
    const pct = v <= q1 ? 30 : v <= q2 ? 55 : v <= q3 ? 78 : 100;
    return `color-mix(in oklab, ${color} ${pct}%, var(--color-surface-2))`;
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg width={W} height={H} className="block" role="img" aria-label="training volume heatmap">
          {model.days.map((d) => (
            <rect
              key={d.date}
              x={d.col * (CELL + GAP)}
              y={d.row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx="2.5"
              fill={fill(d.v)}
              onPointerEnter={() => setTip({ date: d.date, v: d.v })}
              onPointerLeave={() => setTip(null)}
            >
              <title>{`${d.date}: ${d.v} hard sets`}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-ink-3 nums">
          {tip ? `${tip.date} — ${tip.v} hard sets` : `last ${weeks} weeks`}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-ink-3">
          less
          {[0, 30, 55, 78, 100].map((p) => (
            <span
              key={p}
              className="w-2.5 h-2.5 rounded-[3px] inline-block"
              style={{
                background: p === 0 ? "var(--color-surface-2)" : `color-mix(in oklab, ${color} ${p}%, var(--color-surface-2))`,
              }}
            />
          ))}
          more
        </span>
      </div>
    </div>
  );
}
