import { describe, it, expect } from 'vitest';
import {
  ashtakavarga, bhinnashtakavarga, BENEFIC_PLACES, BAV_SUBJECTS, CONTRIBUTORS,
  BAV_TOTALS, SAV_TOTAL, savStrength, transitBindus,
} from '../src/strength/ashtakavarga.js';
import { castChart } from '../src/chart/kundali.js';
import { makeChart, SIGN } from './helpers/synthetic.js';
import type { BirthData, RashiIndex } from '../src/core/types.js';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 10, minute: 30,
  location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  timeAccuracy: 'Exact',
};

describe('the classical tables themselves', () => {
  // These are the checks that make a mistyped digit impossible to miss. The
  // tables are fixed data, and their row sums are also fixed data.
  it('gives each graha its classical Bhinnashtakavarga total', () => {
    for (const graha of BAV_SUBJECTS) {
      const total = CONTRIBUTORS.reduce(
        (sum, c) => sum + BENEFIC_PLACES[graha][c].length, 0,
      );
      expect(total, `${graha} table`).toBe(BAV_TOTALS[graha]);
    }
  });

  it('sums to exactly 337 across all seven, as Sarvashtakavarga must', () => {
    const total = BAV_SUBJECTS.reduce((sum, g) => sum + BAV_TOTALS[g], 0);
    expect(total).toBe(SAV_TOTAL);
  });

  it('uses only valid house positions, with no duplicates in any row', () => {
    for (const graha of BAV_SUBJECTS) {
      for (const contributor of CONTRIBUTORS) {
        const places = BENEFIC_PLACES[graha][contributor];
        expect(new Set(places).size, `${graha}/${contributor} duplicates`).toBe(places.length);
        for (const p of places) {
          expect(p, `${graha}/${contributor}`).toBeGreaterThanOrEqual(1);
          expect(p, `${graha}/${contributor}`).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it('covers all eight contributors for all seven grahas', () => {
    expect(BAV_SUBJECTS).toHaveLength(7);
    expect(CONTRIBUTORS).toHaveLength(8);
    for (const graha of BAV_SUBJECTS) {
      expect(Object.keys(BENEFIC_PLACES[graha]).sort()).toEqual([...CONTRIBUTORS].sort());
    }
  });
});

describe('computed Ashtakavarga', () => {
  const { chart } = castChart(birth);
  const result = ashtakavarga(chart);

  it('reproduces each classical total in a real chart', () => {
    for (const graha of BAV_SUBJECTS) {
      expect(result.bhinna[graha].total, graha).toBe(BAV_TOTALS[graha]);
    }
  });

  it('totals 337 in the Sarvashtakavarga', () => {
    expect(result.sarvaTotal).toBe(SAV_TOTAL);
    expect(result.sarva.reduce((a, b) => a + b, 0)).toBe(SAV_TOTAL);
  });

  it('never gives a sign more than eight bindus in one Bhinnashtakavarga', () => {
    for (const graha of BAV_SUBJECTS) {
      for (const bindus of result.bhinna[graha].bySign) {
        expect(bindus, graha).toBeGreaterThanOrEqual(0);
        expect(bindus, graha).toBeLessThanOrEqual(8);
      }
    }
  });

  it('holds these invariants across many different charts', () => {
    for (let year = 1950; year <= 2020; year += 7) {
      for (const month of [2, 8]) {
        const c = castChart({ ...birth, year, month, day: 9 }).chart;
        const a = ashtakavarga(c);
        expect(a.sarvaTotal, `${year}-${month}`).toBe(SAV_TOTAL);
        for (const graha of BAV_SUBJECTS) {
          expect(a.bhinna[graha].total, `${graha} ${year}-${month}`).toBe(BAV_TOTALS[graha]);
        }
      }
    }
  });

  it('agrees between the per-sign and per-house views', () => {
    for (let house = 0; house < 12; house++) {
      const sign = (chart.lagnaRashi + house) % 12;
      expect(result.sarvaByHouse[house]).toBe(result.sarva[sign]);
      for (const graha of BAV_SUBJECTS) {
        expect(result.bhinna[graha].byHouse[house]).toBe(result.bhinna[graha].bySign[sign]);
      }
    }
  });
});

describe('bindu placement', () => {
  it('counts the first benefic place as the contributor own sign', () => {
    // Put every contributor in Mesha; Sun's own row includes place 1, so Mesha
    // must receive a bindu from the Sun itself.
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: {
        Sun: [SIGN.Mesha, 10], Moon: [SIGN.Mesha, 11], Mars: [SIGN.Mesha, 12],
        Mercury: [SIGN.Mesha, 13], Jupiter: [SIGN.Mesha, 14], Venus: [SIGN.Mesha, 15],
        Saturn: [SIGN.Mesha, 16],
      },
    });
    const bav = bhinnashtakavarga(chart, 'Sun');
    // Derive the expectation from the table rather than asserting a number, so
    // the test checks the placement rule and not a transcription of the data.
    const expected = CONTRIBUTORS.filter((c) => BENEFIC_PLACES.Sun[c].includes(1)).length;
    expect(expected).toBe(3);        // Sun, Mars and Saturn; the Lagna row starts at 3
    expect(bav.bySign[SIGN.Mesha]).toBe(expected);
    expect(bav.total).toBe(BAV_TOTALS.Sun);
  });
});

describe('interpretation helpers', () => {
  it('bands Sarvashtakavarga scores around the 28-bindu average', () => {
    expect(savStrength(36)).toBe('Strong');
    expect(savStrength(31)).toBe('Above average');
    expect(savStrength(28)).toBe('Average');
    expect(savStrength(24)).toBe('Below average');
    expect(savStrength(18)).toBe('Weak');
  });

  it('reads a transit by the bindus the graha holds in that sign', () => {
    const { chart } = castChart(birth);
    for (let sign = 0; sign < 12; sign++) {
      const r = transitBindus(chart, 'Saturn', sign as RashiIndex);
      expect(r.bindus).toBeGreaterThanOrEqual(0);
      expect(r.bindus).toBeLessThanOrEqual(8);
      expect(r.of).toBe(8);
      expect(r.reading).toMatch(/transit/);
    }
  });
});
