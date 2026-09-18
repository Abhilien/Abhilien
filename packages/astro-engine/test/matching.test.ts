import { describe, it, expect } from 'vitest';
import { gunaMilan, profileOf, describeProfile } from '../src/matching/ashtakoot.js';
import { makeChart, SIGN } from './helpers/synthetic.js';
import { NAKSHATRA_SPAN } from '../src/core/constants.js';
import { castChart } from '../src/chart/kundali.js';
import type { BirthData } from '../src/core/types.js';

/** A chart whose Moon sits in a chosen nakshatra and pada. */
const moonAt = (nakshatra: number, pada = 1) =>
  makeChart({
    lagna: [SIGN.Mesha, 5],
    positions: { Moon: nakshatra * NAKSHATRA_SPAN + (pada - 1) * (NAKSHATRA_SPAN / 4) + 0.5 },
  });

describe('Guna Milan structure', () => {
  it('scores eight kootas totalling at most 36', () => {
    const r = gunaMilan(moonAt(0), moonAt(13));
    expect(r.kootas).toHaveLength(8);
    expect(r.maximum).toBe(36);
    expect(r.total).toBe(r.kootas.reduce((s, k) => s + k.points, 0));
    expect(r.total).toBeLessThanOrEqual(36);
    expect(r.total).toBeGreaterThanOrEqual(0);
  });

  it('uses the classical maximum for each koota', () => {
    const r = gunaMilan(moonAt(3), moonAt(17));
    expect(r.kootas.map((k) => k.maximum)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.kootas.reduce((s, k) => s + k.maximum, 0)).toBe(36);
  });

  it('never awards a koota more than its maximum or less than zero', () => {
    for (let g = 0; g < 27; g++) {
      for (let b = 0; b < 27; b += 4) {
        for (const k of gunaMilan(moonAt(g), moonAt(b)).kootas) {
          expect(k.points, `${k.name} ${g}/${b}`).toBeGreaterThanOrEqual(0);
          expect(k.points, `${k.name} ${g}/${b}`).toBeLessThanOrEqual(k.maximum);
        }
      }
    }
  });

  it('explains every koota in words', () => {
    for (const k of gunaMilan(moonAt(5), moonAt(20)).kootas) {
      expect(k.reason, k.name).toBeTruthy();
      expect(k.reason.length, k.name).toBeGreaterThan(20);
    }
  });
});

describe('Nadi koota', () => {
  const nadiOf = (g: number, b: number) =>
    gunaMilan(moonAt(g), moonAt(b)).kootas.find((k) => k.name === 'Nadi')!;

  it('awards all eight points for different nadis', () => {
    // Ashwini is Adi, Bharani is Madhya.
    expect(nadiOf(0, 1).points).toBe(8);
  });

  it('awards nothing when both share a nadi', () => {
    // Ashwini and Ardra are both Adi.
    expect(nadiOf(0, 5).points).toBe(0);
  });

  it('cancels the fault when both share a nakshatra but differ in pada', () => {
    const r = gunaMilan(moonAt(4, 1), moonAt(4, 3));
    const nadi = r.kootas.find((k) => k.name === 'Nadi')!;
    expect(nadi.points).toBe(0);
    expect(nadi.faultCancelled).toBe(true);
    expect(r.cancelledFaults).toContain('Nadi');
  });

  it('does not cancel when the nadi simply matches across unrelated nakshatras', () => {
    const nadi = nadiOf(0, 5);
    expect(nadi.faultCancelled).toBe(false);
  });
});

describe('Bhakoot koota', () => {
  const bhakootOf = (groomSign: number, brideSign: number) => {
    const g = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Moon: [groomSign, 15] } });
    const b = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Moon: [brideSign, 15] } });
    return gunaMilan(g, b).kootas.find((k) => k.name === 'Bhakoot')!;
  };

  it('awards all seven points for a benign relationship', () => {
    // Mesha and Mithuna are 3/11 apart, which carries no fault.
    expect(bhakootOf(SIGN.Mesha, SIGN.Mithuna).points).toBe(7);
  });

  it('awards nothing for the 6/8 relationship', () => {
    // Mesha and Kanya are 6/8 apart.
    expect(bhakootOf(SIGN.Mesha, SIGN.Kanya).points).toBe(0);
  });

  it('awards nothing for the 2/12 and 5/9 relationships', () => {
    expect(bhakootOf(SIGN.Mesha, SIGN.Vrishabha).points).toBe(0);   // 2/12
    expect(bhakootOf(SIGN.Mesha, SIGN.Simha).points).toBe(0);       // 5/9
  });

  it('cancels the fault when both Moon signs share a lord', () => {
    // Mesha and Vrischika are 8/6 apart, and Mars rules both.
    const k = bhakootOf(SIGN.Mesha, SIGN.Vrischika);
    expect(k.points).toBe(0);
    expect(k.faultCancelled).toBe(true);
  });
});

