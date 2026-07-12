import { describe, expect, it } from 'vitest';
import { squarify, type Rect } from '../src/utils/squarify';
import { computeCells } from '../src/views/treemap';
import { mulberry32 } from '../src/utils/forceLayout';
import type { Entity } from '../src/types';

// Layout tests must assert POSITIONS, not just areas: an implementation that
// stacks every cell at the same origin conserves area perfectly and still
// renders as garbage. These suites are the regression guard for that.

const EPS = 1e-6;

interface Box { x: number; y: number; w: number; h: number }

function overlapArea(a: Box, b: Box): number {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox * oy;
}

function assertLayout(rects: Rect[], values: number[], W: number, H: number): void {
  const total = values.reduce((a, b) => a + b, 0);
  for (const r of rects) {
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
    expect(Number.isFinite(r.w)).toBe(true);
    expect(Number.isFinite(r.h)).toBe(true);
    expect(r.w).toBeGreaterThanOrEqual(0);
    expect(r.h).toBeGreaterThanOrEqual(0);
    // within bounds
    expect(r.x).toBeGreaterThanOrEqual(-EPS);
    expect(r.y).toBeGreaterThanOrEqual(-EPS);
    expect(r.x + r.w).toBeLessThanOrEqual(W + EPS * W);
    expect(r.y + r.h).toBeLessThanOrEqual(H + EPS * H);
  }
  // no pairwise overlap
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      expect(overlapArea(rects[i], rects[j])).toBeLessThan(0.5);
    }
  }
  // area conservation + proportionality
  const sumArea = rects.reduce((s, r) => s + r.w * r.h, 0);
  expect(Math.abs(sumArea - W * H)).toBeLessThan(W * H * 1e-6);
  rects.forEach((r, i) => {
    const expected = (values[i] / total) * W * H;
    expect(Math.abs(r.w * r.h - expected)).toBeLessThan(Math.max(1e-6, expected * 1e-6));
  });
}

describe('squarify — positional correctness', () => {
  const boxes: Array<[number, number]> = [
    [1000, 560],
    [200, 900],
    [500, 500],
  ];
  const valueSets: number[][] = [
    [5, 3, 2, 1],
    [100],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    (() => {
      const rand = mulberry32(7);
      return Array.from({ length: 50 }, () => 1 + Math.floor(rand() * 200));
    })(),
  ];

  for (const [W, H] of boxes) {
    for (const values of valueSets) {
      it(`tiles ${values.length} values into ${W}×${H} with no overlap, in bounds, areas conserved`, () => {
        const rects = squarify(values, W, H);
        expect(rects).toHaveLength(values.length);
        assertLayout(rects, values, W, H);
      });
    }
  }

  it('maps rects to input order via index', () => {
    const rects = squarify([5, 1, 3], 300, 200);
    rects.forEach((r, i) => expect(r.index).toBe(i));
    // largest value gets largest area regardless of position in input
    expect(rects[0].w * rects[0].h).toBeGreaterThan(rects[1].w * rects[1].h);
  });

  it('handles empty input', () => {
    expect(squarify([], 100, 100)).toEqual([]);
  });

  it('single value fills the whole box', () => {
    const [r] = squarify([42], 100, 80);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.w * r.h).toBeCloseTo(100 * 80, 6);
  });

  it('zero total produces zero-area rects without NaN', () => {
    const rects = squarify([0, 0, 0], 100, 100);
    expect(rects).toHaveLength(3);
    for (const r of rects) {
      expect(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h)).toBe(true);
      expect(r.w * r.h).toBe(0);
    }
  });
});

describe('computeCells — two-level portfolio→entity layout', () => {
  let seq = 0;
  const ent = (portfolio: string, materiality: string | null = null): Entity =>
    ({ id: `e${++seq}`, title: `Entity ${seq}`, portfolio, materiality }) as unknown as Entity;

  const entities: Entity[] = [
    ent('Alpha', 'Material'), ent('Alpha', 'Material'),
    ent('Alpha', 'Small'), ent('Alpha', 'Small'), ent('Alpha', 'Small'),
    ent('Alpha'), ent('Alpha'), ent('Alpha'), ent('Alpha'), ent('Alpha'),
    ent('Beta'), ent('Beta', 'Material'),
    ent('Gamma'),
  ];

  it('portfolio blocks tile the canvas without overlap', () => {
    const { cells } = computeCells(entities, 'weighted', 1000, 560);
    const blocks = cells.filter((c) => !c.entity);
    expect(blocks).toHaveLength(3);
    const sumArea = blocks.reduce((s, b) => s + b.w * b.h, 0);
    expect(Math.abs(sumArea - 1000 * 560)).toBeLessThan(1000 * 560 * 1e-6);
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        expect(overlapArea(blocks[i], blocks[j])).toBeLessThan(0.5);
      }
    }
  });

  it('entity cells stay inside their portfolio block and never overlap siblings', () => {
    const { cells } = computeCells(entities, 'weighted', 1000, 560);
    const blocks = cells.filter((c) => !c.entity);
    for (const block of blocks) {
      const children = cells.filter((c) => c.entity && c.entity.portfolio === block.label);
      for (const ch of children) {
        expect(ch.x).toBeGreaterThanOrEqual(block.x - EPS);
        expect(ch.y).toBeGreaterThanOrEqual(block.y - EPS);
        expect(ch.x + ch.w).toBeLessThanOrEqual(block.x + block.w + EPS * 1000);
        expect(ch.y + ch.h).toBeLessThanOrEqual(block.y + block.h + EPS * 1000);
      }
      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          expect(overlapArea(children[i], children[j])).toBeLessThan(0.5);
        }
      }
    }
  });

  it('weighted mode gives Material cells ~4× the area of standard cells in the same portfolio', () => {
    const { cells } = computeCells(entities, 'weighted', 1000, 560);
    const alpha = cells.filter((c) => c.entity && c.entity.portfolio === 'Alpha');
    const material = alpha.find((c) => c.entity!.materiality === 'Material')!;
    const standard = alpha.find((c) => !c.entity!.materiality)!;
    const ratio = (material.w * material.h) / (standard.w * standard.h);
    expect(ratio).toBeGreaterThan(3.9);
    expect(ratio).toBeLessThan(4.1);
  });

  it('count mode weights every entity equally', () => {
    const { cells } = computeCells(entities, 'count', 1000, 560);
    const alpha = cells.filter((c) => c.entity && c.entity.portfolio === 'Alpha');
    const areas = alpha.map((c) => c.w * c.h);
    const min = Math.min(...areas);
    const max = Math.max(...areas);
    expect(max - min).toBeLessThan(Math.max(1e-6, max * 1e-6));
  });

  it('returns nothing for an empty entity list', () => {
    const { cells, total } = computeCells([], 'weighted', 1000, 560);
    expect(cells).toEqual([]);
    expect(total).toBe(0);
  });
});
