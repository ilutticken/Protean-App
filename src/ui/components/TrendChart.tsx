import { useMemo, useRef, useState } from "react";

export interface TrendPoint {
  date: string; // ISO yyyy-mm-dd
  value: number;
  flagged?: boolean; // e1RM from 11-15 reps: reduced confidence
}

/**
 * Single-series trend line (e1RM per doc 05 §3.1): raw per-session line (recessive)
 * + 7-session rolling-median trend (prominent), session dots with surface rings,
 * PR direct label, crosshair tooltip. Single series → no legend (title names it).
 */
export default function TrendChart({
  points,
  unit,
  color = "var(--accent)",
  height = 180,
}: {
  points: TrendPoint[];
  unit: string;
  color?: string;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const PAD = { l: 40, r: 14, t: 18, b: 22 };

  const model = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map((p) => Date.parse(p.date));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const vals = points.map((p) => p.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = Math.max(rawMax - rawMin, 1);
    const lo = Math.max(0, rawMin - span * 0.15);
    const hi = rawMax + span * 0.2;
    const x = (t: number) =>
      maxX === minX ? PAD.l + (W - PAD.l - PAD.r) / 2 : PAD.l + ((t - minX) / (maxX - minX)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const median = points.map((_, i) => {
      const win = vals.slice(Math.max(0, i - 6), i + 1).slice().sort((a, b) => a - b);
      return win.length % 2 ? win[(win.length - 1) / 2] : (win[win.length / 2 - 1] + win[win.length / 2]) / 2;
    });
    // clean y ticks
    const step = niceStep((hi - lo) / 3);
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(Math.round(v * 100) / 100);
    const prIx = vals.indexOf(rawMax);
    return { xs, x, y, median, ticks, prIx };
  }, [points, H]);

  if (!model || points.length === 0) {
    return (
      <div className="grid place-items-center h-32 text-ink-3 text-sm">
        No data yet — log sets to see the trend.
      </div>
    );
  }

  const { xs, x, y, median, ticks, prIx } = model;
  const rawPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(xs[i]).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const medPath = median.map((v, i) => `${i === 0 ? "M" : "L"}${x(xs[i]).toFixed(1)},${y(v).toFixed(1)}`).join("");

  function onMove(e: React.PointerEvent) {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    xs.forEach((t, i) => {
      const d = Math.abs(x(t) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  }

  const h = hover;
  return (
    <div ref={wrapRef} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="trend chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-surface-3)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-3)" className="nums">
              {t}
            </text>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="10" fill="var(--color-ink-3)">
          {points[0].date.slice(0, 10)} → {points[points.length - 1].date.slice(0, 10)}
        </text>
        <path d={rawPath} fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" strokeLinejoin="round" strokeLinecap="round" />
        <path d={medPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(xs[i])}
            cy={y(p.value)}
            r={h === i ? 5.5 : 4}
            fill={p.flagged ? "var(--color-surface-1)" : color}
            stroke={p.flagged ? color : "var(--color-surface-1)"}
            strokeWidth="2"
          />
        ))}
        {prIx >= 0 && (
          <text
            x={Math.min(x(xs[prIx]), W - 60)}
            y={Math.max(y(points[prIx].value) - 10, 12)}
            fontSize="11"
            fontWeight="700"
            fill="var(--color-ink-1)"
            textAnchor="middle"
            className="nums"
          >
            PR {points[prIx].value}{unit}
          </text>
        )}
        {h !== null && (
          <line x1={x(xs[h])} x2={x(xs[h])} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-3)" strokeWidth="1" />
        )}
      </svg>
      {h !== null && (
        <div
          className="absolute pointer-events-none rounded-lg bg-surface-3 border border-line px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(x(xs[h]) / W) * 100}%`,
            top: 0,
            transform: `translateX(${x(xs[h]) > W / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="text-ink-2">{points[h].date}</div>
          <div className="nums font-bold text-ink-1">
            {points[h].value} {unit}
            {points[h].flagged && <span className="text-ink-3 font-normal"> ~est</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.1))));
  const n = raw / mag;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag;
}
