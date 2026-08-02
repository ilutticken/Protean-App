import { useEffect, useMemo, useRef, useState } from "react";
import type { SkillNode, SkillStatus, Sector } from "../../lib/types";
import { SECTORS, SECTOR_ORDER } from "../sectors";

export interface MapNode {
  node: SkillNode;
  status: SkillStatus;
  /** progress toward criterion 0..1 (drives the in-progress ring) */
  pct: number;
}

/**
 * The hex skill map (doc 05 §4): 9 × 40° sectors radiating from a central figure,
 * build-time radial layout, single-transform pan/zoom (pointer events, pinch),
 * LOD labels at zoom ≥ 0.7, ≥44px hit circles, sector chips row for jumps.
 */
export default function StuntMap({
  nodes,
  onSelect,
}: {
  nodes: MapNode[];
  onSelect: (id: string) => void;
}) {
  const layout = useMemo(() => computeLayout(nodes), [nodes]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  // Rendered width of the SVG in CSS pixels — needed to reason about how big a
  // world unit actually is on screen (the map is thousands of world units wide).
  const [svgPx, setSvgPx] = useState(400);
  const gesture = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    start: { x: number; y: number; k: number };
    startMid: { x: number; y: number };
    startDist: number;
    moved: boolean;
  } | null>(null);

  const SIZE = layout.size;
  const B = layout.bounds;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => setSvgPx(el.getBoundingClientRect().width || 400);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** CSS pixels per world unit at the current zoom. */
  const pxPerWorld = (svgPx / B.w) * view.k;
  /**
   * Zoom at which a LABEL_FONT label renders ~10 px — the least zoom that is still
   * readable, so the most context fits on screen. (Going bigger shows ~3 nodes on a
   * phone; smaller and the names blur.)
   */
  const readableK = clampK((0.72 * B.w) / Math.max(svgPx, 1));

  function clientToLocal(e: { clientX: number; clientY: number }) {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: B.x + ((e.clientX - r.left) / r.width) * B.w,
      y: B.y + ((e.clientY - r.top) / r.height) * B.h,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = clientToLocal(e);
    if (!gesture.current) {
      gesture.current = {
        pointers: new Map(),
        start: { ...view },
        startMid: p,
        startDist: 0,
        moved: false,
      };
    }
    gesture.current.pointers.set(e.pointerId, p);
    const g = gesture.current;
    g.start = { ...view };
    const pts = [...g.pointers.values()];
    g.startMid = mid(pts);
    g.startDist = pts.length >= 2 ? dist(pts[0], pts[1]) : 0;
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || !g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, clientToLocal(e));
    const pts = [...g.pointers.values()];
    const m = mid(pts);
    const dx = m.x - g.startMid.x;
    const dy = m.y - g.startMid.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
    let k = g.start.k;
    if (pts.length >= 2 && g.startDist > 0) {
      k = clampK(g.start.k * (dist(pts[0], pts[1]) / g.startDist));
      g.moved = true;
    }
    // keep the gesture midpoint stationary while scaling
    const wx = (g.startMid.x - g.start.x) / g.start.k;
    const wy = (g.startMid.y - g.start.y) / g.start.k;
    setView({ x: m.x - wx * k, y: m.y - wy * k, k });
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size === 0) {
      gesture.current = null;
    } else {
      // Re-anchor so lifting one finger of a pinch doesn't snap zoom back
      // to the pre-pinch level on the next move (review finding #22).
      g.start = { ...view };
      const pts = [...g.pointers.values()];
      g.startMid = mid(pts);
      g.startDist = pts.length >= 2 ? dist(pts[0], pts[1]) : 0;
    }
  }

  function onWheel(e: React.WheelEvent) {
    const p = clientToLocal(e);
    const k = clampK(view.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    const wx = (p.x - view.x) / view.k;
    const wy = (p.y - view.y) / view.k;
    setView({ x: p.x - wx * k, y: p.y - wy * k, k });
  }

  /**
   * Jump to a sector at a READABLE zoom rather than fitting the whole sector: a
   * 50-node sector cannot be legibly fitted on a phone, so we centre it and let
   * the user pan. Entry (lowest-ring) nodes are framed first — that is where a
   * beginner starts.
   */
  function jumpToSector(sec: Sector) {
    const box = layout.sectorBox[sec];
    const entry = layout.sectorEntry[sec];
    if (!box) return;
    const k = Math.max(readableK, Math.min(B.w / box.w, B.h / box.h));
    const cx = entry ? entry.x : box.x + box.w / 2;
    const cy = entry ? entry.y : box.y + box.h / 2;
    setView({ x: B.x + B.w / 2 - cx * k, y: B.y + B.h / 2 - cy * k, k });
  }

  function fitAll() {
    setView({ x: 0, y: 0, k: 1 });
  }

  // Labels are sized in world units, so visibility depends on their SCREEN size (LOD).
  const showLabels = LABEL_FONT * pxPerWorld >= 8.5;
  // Keep strokes ~constant on screen without vanishing when zoomed out to fit.
  const strokeWorld = Math.min(9, Math.max(1.5, 1.8 / Math.max(pxPerWorld, 0.001)));

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        <button
          onClick={fitAll}
          className="shrink-0 rounded-full border border-line bg-surface-1 px-3 py-1.5 text-xs text-ink-2"
        >
          ⌂ All
        </button>
        {SECTOR_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => jumpToSector(s)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: `color-mix(in oklab, ${SECTORS[s].hex} 55%, transparent)`,
              color: `color-mix(in oklab, ${SECTORS[s].hex} 80%, white)`,
              background: `color-mix(in oklab, ${SECTORS[s].hex} 12%, var(--color-surface-1))`,
            }}
          >
            {SECTORS[s].short}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl bg-surface-1 border border-line overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <svg
          ref={svgRef}
          viewBox={`${B.x} ${B.y} ${B.w} ${B.h}`}
          className="w-full h-[64vh] max-h-[760px] select-none"
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {/* edges */}
            {layout.edges.map((e) => (
              <path
                key={e.key}
                d={e.d}
                fill="none"
                stroke={e.color}
                strokeWidth={strokeWorld * 0.8}
                strokeDasharray={e.cross ? `${strokeWorld * 3} ${strokeWorld * 2.5}` : undefined}
                opacity={e.lit ? 0.95 : 0.4}
              />
            ))}
            {/* center figure */}
            <CenterFigure cx={SIZE / 2} cy={SIZE / 2} />
            {/* nodes */}
            {layout.placed.map((p) => (
              <NodeGlyph
                key={p.mn.node.id}
                p={p}
                showLabel={showLabels}
                fontSize={LABEL_FONT}
                strokeWorld={strokeWorld}
                onTap={() => {
                  if (!gesture.current?.moved) onSelect(p.mn.node.id);
                }}
              />
            ))}
          </g>
        </svg>
      </div>
      <p className="text-ink-3 text-[11px] mt-1.5 text-center">
        {showLabels
          ? "drag to pan · pinch/scroll to zoom · tap a node for details"
          : "tap a sector chip above to zoom in and read the names"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Placed {
  mn: MapNode;
  x: number;
  y: number;
  hex: string;
}

// Layout constants (world units). NODE_ARC is the tangential space each node needs
// so neither hexes NOR their labels collide; RING_GAP is the radial equivalent.
const R0 = 200; // first ring radius (leaves room for the centre figure)
const NODE_ARC = 112;
const RING_GAP = 104;
const STAGGER = 30; // radial zig-zag applied to crowded rings
export const LABEL_FONT = 14; // world units; LOD hides labels when this is sub-pixel
const WEDGE_MARGIN_DEG = 3;
const MIN_WEDGE_DEG = 16;

/**
 * Radial wedge layout with three anti-overlap mechanisms:
 *  1. wedge width is allocated per sector in proportion to its widest ring, so a
 *     52-node sector is not squeezed into the same 40° as a 10-node one;
 *  2. each ring's radius grows to whatever the arc needs (count × NODE_ARC), so a
 *     crowded ring pushes outward instead of overlapping;
 *  3. crowded rings zig-zag radially, halving the arc each node needs.
 */
function computeLayout(nodes: MapNode[]) {
  const bySector = new Map<Sector, MapNode[]>();
  for (const s of SECTOR_ORDER) bySector.set(s, []);
  for (const n of nodes) bySector.get(n.node.sector)?.push(n);

  // Ring buckets per sector, plus each sector's angular "demand" (its widest ring).
  const ringsBySector = new Map<Sector, Map<number, MapNode[]>>();
  const demand = new Map<Sector, number>();
  for (const sec of SECTOR_ORDER) {
    const rings = new Map<number, MapNode[]>();
    for (const n of bySector.get(sec)!) {
      const r = n.node.ring;
      if (!rings.has(r)) rings.set(r, []);
      rings.get(r)!.push(n);
    }
    ringsBySector.set(sec, rings);
    let widest = 1;
    for (const members of rings.values()) {
      widest = Math.max(widest, members.length > 4 ? members.length / 2 : members.length);
    }
    demand.set(sec, Math.max(widest, 1));
  }

  // Proportional wedge allocation (with a floor so thin sectors stay clickable).
  const totalDemand = SECTOR_ORDER.reduce((s, sec) => s + demand.get(sec)!, 0);
  const floorTotal = MIN_WEDGE_DEG * SECTOR_ORDER.length;
  const flexible = 360 - floorTotal;
  const wedgeDeg = new Map<Sector, number>();
  for (const sec of SECTOR_ORDER) {
    wedgeDeg.set(sec, MIN_WEDGE_DEG + (flexible * demand.get(sec)!) / totalDemand);
  }

  const pos = new Map<string, Placed>();
  let maxR = R0;
  let angleCursor = -90;

  for (const sec of SECTOR_ORDER) {
    const hex = SECTORS[sec].hex;
    const wedge = wedgeDeg.get(sec)!;
    const a0 = angleCursor + WEDGE_MARGIN_DEG;
    const a1 = angleCursor + wedge - WEDGE_MARGIN_DEG;
    angleCursor += wedge;
    const wedgeRad = Math.max(((a1 - a0) * Math.PI) / 180, 0.05);

    const rings = ringsBySector.get(sec)!;
    const sortedRings = [...rings.keys()].sort((a, b) => a - b);
    let prevRadius = R0 - RING_GAP;
    let prevStaggered = false;

    for (const ring of sortedRings) {
      const members = rings.get(ring)!;
      // order by mean placed-parent angle to reduce edge crossings
      members.sort((m1, m2) => meanParentAngle(m1, pos, a0, a1) - meanParentAngle(m2, pos, a0, a1));

      const staggered = members.length > 4;
      const arcNeed = staggered ? NODE_ARC / 2 : NODE_ARC;
      const gap = RING_GAP + (prevStaggered ? STAGGER : 0) + (staggered ? STAGGER : 0);
      const radius = Math.max(prevRadius + gap, (members.length * arcNeed) / wedgeRad);

      members.forEach((mn, i) => {
        // inset endpoints by half a slot so neighbouring wedges never touch
        const t = members.length === 1 ? 0.5 : (i + 0.5) / members.length;
        const ang = (a0 + t * (a1 - a0)) * (Math.PI / 180);
        const r = radius + (staggered ? (i % 2 === 0 ? -STAGGER : STAGGER) : 0);
        maxR = Math.max(maxR, r);
        pos.set(mn.node.id, { mn, x: r * Math.cos(ang), y: r * Math.sin(ang), hex });
      });

      prevRadius = radius;
      prevStaggered = staggered;
    }
  }

  const size = (maxR + 140) * 2;
  const cx = size / 2;
  for (const p of pos.values()) {
    p.x += cx;
    p.y += cx;
  }

  // tight content bounds (the wedge layout leaves large empty corners otherwise)
  let minX = cx, maxX = cx, minY = cx, maxY = cx;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const M = 110;
  const bounds = {
    x: minX - M,
    y: minY - M,
    w: maxX - minX + 2 * M,
    h: maxY - minY + 2 * M,
  };

  const edges: { key: string; d: string; color: string; cross: boolean; lit: boolean }[] = [];
  for (const p of pos.values()) {
    for (const pre of p.mn.node.prereqs) {
      const q = pos.get(pre);
      if (!q) continue;
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      // bow slightly outward from center
      const dx = mx - cx;
      const dy = my - cx;
      const len = Math.hypot(dx, dy) || 1;
      const bx = mx + (dx / len) * 14;
      const by = my + (dy / len) * 14;
      edges.push({
        key: `${pre}->${p.mn.node.id}`,
        d: `M${q.x.toFixed(1)},${q.y.toFixed(1)}Q${bx.toFixed(1)},${by.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
        color: q.hex,
        cross: q.mn.node.sector !== p.mn.node.sector,
        lit: q.mn.status === "achieved",
      });
    }
  }

  // Per-sector bounding boxes so a chip tap can zoom-to-fit that sector.
  const sectorBox = {} as Record<Sector, { x: number; y: number; w: number; h: number }>;
  const acc = new Map<Sector, { x0: number; y0: number; x1: number; y1: number }>();
  for (const p of pos.values()) {
    const s = p.mn.node.sector;
    const a = acc.get(s) ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    a.x0 = Math.min(a.x0, p.x);
    a.y0 = Math.min(a.y0, p.y);
    a.x1 = Math.max(a.x1, p.x);
    a.y1 = Math.max(a.y1, p.y);
    acc.set(s, a);
  }
  const PAD = 90;
  for (const [s, a] of acc) {
    sectorBox[s] = {
      x: a.x0 - PAD,
      y: a.y0 - PAD,
      w: a.x1 - a.x0 + 2 * PAD,
      h: a.y1 - a.y0 + 2 * PAD,
    };
  }

  // Where a sector "starts": mean position of its lowest-ring (entry) nodes.
  const sectorEntry = {} as Record<Sector, { x: number; y: number }>;
  for (const sec of SECTOR_ORDER) {
    const members = [...pos.values()].filter((p) => p.mn.node.sector === sec);
    if (!members.length) continue;
    const minRing = Math.min(...members.map((p) => p.mn.node.ring));
    const entries = members.filter((p) => p.mn.node.ring === minRing);
    sectorEntry[sec] = {
      x: entries.reduce((s, p) => s + p.x, 0) / entries.length,
      y: entries.reduce((s, p) => s + p.y, 0) / entries.length,
    };
  }

  return { placed: [...pos.values()], edges, size, maxR, bounds, sectorBox, sectorEntry };
}

function meanParentAngle(mn: MapNode, pos: Map<string, Placed>, a0: number, a1: number): number {
  const parents = mn.node.prereqs.map((p) => pos.get(p)).filter(Boolean) as Placed[];
  if (!parents.length) return (a0 + a1) / 2;
  return (
    parents.reduce((s, p) => s + Math.atan2(p.y, p.x), 0) / parents.length
  );
}

function hexPath(cx: number, cy: number, r: number): string {
  // flat-top hexagon
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
}

function NodeGlyph({
  p,
  showLabel,
  fontSize,
  strokeWorld,
  onTap,
}: {
  p: Placed;
  showLabel: boolean;
  fontSize: number;
  strokeWorld: number;
  onTap: () => void;
}) {
  const { status } = p.mn;
  const { isStunt } = p.mn.node;
  const r = isStunt ? 26 : 20;
  const locked = status === "locked";
  const achieved = status === "achieved";
  const inProgress = status === "in-progress";

  return (
    <g
      opacity={locked ? 0.5 : 1}
      role="button"
      aria-label={`${p.mn.node.name} — ${status}`}
      onPointerUp={onTap}
      style={{ cursor: "pointer" }}
    >
      {/* invisible >=44px hit circle */}
      <circle cx={p.x} cy={p.y} r={Math.max(24, r + 6)} fill="transparent" />
      <path
        d={hexPath(p.x, p.y, r)}
        fill={
          achieved
            ? p.hex
            : inProgress
              ? `color-mix(in oklab, ${p.hex} 38%, var(--color-surface-1))`
              : "var(--color-surface-1)"
        }
        stroke={p.hex}
        strokeWidth={strokeWorld * (isStunt ? 1.6 : 1.1)}
      />
      {isStunt && !locked && (
        <path
          d={hexPath(p.x, p.y, r + 6)}
          fill="none"
          stroke={p.hex}
          strokeWidth={strokeWorld * 0.6}
          opacity="0.5"
        />
      )}
      {inProgress && p.mn.pct > 0 && (
        <ProgressRing
          cx={p.x}
          cy={p.y}
          r={r + 6}
          pct={p.mn.pct}
          color={p.hex}
          width={strokeWorld * 1.3}
        />
      )}
      {achieved && (
        <path
          d={`M${p.x - 8},${p.y + 1} l5.5,6 l10,-13`}
          fill="none"
          stroke="var(--color-surface-0)"
          strokeWidth={Math.max(3, strokeWorld * 1.6)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {showLabel &&
        labelLines(p.mn.node.name).map((line, li) => (
          <text
            key={li}
            x={p.x}
            y={p.y + r + fontSize + 2 + li * (fontSize + 1)}
            textAnchor="middle"
            fontSize={fontSize}
            fill={locked ? "var(--color-ink-3)" : "var(--color-ink-1)"}
            fontWeight={isStunt ? 700 : 500}
            stroke="var(--color-surface-1)"
            strokeWidth="3.5"
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {line}
          </text>
        ))}
    </g>
  );
}

function ProgressRing({
  cx,
  cy,
  r,
  pct,
  color,
  width,
}: {
  cx: number;
  cy: number;
  r: number;
  pct: number;
  color: string;
  width: number;
}) {
  const circ = 2 * Math.PI * r;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeDasharray={`${circ * Math.min(pct, 1)} ${circ}`}
      strokeLinecap="round"
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}

function CenterFigure({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke="var(--color-ink-3)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8">
      <circle cx={cx} cy={cy - 34} r="11" fill="var(--color-surface-2)" />
      <path d={`M${cx},${cy - 22} V${cy + 8}`} />
      <path d={`M${cx},${cy - 14} L${cx - 22},${cy + 4} M${cx},${cy - 14} L${cx + 22},${cy + 4}`} />
      <path d={`M${cx},${cy + 8} L${cx - 14},${cy + 36} M${cx},${cy + 8} L${cx + 14},${cy + 36}`} />
    </g>
  );
}

/**
 * Wrap a node name to at most MAX_LINES lines of ~MAX chars so it stays inside its
 * NODE_ARC slot (~112 world units). Anything that still does not fit is ELLIPSIZED —
 * silently dropping trailing words made distinct skills read identically.
 */
export function labelLines(name: string): string[] {
  const MAX = 15;
  const MAX_LINES = 3;
  if (name.length <= MAX) return [name];

  const words = name.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= MAX) {
      cur = candidate;
      continue;
    }
    if (cur) lines.push(cur);
    cur = w;
    if (lines.length === MAX_LINES) break;
  }
  if (lines.length < MAX_LINES && cur) lines.push(cur);

  // Hard-truncate any single over-long word, and mark dropped content.
  const truncated = lines.slice(0, MAX_LINES).map((l) => (l.length > MAX ? l.slice(0, MAX - 1) + "…" : l));
  const rendered = truncated.join(" ").replace(/…/g, "");
  if (rendered.length < name.replace(/\s+/g, " ").length && !truncated[truncated.length - 1].endsWith("…")) {
    truncated[truncated.length - 1] = truncated[truncated.length - 1].slice(0, MAX - 1) + "…";
  }
  return truncated;
}

function mid(pts: { x: number; y: number }[]) {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampK(k: number) {
  // Upper bound is generous: the map spans thousands of world units, so reading
  // labels on a phone needs roughly 10x the fit-all zoom.
  return Math.max(0.8, Math.min(30, k));
}
