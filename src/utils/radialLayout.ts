// Deterministic radial hub-and-spoke layout. Pure trigonometry — settles
// instantly, no simulation. Portfolios occupy angular wedges around a circle;
// within each wedge, nodes sit on concentric bands by hierarchy depth:
//   band 0 = Department of State (the hub), band 1 = its direct children,
//   band 2 = remaining bodies. When a single portfolio is isolated, its wedge
//   expands to the full circle and the department moves to the centre (an
//   ego-network). Inspired by the au-relations embassy network.

export interface RadialNode {
  portfolio: string;
  band: 0 | 1 | 2;
  /** node radius in px, for spacing */
  r: number;
}

export interface RadialOptions {
  width: number;
  height: number;
  /** portfolios in wedge order */
  portfolios: string[];
  /** node count per portfolio, for proportional wedge sizing */
  counts: Record<string, number>;
  /** when set, that portfolio spans the whole circle (ego view) */
  singlePortfolio?: string | null;
}

export interface RadialResult {
  positions: Array<{ x: number; y: number }>;
  cx: number;
  cy: number;
  /** furthest node distance from centre (for viewBox fitting) */
  maxR: number;
}

const TWO_PI = Math.PI * 2;

export function radialLayout(nodes: RadialNode[], opts: RadialOptions): RadialResult {
  const { width, height, counts } = opts;
  const cx = width / 2;
  const cy = height / 2;
  const positions = new Array<{ x: number; y: number }>(nodes.length);
  if (nodes.length === 0) return { positions, cx, cy, maxR: 0 };

  const margin = 46; // room for labels near the rim
  const R = Math.max(40, Math.min(width, height) / 2 - margin);
  const single = !!opts.singlePortfolio;

  // Band base radii + the gap between overflow sub-rings. In the all-portfolios
  // view the department hubs sit on a generous ring (room for their labels)
  // with children and other bodies fanning outward.
  const bandR = single ? [0, 0.4 * R, 0.72 * R] : [0.48 * R, 0.66 * R, 0.84 * R];
  const ringGap = Math.max(16, 0.09 * R);

  // Angular wedge per portfolio (∝ node count, with a floor), gaps between.
  const portfolios = opts.portfolios.filter((p) => (counts[p] || 0) > 0);
  const gap = single ? 0 : Math.min(0.06, 0.5 / Math.max(1, portfolios.length)); // radians between wedges
  const usable = single ? TWO_PI : TWO_PI - gap * portfolios.length;
  const minWedge = single ? TWO_PI : 0.12;

  // Wedge widths ∝ sqrt(count) — softens the disparity between a 256-body
  // portfolio and a 32-body one so department hubs spread evenly around the
  // ring (proportional-to-count bunches the big ones together). Overflow to
  // sub-rings (below) absorbs the extra bodies of large portfolios.
  const sqrtTotal = portfolios.reduce((s, p) => s + Math.sqrt(counts[p] || 0), 0) || 1;
  const raw = portfolios.map((p) => Math.max(minWedge, (Math.sqrt(counts[p] || 0) / sqrtTotal) * usable));
  const rawSum = raw.reduce((a, b) => a + b, 0) || 1;
  const wedgeWidth: Record<string, number> = {};
  const wedgeStart: Record<string, number> = {};
  let cursor = -Math.PI / 2; // start at 12 o'clock
  portfolios.forEach((p, i) => {
    const w = single ? TWO_PI : (raw[i] / rawSum) * usable;
    wedgeStart[p] = cursor;
    wedgeWidth[p] = w;
    cursor += w + (single ? 0 : gap);
  });

  // Group node indices by (portfolio, band), preserving input order.
  const groups = new Map<string, number[]>();
  nodes.forEach((n, i) => {
    const key = `${n.portfolio}|${n.band}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  });

  let maxR = 0;
  for (const [key, idxs] of groups) {
    const [portfolio, bandStr] = key.split('|');
    const band = Number(bandStr) as 0 | 1 | 2;
    const wStart = wedgeStart[portfolio] ?? -Math.PI / 2;
    const wWidth = wedgeWidth[portfolio] ?? TWO_PI;
    const baseR = bandR[band];
    const minArc = 12 + 2 * (nodes[idxs[0]]?.r ?? 4); // spacing between neighbours

    // Department hub(s): centre of the wedge (or the exact centre in ego view).
    if (band === 0) {
      const pad = wWidth * 0.5;
      idxs.forEach((idx, j) => {
        if (single && baseR === 0) {
          positions[idx] = { x: cx, y: cy };
        } else {
          const a = wStart + (idxs.length === 1 ? pad : ((j + 0.5) / idxs.length) * wWidth);
          positions[idx] = { x: cx + baseR * Math.cos(a), y: cy + baseR * Math.sin(a) };
          maxR = Math.max(maxR, baseR);
        }
      });
      continue;
    }

    // Bands 1 & 2 spread across the wedge, overflowing to sub-rings when full.
    const fullCircle = wWidth >= TWO_PI - 1e-6;
    const innerPad = fullCircle ? 0 : Math.min(wWidth * 0.12, 0.08);
    const spanStart = wStart + innerPad;
    const span = wWidth - innerPad * 2;

    let placed = 0;
    let ring = 0;
    while (placed < idxs.length) {
      const r = baseR + ring * ringGap;
      const cap = Math.max(1, Math.floor((span * r) / minArc));
      const take = Math.min(cap, idxs.length - placed);
      for (let j = 0; j < take; j++) {
        const t = fullCircle
          ? j / take // wrap seamlessly around a full circle
          : take === 1
            ? 0.5
            : (j + 0.5) / take;
        const a = spanStart + t * span;
        const idx = idxs[placed];
        positions[idx] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
        maxR = Math.max(maxR, r);
        placed++;
      }
      ring++;
    }
  }

  // Safety: any node we somehow missed lands at the centre rather than NaN.
  for (let i = 0; i < nodes.length; i++) {
    if (!positions[i]) positions[i] = { x: cx, y: cy };
  }

  return { positions, cx, cy, maxR };
}