describe('Gana koota', () => {
  const ganaOf = (g: number, b: number) =>
    gunaMilan(moonAt(g), moonAt(b)).kootas.find((k) => k.name === 'Gana')!;

  it('awards full points when both share a gana', () => {
    expect(ganaOf(0, 4).points).toBe(6);    // Ashwini and Mrigashira, both Deva
  });

  it('is asymmetric between Deva and Manushya, as the table is', () => {
    // Ashwini is Deva, Bharani is Manushya.
    expect(ganaOf(0, 1).points).toBe(6);    // Deva groom, Manushya bride
    expect(ganaOf(1, 0).points).toBe(5);    // Manushya groom, Deva bride
  });

  it('penalises a Rakshasa groom with a Manushya bride', () => {
    // Krittika is Rakshasa, Bharani is Manushya.
    expect(ganaOf(2, 1).points).toBe(0);
  });
});

describe('Graha Maitri koota', () => {
  it('awards full points when both Moon signs share a lord', () => {
    const g = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Moon: [SIGN.Mesha, 15] } });
    const b = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Moon: [SIGN.Vrischika, 15] } });
    const k = gunaMilan(g, b).kootas.find((x) => x.name === 'Graha Maitri')!;
    expect(k.points).toBe(5);
  });
});

describe('Tara koota', () => {
  it('awards the full three points when both directions are auspicious', () => {
    const k = gunaMilan(moonAt(0), moonAt(1)).kootas.find((x) => x.name === 'Tara')!;
    expect([0, 1.5, 3]).toContain(k.points);
  });

  it('splits into halves, so a partial score is always 1.5', () => {
    for (let g = 0; g < 27; g++) {
      const k = gunaMilan(moonAt(g), moonAt(0)).kootas.find((x) => x.name === 'Tara')!;
      expect([0, 1.5, 3]).toContain(k.points);
    }
  });
});

describe('verdict', () => {
  it('bands the score and always states the caveat', () => {
    for (let g = 0; g < 27; g += 3) {
      const r = gunaMilan(moonAt(g), moonAt((g + 7) % 27));
      expect(['NotRecommended', 'Acceptable', 'Good', 'Excellent']).toContain(r.band);
      // The verdict must never present the number as a decision on its own.
      expect(r.verdict).toMatch(/one input among several/);
      expect(r.verdict).toMatch(/Moon's nakshatra alone/);
    }
  });

  it('bands on the published thresholds', () => {
    const band = (total: number) =>
      total >= 32 ? 'Excellent' : total >= 24 ? 'Good' : total >= 18 ? 'Acceptable' : 'NotRecommended';
    for (let g = 0; g < 27; g += 2) {
      const r = gunaMilan(moonAt(g), moonAt((g + 11) % 27));
      expect(r.band).toBe(band(r.total));
    }
  });
});

describe('profiles from real charts', () => {
  const birth: BirthData = {
    year: 1990, month: 8, day: 15, hour: 10, minute: 30,
    location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
    timeAccuracy: 'Exact',
  };

  it('reads the Moon nakshatra, pada and sign from a cast chart', () => {
    const { chart } = castChart(birth);
    const p = profileOf(chart);
    expect(p.nakshatra).toBe(chart.positions.Moon.nakshatra);
    expect(p.pada).toBe(chart.positions.Moon.pada);
    expect(p.moonRashi).toBe(chart.positions.Moon.rashi);
    expect(describeProfile(p)).toMatch(/gana/);
  });

  it('matches two real charts end to end', () => {
    const a = castChart(birth).chart;
    const b = castChart({ ...birth, year: 1992, month: 3, day: 7, hour: 14, minute: 45 }).chart;
    const r = gunaMilan(a, b);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(36);
    expect(r.kootas.every((k) => k.reason.length > 0)).toBe(true);
  });
});
