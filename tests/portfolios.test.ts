import { describe, expect, it } from 'vitest';
import { PORTFOLIOS, PORTFOLIO_BY_NAME, portfolioColour, portfolioShort } from '../src/data/portfolios';
import { GLOSSARY } from '../src/data/glossary';
import { MINISTERS } from '../src/data/ministers';
import { locate, STATE_CAPITALS, SUBURB_COORDS } from '../src/utils/locations';

describe('Portfolio metadata', () => {
  it('has 17 portfolios', () => {
    expect(PORTFOLIOS.length).toBe(17);
  });
  it('every portfolio has a hex colour', () => {
    PORTFOLIOS.forEach((p) => {
      expect(p.colour).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
  it('every portfolio has a non-empty description', () => {
    PORTFOLIOS.forEach((p) => {
      expect(p.description.length).toBeGreaterThan(20);
    });
  });
  it('portfolio names are unique', () => {
    const names = new Set(PORTFOLIOS.map((p) => p.name));
    expect(names.size).toBe(PORTFOLIOS.length);
  });
  it('portfolio codes are unique', () => {
    const codes = new Set(PORTFOLIOS.map((p) => p.code));
    expect(codes.size).toBe(PORTFOLIOS.length);
  });
  it('PORTFOLIO_BY_NAME map is consistent', () => {
    expect(PORTFOLIO_BY_NAME.size).toBe(PORTFOLIOS.length);
    expect(PORTFOLIO_BY_NAME.get('Treasury')?.code).toBe('TRY');
  });
  it('portfolioColour falls back to neutral grey for unknown', () => {
    expect(portfolioColour('Department of Atlantis')).toBe('#777');
  });
  it('portfolioShort returns the short name', () => {
    expect(portfolioShort('Treasury')).toBe('Treasury');
    expect(portfolioShort('Prime Minister and Cabinet')).toBe('PM&C');
  });
});

describe('Glossary', () => {
  it('has at least 10 entries', () => {
    expect(Object.keys(GLOSSARY).length).toBeGreaterThanOrEqual(10);
  });
  it('every entry has term and definition', () => {
    Object.values(GLOSSARY).forEach((entry) => {
      expect(entry.term.length).toBeGreaterThan(0);
      expect(entry.definition.length).toBeGreaterThan(20);
    });
  });
});

describe('Ministers', () => {
  it('has at least 20 cabinet ministers', () => {
    const cabinet = MINISTERS.filter((m) => m.cabinet);
    expect(cabinet.length).toBeGreaterThanOrEqual(20);
  });
  it('every minister is assigned to a known portfolio', () => {
    const portfolioNames = new Set(PORTFOLIOS.map((p) => p.name));
    MINISTERS.forEach((m) => {
      expect(portfolioNames.has(m.portfolio)).toBe(true);
    });
  });
  it('Prime Minister is in the list', () => {
    const pm = MINISTERS.find((m) => m.title === 'Prime Minister');
    expect(pm?.name).toBe('Anthony Albanese');
  });
});

describe('locate', () => {
  it('finds known Canberra suburbs', () => {
    const r = locate('Barton', 'ACT');
    expect(r?.[0]).toBeCloseTo(-35.3, 0);
  });
  it('falls back to state capital', () => {
    const r = locate('Some Tiny Suburb', 'WA');
    expect(r).toEqual(STATE_CAPITALS.WA);
  });
  it('returns null for unknown state', () => {
    const r = locate(null, null);
    expect(r).toBeNull();
  });
  it('has all 8 state capitals', () => {
    expect(Object.keys(STATE_CAPITALS).sort()).toEqual(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
  });
  it('contains Canberra suburb coordinates', () => {
    expect(SUBURB_COORDS.Barton).toBeDefined();
    expect(SUBURB_COORDS.Phillip).toBeDefined();
  });
});
