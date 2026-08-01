import { useMemo } from "react";

export interface RadarSeries {
  name: string;
  color: string;
  /** One value per axis, 0–100, or null when untested. */
  values: (number | null)[];
}

/**
 * Domain radar (doc 05 §3.3): stroked polygon 2px + low-alpha fill, gridlines at
 * 25/50/75, ≥8px vertex markers with surface rings, legend mandatory for 2 series.
 * Pair with a numbers table (parent's responsibility — radar distorts area).
 */
export default function RadarChart({
  axes,
  series,
  size = 320,
}: {
  axes: string[];
  series: RadarSeries[];
  size?: number;
}) {
  const n = axes.length;
  const C = size / 2;
  const R = size / 2 - 62;

  const pt = useMemo(
    () =>
      (axisIx: number, v: number): [number, number] => {
        const ang = (Math.PI * 2 * axisIx) / n - Math.PI / 2;
        const r = (Math.max(0, Math.min(100, v)) / 100) * R;
        return [C + r * Math.cos(ang), C + r * Math.sin(ang)];
      },
    [n, C, R],
  );

  function ringPath(v: number): string {
    return (
      Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, v);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join("") + "Z"
    );
  }

  function seriesPath(values: (number | null)[]): string {
    const pts = values
      .map((v, i) => (v === null ? null : pt(i, v)))
      .filter((p): p is [number, number] => p !== null);
    if (pts.length < 3) return "";
    return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("") + "Z";
  }

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto" role="img" aria-label="domain radar">
        {[25, 50, 75, 100].map((v) => (
          <path key={v} d={ringPath(v)} fill="none" stroke="var(--color-surface-3)" strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 100);
          return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--color-surface-3)" strokeWidth="1" />;
        })}
        {series.map((s) => (
          <g key={s.name}>
            <path d={seriesPath(s.values)} fill={s.color} opacity="0.13" />
            <path d={seriesPath(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
            {s.values.map((v, i) => {
              if (v === null) return null;
              const [x, y] = pt(i, v);
              return (
                <circle key={i} cx={x} cy={y} r="4" fill={s.color} stroke="var(--color-surface-1)" strokeWidth="2" />
              );
            })}
          </g>
        ))}
        {axes.map((label, i) => {
          const [x, y] = pt(i, 116);
          const anchor = Math.abs(x - C) < 8 ? "middle" : x > C ? "start" : "end";
          // keep labels inside the viewBox — flip anchor rather than clip
          const cl = Math.max(4, Math.min(size - 4, x));
          return (
            <text
              key={label}
              x={cl}
              y={y + 3}
              textAnchor={anchor}
              fontSize="10.5"
              fill="var(--color-ink-2)"
              fontWeight="500"
            >
              {label}
            </text>
          );
        })}
      </svg>
      {series.length >= 2 && (
        <div className="flex justify-center gap-5 mt-2">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-ink-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
