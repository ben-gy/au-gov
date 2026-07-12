import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  formatDate,
  yearOf,
  decadeOf,
  debounce,
  shorten,
  escapeHtml,
  compareBy,
  typeCode,
} from '../src/utils/format';

describe('formatNumber', () => {
  it('formats thousands with locale separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
  it('handles negative', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });
  it('supports fixed decimals', () => {
    expect(formatNumber(1.5, 2)).toBe('1.50');
  });
  it('returns em-dash for NaN', () => {
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('formatDate', () => {
  it('renders ISO date as `D Mon YYYY`', () => {
    expect(formatDate('2024-10-14')).toBe('14 Oct 2024');
  });
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });
  it('passes through unknown format unchanged', () => {
    expect(formatDate('14/10/2024')).toBe('14/10/2024');
  });
  it('handles 1 Jan 1901', () => {
    expect(formatDate('1901-01-01')).toBe('1 Jan 1901');
  });
});

describe('yearOf and decadeOf', () => {
  it('extracts year from ISO date', () => {
    expect(yearOf('1973-12-13')).toBe(1973);
  });
  it('rounds to decade', () => {
    expect(decadeOf('1973-12-13')).toBe(1970);
    expect(decadeOf('2020-01-01')).toBe(2020);
    expect(decadeOf('2029-12-31')).toBe(2020);
  });
  it('handles null', () => {
    expect(yearOf(null)).toBe(null);
    expect(decadeOf(null)).toBe(null);
  });
});

describe('shorten', () => {
  it('returns shorter text unchanged', () => {
    expect(shorten('hello', 20)).toBe('hello');
  });
  it('truncates with ellipsis', () => {
    expect(shorten('the quick brown fox jumps over the lazy dog', 10)).toBe('the quick…');
  });
  it('handles null', () => {
    expect(shorten(null)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML entities', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });
  it('handles null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  it('escapes apostrophes & ampersands', () => {
    expect(escapeHtml(`Mary & John's`)).toBe('Mary &amp; John&#39;s');
  });
});

describe('compareBy', () => {
  it('sorts ascending by default', () => {
    const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
    items.sort(compareBy((x) => x.n));
    expect(items.map((i) => i.n)).toEqual([1, 2, 3]);
  });
  it('sorts descending when asc=false', () => {
    const items = [{ n: 'b' }, { n: 'a' }];
    items.sort(compareBy((x) => x.n, false));
    expect(items.map((i) => i.n)).toEqual(['b', 'a']);
  });
});

describe('typeCode', () => {
  it('extracts the leading letter', () => {
    expect(typeCode('A. Non-corporate Commonwealth entity')).toBe('A');
    expect(typeCode('L. Joint ventures, partnerships and interests in other companies')).toBe('L');
  });
  it('returns ? for null', () => {
    expect(typeCode(null)).toBe('?');
  });
  it('returns ? for malformed', () => {
    expect(typeCode('Other')).toBe('?');
  });
});

describe('debounce', () => {
  it('coalesces rapid calls', async () => {
    let calls = 0;
    const fn = debounce(() => { calls++; }, 30);
    fn();
    fn();
    fn();
    await new Promise((r) => setTimeout(r, 60));
    expect(calls).toBe(1);
  });
});
