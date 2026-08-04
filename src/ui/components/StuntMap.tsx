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
/** Gold used for the goal route — distinct from every sector hue and both status fills. */
export const GOAL_COLOR = "#e8b23a";

export default function StuntMap({
  nodes,
  onSelect,
  goalId,
  goalPath,
}: {
  nodes: MapNode[];
  onSelect: (id: string) => void;
  /** The starred stunt, if any. */
  goalId?: string | null;
  /** Ids on the goal's prerequisite closure — rendered as a gold route. */
  goalPath?: ReadonlySet<string>;
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
   * Zoom at which a LABEL_FONT label renders ~11 px — labels live inside the cells,
   * so this is also the zoom at which a hex is ~100 px wide (≈4 across a phone,
   * the same reading density as the printed reference chart).
   */
  const readableK = clampK((1.0 * B.w) / Math.max(svgPx, 1));

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
  const showLabels = LABEL_FONT * pxPerWorld >= 8;
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
            {/* Non-adjacent prereq links only. Hidden at overview zoom (where they
                read as crosshatch over the honeycomb) unless the prereq is achieved. */}
            {layout.edges
              .filter((e) => showLabels || e.lit)
              .map((e) => (
              <path
                key={e.key}
                d={e.d}
                fill="none"
                stroke={e.color}
                  strokeWidth={strokeWorld * 0.7}
                  strokeDasharray={e.cross ? `${strokeWorld * 3} ${strokeWorld * 2.5}` : undefined}
                  opacity={e.lit ? 0.9 : 0.22}
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
                onGoalPath={goalPath?.has(p.mn.node.id) ?? false}
                isGoal={p.mn.node.id === goalId}
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
  /** axial lattice coords — used to detect neighbouring cells */
  q: number;
  r: number;
}

/** Axial hex distance; 1 means the two cells share an edge. */
function axialDistance(a: Placed, b: Placed): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

// Honeycomb constants (world units). Nodes occupy cells of a real hex lattice, so
// neighbours tessellate the way the KNightNox reference chart does.
export const HEX_R = 52; // circumradius of a lattice cell
const HEX_INSET = 2.5; // drawn smaller than the cell -> 2px-style surface gap
const CENTER_RINGS = 1; // lattice rings 0..1 reserved for the central figure
export const LABEL_FONT = 10.5; // world units; label sits INSIDE the hex

/** Flat-top axial hex -> cartesian. */
function axialToXY(q: number, r: number): { x: number; y: number } {
  return { x: 1.5 * HEX_R * q, y: Math.sqrt(3) * HEX_R * (r + q / 2) };
}

/** The 6k cells of lattice ring k (k=0 -> the single centre cell). */
function hexRing(k: number): [number, number][] {
  if (k === 0) return [[0, 0]];
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  let [q, r] = [dirs[4][0] * k, dirs[4][1] * k];
  const out: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < k; j++) {
      out.push([q, r]);
      q += dirs[i][0];
      r += dirs[i][1];
    }
  }
  return out;
}

/**
 * Honeycomb layout. Each sector owns a contiguous angular slice of the lattice sized
 * in proportion to its node count; its nodes fill that slice's cells ring by ring,
 * ordered shallow -> deep, so progressions radiate outward while cells stay packed
 * edge-to-edge. Labels live INSIDE the cells, so nothing can collide by construction.
 */
function computeLayout(nodes: MapNode[]) {
  const bySector = new Map<Sector, MapNode[]>();
  for (const s of SECTOR_ORDER) bySector.set(s, []);
  for (const n of nodes) bySector.get(n.node.sector)?.push(n);

  // Angular slice per sector, proportional to how many cells it needs.
  const total = nodes.length || 1;
  const range = new Map<Sector, [number, number]>();
  let cursor = -90;
  for (const sec of SECTOR_ORDER) {
    const share = (360 * (bySector.get(sec)!.length || 1)) / total;
    range.set(sec, [cursor, cursor + share]);
    cursor += share;
  }
  const norm = (deg: number): number => ((deg + 90) % 360 + 360) % 360;
  const sectorOf = (deg: number): Sector => {
    const d = norm(deg);
    for (const sec of SECTOR_ORDER) {
      const [a0, a1] = range.get(sec)!;
      if (d >= norm(a0) - 1e-9 && d < norm(a0) + (a1 - a0) - 1e-9) return sec;
    }
    return SECTOR_ORDER[SECTOR_ORDER.length - 1];
  };

  // Bucket lattice cells by sector, walking outward. Stop once every sector is fed.
  const cellsBySector = new Map<Sector, { q: number; r: number; k: number; ang: number }[]>();
  for (const s of SECTOR_ORDER) cellsBySector.set(s, []);
  const needed = new Map<Sector, number>(SECTOR_ORDER.map((s) => [s, bySector.get(s)!.length]));
  for (let k = CENTER_RINGS + 1; k <= 60; k++) {
    for (const [q, r] of hexRing(k)) {
      const { x, y } = axialToXY(q, r);
      const ang = (Math.atan2(y, x) * 180) / Math.PI;
      cellsBySector.get(sectorOf(ang))!.push({ q, r, k, ang });
    }
    if (SECTOR_ORDER.every((s) => cellsBySector.get(s)!.length >= (needed.get(s) ?? 0))) break;
  }

  const pos = new Map<string, Placed>();
  let maxR = HEX_R * (CENTER_RINGS + 1);

  for (const sec of SECTOR_ORDER) {
    const hex = SECTORS[sec].hex;
    const cells = cellsBySector
      .get(sec)!
      .sort((a, b) => a.k - b.k || a.ang - b.ang);

    // Shallow -> deep; within a depth, keep chains together by following the
    // already-placed parents' angular order.
    const members = bySector.get(sec)!;
    const depths = [...new Set(members.map((m) => m.node.ring))].sort((a, b) => a - b);
    const angleIndex = new Map<string, number>();
    const ordered: MapNode[] = [];
    for (const d of depths) {
      const group = members
        .filter((m) => m.node.ring === d)
        .sort((m1, m2) => parentOrder(m1, angleIndex) - parentOrder(m2, angleIndex));
      group.forEach((m) => {
        angleIndex.set(m.node.id, ordered.length);
        ordered.push(m);
      });
    }

    ordered.forEach((mn, i) => {
      const cell = cells[Math.min(i, cells.length - 1)];
      const { x, y } = axialToXY(cell.q, cell.r);
      maxR = Math.max(maxR, Math.hypot(x, y));
      pos.set(mn.node.id, { mn, x, y, hex, q: cell.q, r: cell.r });
    });
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
      // Touching cells already read as connected — drawing a line would be noise.
      if (axialDistance(p, q) <= 1) continue;
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

/** Mean placement index of a node's already-ordered parents (crossing reduction). */
function parentOrder(mn: MapNode, angleIndex: Map<string, number>): number {
  const seen = mn.node.prereqs.map((p) => angleIndex.get(p)).filter((v): v is number => v !== undefined);
  if (!seen.length) return Number.MAX_SAFE_INTEGER; // unparented -> after the chained ones
  return seen.reduce((s, v) => s + v, 0) / seen.length;
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
  onGoalPath,
  isGoal,
}: {
  p: Placed;
  showLabel: boolean;
  fontSize: number;
  strokeWorld: number;
  onTap: () => void;
  onGoalPath: boolean;
  isGoal: boolean;
}) {
  const { status } = p.mn;
  const { isStunt } = p.mn.node;
  const r = HEX_R - HEX_INSET;
  const locked = status === "locked";
  const achieved = status === "achieved";
  const inProgress = status === "in-progress";
  const lines = labelLines(p.mn.node.name);
  // Text sits on the fill when achieved, so flip to the dark ink for contrast.
  const textFill = achieved
    ? "var(--color-surface-0)"
    : locked
      ? "var(--color-ink-3)"
      : "var(--color-ink-1)";

  return (
    <g
      opacity={locked ? 0.5 : 1}
      role="button"
      aria-label={`${p.mn.node.name} — ${status}`}
      onPointerUp={onTap}
      style={{ cursor: "pointer" }}
    >
      {/* hit target: the whole cell */}
      <circle cx={p.x} cy={p.y} r={r} fill="transparent" />
      <path
        d={hexPath(p.x, p.y, r)}
        fill={
          achieved
            ? p.hex
            : inProgress
              ? `color-mix(in oklab, ${p.hex} 34%, var(--color-surface-1))`
              : `color-mix(in oklab, ${p.hex} 9%, var(--color-surface-1))`
        }
        stroke={p.hex}
        strokeWidth={Math.min(strokeWorld, 4) * (isStunt ? 1.7 : 1)}
        strokeOpacity={locked ? 0.55 : 1}
      />
      {inProgress && (
        <path d={hexPath(p.x, p.y, r)} fill="none" stroke={p.hex} strokeWidth={strokeWorld * 0.5} opacity="0.5" />
      )}
      {/* Goal route: a gold outline that survives overview zoom — the point is seeing
          the whole path across the map. The goal itself gets a second, outer ring. */}
      {onGoalPath && (
        <path
          d={hexPath(p.x, p.y, r + 3)}
          fill="none"
          stroke={GOAL_COLOR}
          strokeWidth={strokeWorld * (isGoal ? 1.2 : 0.8)}
          opacity={0.95}
        />
      )}
      {isGoal && (
        <path
          d={hexPath(p.x, p.y, r + 3 + strokeWorld * 2)}
          fill="none"
          stroke={GOAL_COLOR}
          strokeWidth={strokeWorld * 0.6}
          opacity={0.6}
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
      {showLabel &&
        lines.map((line, li) => (
          <text
            key={li}
            x={p.x}
            // vertically centre the block, leaving room for the status glyph below
            y={p.y - (lines.length - 1) * (fontSize * 0.6) + li * (fontSize + 1.5) - 3}
            textAnchor="middle"
            fontSize={fontSize}
            fill={textFill}
            fontWeight={isStunt ? 700 : 500}
          >
            {line}
          </text>
        ))}
      {achieved && (
        <path
          d={`M${p.x - 7},${p.y + fontSize * 1.9} l4.5,5 l9,-11`}
          fill="none"
          stroke="var(--color-surface-0)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {isStunt && !achieved && showLabel && (
        <text
          x={p.x}
          y={p.y + fontSize * 2.3}
          textAnchor="middle"
          fontSize={fontSize * 0.85}
          fill={p.hex}
          fontWeight="700"
        >
          ★
        </text>
      )}
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
  // A hexagon narrows away from its centre line, so the budget is tighter than the
  // full flat-to-flat width would suggest.
  const MAX = 12;
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
