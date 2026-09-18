import { describe, it, expect } from 'vitest';
import {
  aspectOffsets, aspectedRashis, rashiDrishti, rashiAspects, argalaOn,
  grahasAspectingHouse, conjunctGrahas,
} from '../src/chart/aspects.js';
import { castChart } from '../src/chart/kundali.js';
import type { BirthData, RashiIndex } from '../src/core/types.js';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 10, minute: 30,
  location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  timeAccuracy: 'Exact',
};

describe('Parashari graha drishti', () => {
  it('gives every graha the 7th aspect', () => {
    for (const g of ['Sun', 'Moon', 'Mercury', 'Venus'] as const) {
      expect(aspectOffsets(g)).toEqual([7]);
    }
  });

  it('gives Mars the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th', () => {
    expect(aspectOffsets('Mars')).toEqual([4, 7, 8]);
    expect(aspectOffsets('Jupiter')).toEqual([5, 7, 9]);
    expect(aspectOffsets('Saturn')).toEqual([3, 7, 10]);
  });

  it('keeps the nodes to the 7th unless the later convention is enabled', () => {
    expect(aspectOffsets('Rahu')).toEqual([7]);
    expect(aspectOffsets('Rahu', { nodesAspect: true })).toEqual([5, 7, 9]);
  });

  it('resolves aspected signs by counting inclusively', () => {
    // Jupiter in Mesha aspects the 5th (Simha), 7th (Tula) and 9th (Dhanu).
    expect(aspectedRashis('Jupiter', 0 as RashiIndex).sort((a, b) => a - b)).toEqual([4, 6, 8]);
    // Saturn in Mesha aspects the 3rd (Mithuna), 7th (Tula) and 10th (Makara).
    expect(aspectedRashis('Saturn', 0 as RashiIndex).sort((a, b) => a - b)).toEqual([2, 6, 9]);
  });
});

describe('Jaimini rashi drishti', () => {
  it('is symmetric', () => {
    for (let a = 0; a < 12; a++) {
      for (const b of rashiDrishti(a as RashiIndex)) {
        expect(rashiAspects(b, a as RashiIndex), `${a} <-> ${b}`).toBe(true);
      }
    }
  });

  it('gives every sign exactly three aspects, never itself', () => {
    for (let a = 0; a < 12; a++) {
      const aspects = rashiDrishti(a as RashiIndex);
      expect(aspects, `sign ${a}`).toHaveLength(3);
      expect(aspects).not.toContain(a);
    }
  });

  it('sends movable signs to fixed signs and dual signs to dual signs', () => {
    // Mesha (movable) aspects Simha, Vrischika, Kumbha - all fixed.
    expect(rashiDrishti(0 as RashiIndex).sort((a, b) => a - b)).toEqual([4, 7, 10]);
    // Mithuna (dual) aspects the other dual signs.
    expect(rashiDrishti(2 as RashiIndex).sort((a, b) => a - b)).toEqual([5, 8, 11]);
  });
});

describe('argala', () => {
  it('reports causing and obstructing houses without exceeding three', () => {
    const { chart } = castChart(birth);
    const a = argalaOn(chart, chart.lagnaRashi);
    expect(a.net).toBeGreaterThanOrEqual(0);
    expect(a.net).toBeLessThanOrEqual(3);
  });
});

describe('chart aspect queries', () => {
  it('finds aspects on houses and conjunctions consistently', () => {
    const { chart } = castChart(birth);
    for (let house = 1; house <= 12; house++) {
      const aspecting = grahasAspectingHouse(chart, house as 1);
      expect(Array.isArray(aspecting)).toBe(true);
    }
    // Conjunction is symmetric.
    for (const g of ['Sun', 'Moon', 'Mars'] as const) {
      for (const other of conjunctGrahas(chart, g)) {
        expect(conjunctGrahas(chart, other)).toContain(g);
      }
    }
  });
});
