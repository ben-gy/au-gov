import { describe, expect, it } from 'vitest';
import { squarify } from '../src/views/treemap';

describe('squarify', () => {
  it('returns empty for empty input', () => {
    expect(squarify([], 0, 0, 100, 100)).toEqual([]);
  });
  it('places a single item to cover the box', () => {
    const out = squarify([{ value: 1, ref: 'a' }], 0, 0, 100, 80);
    expect(out).toHaveLength(1);
    expect(Math.round(out[0].w * out[0].h)).toBe(100 * 80);
  });
  it('sums of cell areas equal the box area', () => {
    const items = [
      { value: 5, ref: 'a' },
      { value: 3, ref: 'b' },
      { value: 2, ref: 'c' },
      { value: 1, ref: 'd' },
    ];
    const out = squarify(items, 0, 0, 200, 100);
    const totalArea = out.reduce((s, p) => s + p.w * p.h, 0);
    expect(Math.round(totalArea)).toBe(200 * 100);
  });
  it('preserves relative size order', () => {
    const items = [
      { value: 4, ref: 'big' },
      { value: 2, ref: 'medium' },
      { value: 1, ref: 'small' },
    ];
    const out = squarify(items, 0, 0, 300, 200);
    const big = out.find((p) => p.item.ref === 'big')!;
    const small = out.find((p) => p.item.ref === 'small')!;
    expect(big.w * big.h).toBeGreaterThan(small.w * small.h);
  });
  it('handles zero total gracefully', () => {
    const out = squarify([{ value: 0, ref: 'x' }], 0, 0, 100, 100);
    expect(out).toEqual([]);
  });
});
