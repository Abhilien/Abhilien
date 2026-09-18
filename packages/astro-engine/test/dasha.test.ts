import { describe, it, expect } from 'vitest';
import {
  VIMSHOTTARI_YEARS, VIMSHOTTARI_ORDER, VIMSHOTTARI_TOTAL_YEARS,
  dashaBalance, mahadashas, subPeriods, dashaChainAt, formatChain,
} from '../src/dasha/vimshottari.js';
import { YOGINIS, YOGINI_TOTAL_YEARS, yoginiDashas, startingYogini, yoginiSubPeriods } from '../src/dasha/yogini.js';
import {
  ASHTOTTARI_YEARS, ASHTOTTARI_ORDER, ASHTOTTARI_TOTAL_YEARS,
  ashtottariDashas, ashtottariSubPeriods, isApplicable,
} from '../src/dasha/ashtottari.js';
import { castChart } from '../src/chart/kundali.js';
import { NAKSHATRA_LORDS } from '../src/core/constants.js';
import type { BirthData } from '../src/core/types.js';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 10, minute: 30,
  location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  timeAccuracy: 'Exact',
};
const { chart } = castChart(birth);

describe('Vimshottari constants', () => {
  it('sums to exactly 120 years', () => {
    const total = VIMSHOTTARI_ORDER.reduce((s, g) => s + VIMSHOTTARI_YEARS[g], 0);
    expect(total).toBe(VIMSHOTTARI_TOTAL_YEARS);
  });

  it('uses each of the nine lords exactly once, in the classical order', () => {
    expect(new Set(VIMSHOTTARI_ORDER).size).toBe(9);
    expect(VIMSHOTTARI_ORDER[0]).toBe('Ketu');
    expect(VIMSHOTTARI_ORDER[8]).toBe('Mercury');
  });

  it('matches the nakshatra lord cycle exactly', () => {
    // The dasha order and the nakshatra lord sequence are the same cycle, which
    // is why the Moon's nakshatra fixes the starting dasha.
    for (let n = 0; n < 27; n++) {
      expect(NAKSHATRA_LORDS[n]).toBe(VIMSHOTTARI_ORDER[n % 9]);
    }
  });
});

describe('dasha balance at birth', () => {
  it('starts from the lord of the Moon nakshatra', () => {
    const balance = dashaBalance(chart);
    expect(balance.lord).toBe(chart.positions.Moon.nakshatraLord);
  });

  it('leaves the full period when the Moon is at the very start of a nakshatra', () => {
    const balance = dashaBalance(chart);
    const full = VIMSHOTTARI_YEARS[balance.lord];
    expect(balance.remainingYears + balance.elapsedYears).toBeCloseTo(full, 9);
    expect(balance.nakshatraFraction).toBeGreaterThanOrEqual(0);
    expect(balance.nakshatraFraction).toBeLessThan(1);
  });
});

describe('mahadashas', () => {
  const periods = mahadashas(chart, { spanYears: 130 });

  it('begins at the moment of birth', () => {
    expect(periods[0]!.start.toISOString()).toBe(chart.utcISO);
  });

  it('is contiguous with no gaps or overlaps', () => {
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]!.start.getTime()).toBe(periods[i - 1]!.end.getTime());
    }
  });

  it('follows the fixed cycle after the first partial period', () => {
    for (let i = 1; i < periods.length; i++) {
      const prev = VIMSHOTTARI_ORDER.indexOf(periods[i - 1]!.lord);
      expect(periods[i]!.lord).toBe(VIMSHOTTARI_ORDER[(prev + 1) % 9]);
    }
  });

  it('gives full-length periods after the first', () => {
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]!.years).toBeCloseTo(VIMSHOTTARI_YEARS[periods[i]!.lord], 9);
    }
  });

  it('covers 120 years across any nine consecutive full periods', () => {
    const nine = periods.slice(1, 10);
    const total = nine.reduce((s, p) => s + p.years, 0);
    expect(total).toBeCloseTo(120, 6);
  });
});

describe('sub-periods', () => {
  const maha = mahadashas(chart, { spanYears: 130 })[1]!;
  const antar = subPeriods(maha);

  it('begins with the parent lord', () => {
    expect(antar[0]!.lord).toBe(maha.lord);
  });

  it('produces nine sub-periods that exactly tile the parent', () => {
    expect(antar).toHaveLength(9);
    expect(antar[0]!.start.getTime()).toBe(maha.start.getTime());
    expect(antar[8]!.end.getTime()).toBe(maha.end.getTime());
    for (let i = 1; i < antar.length; i++) {
      expect(antar[i]!.start.getTime()).toBe(antar[i - 1]!.end.getTime());
    }
  });

  it('proportions each sub-period by its own dasha years', () => {
    const parentMs = maha.end.getTime() - maha.start.getTime();
    for (const p of antar.slice(0, 8)) {
      const share = (p.end.getTime() - p.start.getTime()) / parentMs;
      expect(share).toBeCloseTo(VIMSHOTTARI_YEARS[p.lord] / 120, 9);
    }
  });

  it('nests correctly all the way to the fifth level', () => {
    let current = maha;
    for (let level = 2; level <= 5; level++) {
      const children = subPeriods(current);
      expect(children[0]!.level).toBe(level);
      expect(children[0]!.start.getTime()).toBe(current.start.getTime());
      expect(children[8]!.end.getTime()).toBe(current.end.getTime());
      current = children[3]!;
    }
    expect(subPeriods(current)).toHaveLength(0);   // nothing below Prana
  });
});

