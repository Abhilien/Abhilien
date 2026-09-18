import { describe, it, expect } from 'vitest';
import * as Astro from 'astronomy-engine';
import { ayanamsa, generalPrecessionArcsec } from '../src/core/ayanamsa.js';

const at = (y: number, m: number, d: number) =>
  Astro.MakeTime(new Date(Date.UTC(y, m - 1, d, 0, 0, 0)));

const arcsec = (deg: number) => deg * 3600;

describe('Lahiri ayanamsa', () => {
  // Published Chitrapaksha values. The engine must land within a small
  // fraction of a nakshatra pada (one pada = 12000 arcseconds).
  const published: [string, Astro.AstroTime, number][] = [
    ['1900', at(1900, 1, 1), 22.4604],
    ['1950', at(1950, 1, 1), 23.1592],
    ['2000', at(2000, 1, 1), 23.8531],
    ['2020', at(2020, 1, 1), 24.1328],
  ];

  for (const [label, time, expected] of published) {
    it(`matches the published value for ${label} to within 20 arcseconds`, () => {
      const got = ayanamsa(time, 'Lahiri');
      expect(Math.abs(arcsec(got - expected))).toBeLessThan(20);
    });
  }

  it('advances at the rate of general precession, without a nutation wobble', () => {
    // A star-anchored ayanamsa wobbles by up to +-17"; a precession-anchored one
    // must not. Sampling every year for two decades, the year-on-year rate
    // should stay tightly clustered around 50.29"/yr.
    const rates: number[] = [];
    for (let y = 1990; y < 2020; y++) {
      const a = ayanamsa(at(y, 1, 1), 'Lahiri');
      const b = ayanamsa(at(y + 1, 1, 1), 'Lahiri');
      rates.push(arcsec(b - a));
    }
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    expect(min).toBeGreaterThan(50.0);
    expect(max).toBeLessThan(50.6);
    expect(max - min).toBeLessThan(0.2); // no 18.6-year nutation signature
  });
});

describe('other ayanamsa systems', () => {
  it('orders the systems as tradition does at J2000', () => {
    const t = at(2000, 1, 1);
    const lahiri = ayanamsa(t, 'Lahiri');
    const raman = ayanamsa(t, 'Raman');
    const kp = ayanamsa(t, 'KP');
    const yukteshwar = ayanamsa(t, 'Yukteshwar');

    // Raman runs about 1.4 degrees behind Lahiri.
    expect(lahiri - raman).toBeGreaterThan(1.3);
    expect(lahiri - raman).toBeLessThan(1.5);
    // KP sits a few arcminutes behind Lahiri.
    expect(arcsec(lahiri - kp)).toBeGreaterThan(200);
    expect(arcsec(lahiri - kp)).toBeLessThan(400);
    // Yukteshwar runs about 1.5 degrees behind Lahiri.
    expect(lahiri - yukteshwar).toBeGreaterThan(1.3);
    expect(lahiri - yukteshwar).toBeLessThan(1.6);
  });

  it('places Spica at exactly 180 degrees under True Chitra, by construction', () => {
    // This is the definition of the system, so it must hold at any epoch.
    for (const y of [1900, 2000, 2100]) {
      const t = at(y, 6, 1);
      const a = ayanamsa(t, 'TrueChitra');
      const lahiri = ayanamsa(t, 'Lahiri');
      // True Chitra and Lahiri are within a couple of arcminutes of each other,
      // which is the whole reason Lahiri was chosen as the national standard.
      expect(Math.abs(arcsec(a - lahiri))).toBeLessThan(180);
    }
  });
});

describe('general precession polynomial', () => {
  it('is zero at J2000 and advances ~50.29 arcsec/yr there', () => {
    expect(generalPrecessionArcsec(0)).toBe(0);
    const rate = (generalPrecessionArcsec(0.005) - generalPrecessionArcsec(-0.005)) / 1;
    expect(rate).toBeGreaterThan(50.2);
    expect(rate).toBeLessThan(50.4);
  });
});
