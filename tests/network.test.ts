import { describe, expect, it } from 'vitest';
import { forceLayout, mulberry32, type SimNode, type SimLink } from '../src/utils/forceLayout';
import { zoomViewBox, clampViewBox, type ViewBox } from '../src/utils/svgZoom';
import { radialLayout, type RadialNode } from '../src/utils/radialLayout';

const W = 1200;
const H = 640;

function makeGraph(n: number, seed: number): { nodes: SimNode[]; links: SimLink[] } {
  const rand = mulberry32(seed);
  const nodes: SimNode[] = Array.from({ length: n }, () => ({
    x: W / 2 + (rand() - 0.5) * W * 0.8,
    y: H / 2 + (rand() - 0.5) * H * 0.8,
    r: 4,
  }));
  // Hub-and-spoke clusters of ~20 plus a chain between hubs — shaped like the
  // real parent-org graph.
  const links: SimLink[] = [];
  for (let i = 0; i < n; i++) {
    const hub = Math.floor(i / 20) * 20;
    if (i !== hub) links.push({ source: i, target: hub });
    else if (hub > 0) links.push({ source: hub, target: hub - 20 });
  }
  return { nodes, links };
}

describe('forceLayout', () => {
  it('settles a 300-node graph: finite, in-bounds, converged', () => {
    const { nodes, links } = makeGraph(300, 1);
    const result = forceLayout(nodes, links, { width: W, height: H });
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(n.x).toBeGreaterThanOrEqual(n.r);
      expect(n.x).toBeLessThanOrEqual(W - n.r);
      expect(n.y).toBeGreaterThanOrEqual(n.r);
      expect(n.y).toBeLessThanOrEqual(H - n.r);
    }
    // Settled: the last iteration barely moved anything. This is the guard
    // against layouts that are still visibly "dancing" when rendered.
    expect(result.maxDelta).toBeLessThan(0.5);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('is deterministic for the same seeded input', () => {
    const a = makeGraph(150, 42);
    const b = makeGraph(150, 42);
    forceLayout(a.nodes, a.links, { width: W, height: H });
    forceLayout(b.nodes, b.links, { width: W, height: H });
    a.nodes.forEach((n, i) => {
      expect(n.x).toBe(b.nodes[i].x);
      expect(n.y).toBe(b.nodes[i].y);
    });
  });

  it('produces different layouts for different seeds', () => {
    const a = makeGraph(150, 1);
    const b = makeGraph(150, 2);
    forceLayout(a.nodes, a.links, { width: W, height: H });
    forceLayout(b.nodes, b.links, { width: W, height: H });
    const anyDifferent = a.nodes.some((n, i) => n.x !== b.nodes[i].x || n.y !== b.nodes[i].y);
    expect(anyDifferent).toBe(true);
  });

  it('handles the full-scale graph (1,381 nodes / 779 links) within budget', () => {
    const { nodes, links } = makeGraph(1381, 3);
    const result = forceLayout(nodes, links.slice(0, 779), { width: W, height: H });
    expect(result.elapsedMs).toBeLessThan(3000);
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('separates coincident nodes without NaN', () => {
    const nodes: SimNode[] = [
      { x: 100, y: 100, r: 4 },
      { x: 100, y: 100, r: 4 },
    ];
    forceLayout(nodes, [], { width: W, height: H });
    expect(Number.isFinite(nodes[0].x)).toBe(true);
    expect(Number.isFinite(nodes[1].x)).toBe(true);
    const dist = Math.hypot(nodes[0].x - nodes[1].x, nodes[0].y - nodes[1].y);
    expect(dist).toBeGreaterThan(1);
  });

  it('returns immediately for an empty graph', () => {
    const result = forceLayout([], [], { width: W, height: H });
    expect(result.iterations).toBe(0);
  });
});

describe('zoomViewBox', () => {
  const base: ViewBox = { x: 0, y: 0, w: 1000, h: 600 };

  it('zooming about the centre preserves the centre', () => {
    const vb = zoomViewBox(base, base, 2, 500, 300);
    expect(vb.w).toBeCloseTo(500);
    expect(vb.h).toBeCloseTo(300);
    expect(vb.x + vb.w / 2).toBeCloseTo(500);
    expect(vb.y + vb.h / 2).toBeCloseTo(300);
  });

  it('never zooms out past the base view (minScale 1)', () => {
    const vb = zoomViewBox(base, base, 0.5, 500, 300);
    expect(vb).toEqual(base);
  });

  it('clamps zoom-in at maxScale', () => {
    let vb: ViewBox = { ...base };
    for (let i = 0; i < 30; i++) vb = zoomViewBox(vb, base, 2, vb.x + vb.w / 2, vb.y + vb.h / 2);
    expect(vb.w).toBeCloseTo(base.w / 8);
    expect(vb.h).toBeCloseTo(base.h / 8);
  });

  it('zoom in then equal zoom out returns to base', () => {
    const zoomed = zoomViewBox(base, base, 2, 200, 100);
    const back = zoomViewBox(zoomed, base, 0.5, 200, 100);
    expect(back.w).toBeCloseTo(base.w);
    expect(back.h).toBeCloseTo(base.h);
    expect(back.x).toBeCloseTo(base.x);
    expect(back.y).toBeCloseTo(base.y);
  });

  it('keeps the viewBox inside the base when zooming near an edge', () => {
    const vb = zoomViewBox(base, base, 4, 990, 590);
    expect(vb.x).toBeGreaterThanOrEqual(base.x);
    expect(vb.y).toBeGreaterThanOrEqual(base.y);
    expect(vb.x + vb.w).toBeLessThanOrEqual(base.x + base.w + 1e-9);
    expect(vb.y + vb.h).toBeLessThanOrEqual(base.y + base.h + 1e-9);
  });

  it('clampViewBox pins a panned box back inside the base', () => {
    const vb = clampViewBox({ x: -50, y: 550, w: 500, h: 300 }, base);
    expect(vb.x).toBe(0);
    expect(vb.y).toBe(300);
  });
});

describe('radialLayout', () => {
  const PORTFOLIOS = ['Alpha', 'Beta', 'Gamma'];
  // Each portfolio: 1 dept (band 0), 4 direct children (band 1), 8 others (band 2).
  function makeNodes(): RadialNode[] {
    const nodes: RadialNode[] = [];
    for (const p of PORTFOLIOS) {
      nodes.push({ portfolio: p, band: 0, r: 9 });
      for (let i = 0; i < 4; i++) nodes.push({ portfolio: p, band: 1, r: 6 });
      for (let i = 0; i < 8; i++) nodes.push({ portfolio: p, band: 2, r: 4 });
    }
    return nodes;
  }
  const counts: Record<string, number> = { Alpha: 13, Beta: 13, Gamma: 13 };
  const opts = { width: W, height: H, portfolios: PORTFOLIOS, counts };

  it('places every node within the circle bounds, no NaN', () => {
    const nodes = makeNodes();
    const { positions, cx, cy, maxR } = radialLayout(nodes, opts);
    expect(positions).toHaveLength(nodes.length);
    for (const pos of positions) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
      const d = Math.hypot(pos.x - cx, pos.y - cy);
      expect(d).toBeLessThanOrEqual(maxR + 1e-6);
    }
  });

  it('bands are radially ordered: dept innermost, others outermost', () => {
    const nodes = makeNodes();
    const { positions, cx, cy } = radialLayout(nodes, opts);
    const distByBand: Record<number, number[]> = { 0: [], 1: [], 2: [] };
    nodes.forEach((n, i) => distByBand[n.band].push(Math.hypot(positions[i].x - cx, positions[i].y - cy)));
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(avg(distByBand[0])).toBeLessThan(avg(distByBand[1]));
    expect(avg(distByBand[1])).toBeLessThan(avg(distByBand[2]));
  });

  it('separates same-portfolio band-1 siblings (no coincident nodes)', () => {
    const nodes = makeNodes();
    const { positions } = radialLayout(nodes, opts);
    const alphaBand1: number[] = [];
    nodes.forEach((n, i) => { if (n.portfolio === 'Alpha' && n.band === 1) alphaBand1.push(i); });
    for (let a = 0; a < alphaBand1.length; a++) {
      for (let b = a + 1; b < alphaBand1.length; b++) {
        const pa = positions[alphaBand1[a]], pb = positions[alphaBand1[b]];
        expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeGreaterThan(6);
      }
    }
  });

  it('keeps portfolio wedges angularly disjoint (dept angles differ)', () => {
    const nodes = makeNodes();
    const { positions, cx, cy } = radialLayout(nodes, opts);
    const deptAngles = nodes
      .map((n, i) => ({ n, i }))
      .filter((x) => x.n.band === 0)
      .map((x) => Math.atan2(positions[x.i].y - cy, positions[x.i].x - cx));
    const uniq = new Set(deptAngles.map((a) => a.toFixed(3)));
    expect(uniq.size).toBe(deptAngles.length);
  });

  it('is deterministic', () => {
    const a = radialLayout(makeNodes(), opts);
    const b = radialLayout(makeNodes(), opts);
    a.positions.forEach((p, i) => {
      expect(p.x).toBe(b.positions[i].x);
      expect(p.y).toBe(b.positions[i].y);
    });
  });

  it('ego view: single portfolio puts the dept at the centre', () => {
    const nodes = makeNodes();
    const { positions, cx, cy } = radialLayout(nodes, { ...opts, singlePortfolio: 'Alpha' });
    const deptIdx = nodes.findIndex((n) => n.portfolio === 'Alpha' && n.band === 0);
    expect(positions[deptIdx].x).toBeCloseTo(cx);
    expect(positions[deptIdx].y).toBeCloseTo(cy);
  });

  it('handles an empty node list', () => {
    const res = radialLayout([], opts);
    expect(res.positions).toEqual([]);
    expect(res.maxR).toBe(0);
  });
});