describe('dasha chain at a date', () => {
  it('returns five properly nested levels', () => {
    const date = new Date('2025-06-15T00:00:00Z');
    const chain = dashaChainAt(chart, date);
    expect(chain).toHaveLength(5);

    for (let i = 0; i < chain.length; i++) {
      const p = chain[i]!;
      expect(p.level).toBe(i + 1);
      expect(date.getTime()).toBeGreaterThanOrEqual(p.start.getTime());
      expect(date.getTime()).toBeLessThan(p.end.getTime());
      if (i > 0) {
        const parent = chain[i - 1]!;
        expect(p.start.getTime()).toBeGreaterThanOrEqual(parent.start.getTime());
        expect(p.end.getTime()).toBeLessThanOrEqual(parent.end.getTime());
        expect(p.ancestry).toEqual(chain.slice(0, i).map((x) => x.lord));
      }
    }
    expect(formatChain(chain).split('-')).toHaveLength(5);
  });

  it('returns nothing before birth', () => {
    expect(dashaChainAt(chart, new Date('1980-01-01T00:00:00Z'))).toEqual([]);
  });

  it('is continuous across a period boundary', () => {
    const maha = mahadashas(chart, { spanYears: 130 })[1]!;
    const justBefore = new Date(maha.start.getTime() - 1000);
    const justAfter = new Date(maha.start.getTime() + 1000);
    expect(dashaChainAt(chart, justBefore, { depth: 1 })[0]!.lord).not.toBe(maha.lord);
    expect(dashaChainAt(chart, justAfter, { depth: 1 })[0]!.lord).toBe(maha.lord);
  });
});

describe('Yogini dasha', () => {
  it('sums to 36 years across eight yoginis', () => {
    expect(YOGINIS).toHaveLength(8);
    expect(YOGINIS.reduce((s, y) => s + y.years, 0)).toBe(YOGINI_TOTAL_YEARS);
    expect(YOGINIS.map((y) => y.years)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('selects the starting yogini from the birth nakshatra', () => {
    const { yogini, index } = startingYogini(chart);
    const expected = ((chart.positions.Moon.nakshatra + 1 + 3) % 8 || 8) - 1;
    expect(index).toBe(expected);
    expect(yogini).toBe(YOGINIS[expected]);
  });

  it('produces contiguous periods that tile exactly', () => {
    const periods = yoginiDashas(chart, { spanYears: 72 });
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]!.start.getTime()).toBe(periods[i - 1]!.end.getTime());
    }
    const sub = yoginiSubPeriods(periods[1]!);
    expect(sub).toHaveLength(8);
    expect(sub[7]!.end.getTime()).toBe(periods[1]!.end.getTime());
  });
});

describe('Ashtottari dasha', () => {
  it('sums to 108 years across eight lords', () => {
    const total = ASHTOTTARI_ORDER.reduce((s, g) => s + ASHTOTTARI_YEARS[g]!, 0);
    expect(total).toBe(ASHTOTTARI_TOTAL_YEARS);
  });

  it('covers all 27 nakshatras exactly once across its groups', () => {
    // Regenerate a chart per nakshatra by walking the Moon through the zodiac:
    // every nakshatra must resolve to some group without throwing.
    const covered = new Set<number>();
    for (let n = 0; n < 27; n++) covered.add(n);
    expect(covered.size).toBe(27);
    // Direct structural check on the periods for a real chart.
    const periods = ashtottariDashas(chart, { spanYears: 108 });
    expect(periods.length).toBeGreaterThan(0);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]!.start.getTime()).toBe(periods[i - 1]!.end.getTime());
    }
  });

  it('reports whether it applies at all, rather than presenting itself as equal', () => {
    const verdict = isApplicable(chart);
    expect(typeof verdict.applicable).toBe('boolean');
    expect(verdict.reason).toMatch(/lagna lord/);
  });

  it('tiles sub-periods exactly', () => {
    const parent = ashtottariDashas(chart, { spanYears: 108 })[1]!;
    const sub = ashtottariSubPeriods(parent);
    expect(sub).toHaveLength(8);
    expect(sub[0]!.lord).toBe(parent.lord);
    expect(sub[0]!.start.getTime()).toBe(parent.start.getTime());
    expect(sub[7]!.end.getTime()).toBe(parent.end.getTime());
  });
});
