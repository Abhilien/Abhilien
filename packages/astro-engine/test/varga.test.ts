import { describe, it, expect } from 'vitest';
import { vargaSign, buildAllVargas, isVargottama, VARGAS, type VargaCode } from '../src/chart/varga.js';
import { castChart } from '../src/chart/kundali.js';
import { RASHI_NAMES_SA } from '../src/core/constants.js';
import type { BirthData, RashiIndex } from '../src/core/types.js';

const codes = Object.keys(VARGAS) as VargaCode[];
const sample = (stepDeg = 0.05) => {
  const out: number[] = [];
  for (let lon = 0; lon < 360; lon += stepDeg) out.push(lon);
  return out;
};

describe('varga mapping invariants', () => {
  it('always returns a valid sign for every varga at every longitude', () => {
    for (const code of codes) {
      for (const lon of sample(0.13)) {
        const sign = vargaSign(lon, code);
        expect(Number.isInteger(sign), `${code} @ ${lon}`).toBe(true);
        expect(sign, `${code} @ ${lon}`).toBeGreaterThanOrEqual(0);
        expect(sign, `${code} @ ${lon}`).toBeLessThanOrEqual(11);
      }
    }
  });

  it('D1 is the rashi itself', () => {
    for (const lon of sample(0.07)) {
      expect(vargaSign(lon, 'D1')).toBe(Math.floor(lon / 30));
    }
  });

  it('D9 agrees with the continuous-navamsa shortcut', () => {
    // The chara/sthira/dvisvabhava starting rule is exactly equivalent to
    // numbering all 108 navamsas continuously from 0 Mesha. If our table-driven
    // mapping is right, the two must agree everywhere.
    for (const lon of sample(0.03)) {
      const shortcut = Math.floor(lon / (30 / 9)) % 12;
      expect(vargaSign(lon, 'D9'), `navamsa @ ${lon}`).toBe(shortcut);
    }
  });

  it('D2 only ever yields Karka or Simha', () => {
    const seen = new Set(sample(0.11).map((lon) => vargaSign(lon, 'D2')));
    expect([...seen].sort()).toEqual([3, 4]);
  });

  it('D30 never yields Karka or Simha, because the luminaries own no trimsamsa', () => {
    const seen = new Set(sample(0.11).map((lon) => vargaSign(lon, 'D30')));
    expect(seen.has(3)).toBe(false);   // Karka, the Moon's sign
    expect(seen.has(4)).toBe(false);   // Simha, the Sun's sign
    expect(seen.size).toBe(10);
  });

  it('D3 sends the three drekkanas to the sign, the 5th and the 9th', () => {
    for (let rashi = 0; rashi < 12; rashi++) {
      const base = rashi * 30;
      expect(vargaSign(base + 1,  'D3')).toBe(rashi);
      expect(vargaSign(base + 15, 'D3')).toBe((rashi + 4) % 12);
      expect(vargaSign(base + 25, 'D3')).toBe((rashi + 8) % 12);
    }
  });

  it('D4 sends the four quarters to the four kendras from the sign', () => {
    for (let rashi = 0; rashi < 12; rashi++) {
      const base = rashi * 30;
      expect(vargaSign(base + 1,  'D4')).toBe(rashi);
      expect(vargaSign(base + 10, 'D4')).toBe((rashi + 3) % 12);
      expect(vargaSign(base + 17, 'D4')).toBe((rashi + 6) % 12);
      expect(vargaSign(base + 25, 'D4')).toBe((rashi + 9) % 12);
    }
  });

  it('places every division within its own sign for D1 and at sign start for D12', () => {
    // The first dwadasamsa of any sign is that sign itself.
    for (let rashi = 0; rashi < 12; rashi++) {
      expect(vargaSign(rashi * 30 + 0.5, 'D12')).toBe(rashi);
    }
  });
});

describe('vargottama', () => {
  it('holds at the first navamsa of movable signs', () => {
    for (const rashi of [0, 3, 6, 9]) {          // Mesha, Karka, Tula, Makara
      expect(isVargottama(rashi * 30 + 1), RASHI_NAMES_SA[rashi]).toBe(true);
    }
  });

  it('holds at the fifth navamsa of fixed signs', () => {
    const NAVAMSA = 30 / 9;
    for (const rashi of [1, 4, 7, 10]) {         // Vrishabha, Simha, Vrischika, Kumbha
      // 5th navamsa spans 13°20' to 16°40' within the sign.
      expect(isVargottama(rashi * 30 + 4 * NAVAMSA + 1), RASHI_NAMES_SA[rashi]).toBe(true);
      expect(isVargottama(rashi * 30 + 1), RASHI_NAMES_SA[rashi]).toBe(false);
    }
  });

  it('holds at the ninth navamsa of dual signs', () => {
    const NAVAMSA = 30 / 9;
    for (const rashi of [2, 5, 8, 11]) {         // Mithuna, Kanya, Dhanu, Meena
      // 9th navamsa spans 26°40' to 30° within the sign.
      expect(isVargottama(rashi * 30 + 8 * NAVAMSA + 1), RASHI_NAMES_SA[rashi]).toBe(true);
      expect(isVargottama(rashi * 30 + 1), RASHI_NAMES_SA[rashi]).toBe(false);
    }
  });

  it('marks exactly one navamsa per sign as vargottama, and it is the 1st, 5th or 9th', () => {
    // A structural check of the classical statement: movable signs are
    // vargottama in their first navamsa, fixed signs in their fifth, dual signs
    // in their ninth. Nothing else can be.
    const NAVAMSA = 30 / 9;
    const byQuality: Record<string, number[]> = { Chara: [], Sthira: [], Dvisvabhava: [] };
    for (let rashi = 0; rashi < 12; rashi++) {
      const hits: number[] = [];
      for (let k = 0; k < 9; k++) {
        if (isVargottama(rashi * 30 + k * NAVAMSA + NAVAMSA / 2)) hits.push(k + 1);
      }
      expect(hits, `sign ${rashi}`).toHaveLength(1);
      const quality = ['Chara', 'Sthira', 'Dvisvabhava'][rashi % 3]!;
      byQuality[quality]!.push(hits[0]!);
    }
    expect(new Set(byQuality.Chara)).toEqual(new Set([1]));
    expect(new Set(byQuality.Sthira)).toEqual(new Set([5]));
    expect(new Set(byQuality.Dvisvabhava)).toEqual(new Set([9]));
  });
});

describe('varga charts', () => {
  const birth: BirthData = {
    year: 1990, month: 8, day: 15, hour: 10, minute: 30,
    location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
    timeAccuracy: 'Exact',
  };

  it('builds all sixteen with consistent house numbering', () => {
    const { chart } = castChart(birth);
    const vargas = buildAllVargas(chart);
    expect(Object.keys(vargas)).toHaveLength(16);

    for (const code of codes) {
      const v = vargas[code];
      for (const [graha, sign] of Object.entries(v.grahaRashi)) {
        const expected = (((sign as RashiIndex) - v.lagnaRashi + 12) % 12) + 1;
        expect(v.grahaBhava[graha as keyof typeof v.grahaBhava], `${code} ${graha}`).toBe(expected);
      }
    }
  });
});
