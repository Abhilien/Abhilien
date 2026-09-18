import { describe, it, expect } from 'vitest';
import {
  grahaCondition, allConditions, yogakarakaFor, functionalNature,
  temporalRelation, compoundRelation, avastha, debilitationPoint,
} from '../src/chart/dignity.js';
import { castChart } from '../src/chart/kundali.js';
import { RASHI_NAMES_SA } from '../src/core/constants.js';
import type { BirthData, RashiIndex, Graha } from '../src/core/types.js';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 10, minute: 30,
  location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  timeAccuracy: 'Exact',
};

describe('yogakaraka', () => {
  // The six lagnas with a yogakaraka are a fixed, well known list. Deriving them
  // from the ownership rules rather than hardcoding them means the rule itself
  // is under test.
  const expected: Record<number, Graha | null> = {
    0: null,        // Mesha
    1: 'Saturn',    // Vrishabha
    2: null,        // Mithuna
    3: 'Mars',      // Karka
    4: 'Mars',      // Simha
    5: null,        // Kanya
    6: 'Saturn',    // Tula
    7: null,        // Vrischika
    8: null,        // Dhanu
    9: 'Venus',     // Makara
    10: 'Venus',    // Kumbha
    11: null,       // Meena
  };

  for (const [rashi, graha] of Object.entries(expected)) {
    it(`${RASHI_NAMES_SA[Number(rashi)]} lagna -> ${graha ?? 'none'}`, () => {
      expect(yogakarakaFor(Number(rashi) as RashiIndex)).toBe(graha);
    });
  }

  it('does not promote a lagna lord merely for owning the first house', () => {
    // Mercury owns the 1st and 4th for Mithuna. The 1st is both a kendra and a
    // trikona, so a loose reading would wrongly make Mercury a yogakaraka.
    expect(functionalNature(2 as RashiIndex, 'Mercury').yogakaraka).toBe(false);
  });
});

describe('house ownership', () => {
  it('assigns the right houses from the lagna', () => {
    // Vrishabha lagna: Saturn owns Makara (9th) and Kumbha (10th).
    expect(functionalNature(1 as RashiIndex, 'Saturn').ownedHouses.sort((a, b) => a - b)).toEqual([9, 10]);
    // Mesha lagna: Mars owns Mesha (1st) and Vrischika (8th).
    expect(functionalNature(0 as RashiIndex, 'Mars').ownedHouses.sort((a, b) => a - b)).toEqual([1, 8]);
  });

  it('gives the nodes no ownership', () => {
    expect(functionalNature(0 as RashiIndex, 'Rahu').ownedHouses).toEqual([]);
    expect(functionalNature(0 as RashiIndex, 'Ketu').ownedHouses).toEqual([]);
  });
});

describe('relationships', () => {
  it('treats the 2nd, 3rd, 4th, 10th, 11th and 12th as temporal friends', () => {
    for (const offset of [1, 2, 3, 9, 10, 11]) {
      expect(temporalRelation(0 as RashiIndex, offset as RashiIndex)).toBe('F');
    }
    for (const offset of [0, 4, 5, 6, 7, 8]) {
      expect(temporalRelation(0 as RashiIndex, offset as RashiIndex)).toBe('E');
    }
  });

  it('combines natural and temporal into the five-fold relationship', () => {
    expect(compoundRelation('F', 'F')).toBe('Adhimitra');
    expect(compoundRelation('F', 'E')).toBe('Sama');
    expect(compoundRelation('N', 'F')).toBe('Mitra');
    expect(compoundRelation('N', 'E')).toBe('Shatru');
    expect(compoundRelation('E', 'F')).toBe('Sama');
    expect(compoundRelation('E', 'E')).toBe('Adhishatru');
  });
});

describe('avastha', () => {
  it('counts forward in odd signs and backward in even ones', () => {
    expect(avastha(0 as RashiIndex, 2)).toBe('Bala');    // Mesha, early
    expect(avastha(0 as RashiIndex, 28)).toBe('Mrita');  // Mesha, late
    expect(avastha(1 as RashiIndex, 2)).toBe('Mrita');   // Vrishabha, early
    expect(avastha(1 as RashiIndex, 28)).toBe('Bala');   // Vrishabha, late
  });
});

describe('exaltation and debilitation', () => {
  it('puts each debilitation exactly opposite its exaltation', () => {
    expect(debilitationPoint('Sun')).toBeCloseTo(6 * 30 + 10, 9);      // Tula 10
    expect(debilitationPoint('Jupiter')).toBeCloseTo(9 * 30 + 5, 9);   // Makara 5
    expect(debilitationPoint('Venus')).toBeCloseTo(5 * 30 + 27, 9);    // Kanya 27
    expect(debilitationPoint('Rahu')).toBeNull();
  });

  it('recognises an exalted graha in a real chart', () => {
    // 15 April: the Sun has just entered Mesha, where it is exalted.
    const { chart } = castChart({ ...birth, year: 2020, month: 4, day: 20 });
    const sun = grahaCondition(chart, 'Sun');
    expect(sun.exalted).toBe(true);
    expect(sun.dignity).toBe('Exalted');
    expect(sun.debilitated).toBe(false);
  });
});

describe('conditional natures', () => {
  it('reads the Moon as malefic when close to the Sun and benefic when far', () => {
    // New Moon: Moon and Sun together.
    const newMoon = castChart({ ...birth, year: 2020, month: 3, day: 24 }).chart;
    // Full Moon: opposition.
    const fullMoon = castChart({ ...birth, year: 2020, month: 4, day: 8 }).chart;
    expect(allConditions(newMoon).Moon.naturalNature).toBe('Malefic');
    expect(allConditions(fullMoon).Moon.naturalNature).toBe('Benefic');
  });
});

describe('chart-wide conditions', () => {
  it('produces a condition for every graha', () => {
    const { chart } = castChart(birth);
    const conditions = allConditions(chart);
    expect(Object.keys(conditions)).toHaveLength(9);
    for (const c of Object.values(conditions)) {
      expect(c.dignity).toBeTruthy();
      expect(c.dispositor).toBeTruthy();
    }
  });

  it('never marks the Sun combust by its own light', () => {
    const { chart } = castChart(birth);
    expect(grahaCondition(chart, 'Sun').combust).toBe(false);
  });
});
