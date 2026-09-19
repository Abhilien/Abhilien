import { describe, it, expect } from 'vitest';
import { findMuhurtas } from '../src/muhurta/muhurta.js';
import {
  ACTIVITY_RULES, NAKSHATRA_NATURE, INAUSPICIOUS_YOGAS, RIKTA_TITHIS,
  TARA_NAMES, INAUSPICIOUS_TARAS, FAVOURABLE_CHANDRA_HOUSES,
  type MuhurtaActivity, type NakshatraNature,
} from '../src/muhurta/activities.js';
import { computePanchang, solarDay, YOGA_NAMES } from '../src/panchang/panchang.js';
import { castChart } from '../src/chart/kundali.js';
import type { GeoLocation } from '../src/core/types.js';

const DELHI: GeoLocation = {
  latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', label: 'New Delhi',
};
const natal = castChart({
  year: 1990, month: 8, day: 15, hour: 10, minute: 30, location: DELHI, timeAccuracy: 'Exact',
}).chart;

const activities = Object.keys(ACTIVITY_RULES) as MuhurtaActivity[];

describe('classical tables', () => {
  it('classifies all 27 nakshatras and uses every nature', () => {
    expect(NAKSHATRA_NATURE).toHaveLength(27);
    const natures = new Set(NAKSHATRA_NATURE);
    const expected: NakshatraNature[] = [
      'Dhruva', 'Chara', 'Ugra', 'Mishra', 'Kshipra', 'Mridu', 'Tikshna',
    ];
    for (const n of expected) expect(natures, n).toContain(n);
  });

  it('gives the classical count to each nature', () => {
    // 4 fixed, 5 movable, 5 fierce, 2 mixed, 3 swift, 4 tender, 4 sharp = 27.
    const counts = new Map<string, number>();
    for (const n of NAKSHATRA_NATURE) counts.set(n, (counts.get(n) ?? 0) + 1);
    expect(counts.get('Dhruva')).toBe(4);
    expect(counts.get('Chara')).toBe(5);
    expect(counts.get('Ugra')).toBe(5);
    expect(counts.get('Mishra')).toBe(2);
    expect(counts.get('Kshipra')).toBe(3);
    expect(counts.get('Mridu')).toBe(4);
    expect(counts.get('Tikshna')).toBe(4);
  });

  it('names nine avoided yogas, all real and distinct', () => {
    expect(INAUSPICIOUS_YOGAS).toHaveLength(9);
    expect(new Set(INAUSPICIOUS_YOGAS).size).toBe(9);
    for (const i of INAUSPICIOUS_YOGAS) {
      expect(YOGA_NAMES[i]).toBeTruthy();
    }
    // Spot-check the two best known.
    expect(INAUSPICIOUS_YOGAS.map((i) => YOGA_NAMES[i])).toContain('Vyatipata');
    expect(INAUSPICIOUS_YOGAS.map((i) => YOGA_NAMES[i])).toContain('Vaidhriti');
  });

  it('uses the three rikta tithis and the three obstructive taras', () => {
    expect([...RIKTA_TITHIS]).toEqual([4, 9, 14]);
    expect([...INAUSPICIOUS_TARAS]).toEqual([3, 5, 7]);
    expect(TARA_NAMES).toHaveLength(9);
    expect(TARA_NAMES[0]).toBe('Janma');
    expect(FAVOURABLE_CHANDRA_HOUSES).toHaveLength(6);
  });

  it('gives every activity a well-formed rule', () => {
    for (const activity of activities) {
      const rule = ACTIVITY_RULES[activity];
      expect(rule.label, activity).toBeTruthy();
      expect(rule.labelHi, activity).toBeTruthy();
      expect(rule.natures.length, activity).toBeGreaterThan(0);
      expect(rule.weekdays.length, activity).toBeGreaterThan(0);
      for (const d of rule.weekdays) {
        expect(d, activity).toBeGreaterThanOrEqual(0);
        expect(d, activity).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('window selection', () => {
  const result = findMuhurtas(
    'Marriage', new Date('2026-11-01'), new Date('2027-01-31'), DELHI,
    { natal, limit: 20 },
  );

  it('finds windows and ranks them by score', () => {
    expect(result.windows.length).toBeGreaterThan(0);
    for (let i = 1; i < result.windows.length; i++) {
      expect(result.windows[i - 1]!.score).toBeGreaterThanOrEqual(result.windows[i]!.score);
    }
  });

  // The property that matters most: recommending a time inside Rahu Kaal would
  // be worse than recommending nothing.
  it('never returns a window overlapping Rahu Kaal, Gulika or Yamaganda', () => {
    for (const w of result.windows) {
      const panchang = computePanchang(w.start, DELHI);
      for (const bad of [panchang.rahuKaal, panchang.gulikaKaal, panchang.yamaganda]) {
        if (!bad) continue;
        const overlaps = w.start.getTime() < bad.end.getTime()
          && w.end.getTime() > bad.start.getTime();
        expect(overlaps, `${w.name} on ${w.day.date} overlaps ${bad.name}`).toBe(false);
      }
    }
  });

  it('keeps every window inside daylight', () => {
    for (const w of result.windows) {
      const panchang = computePanchang(w.start, DELHI);
      expect(w.start.getTime()).toBeGreaterThanOrEqual(panchang.sunrise!.getTime() - 1000);
      expect(w.end.getTime()).toBeLessThanOrEqual(panchang.sunset!.getTime() + 1000);
    }
  });

  it('never returns a sliver too short to use', () => {
    for (const w of result.windows) {
      expect(w.end.getTime() - w.start.getTime()).toBeGreaterThanOrEqual(20 * 60_000);
    }
  });

  it('grades consistently with the score', () => {
    for (const w of result.windows) {
      const expected = w.score >= 85 ? 'Excellent' : w.score >= 72 ? 'Good' : 'Acceptable';
      expect(w.grade, `score ${w.score}`).toBe(expected);
    }
  });

  it('is deterministic', () => {
    const again = findMuhurtas(
      'Marriage', new Date('2026-11-01'), new Date('2027-01-31'), DELHI,
      { natal, limit: 20 },
    );
    expect(JSON.stringify(again.windows)).toBe(JSON.stringify(result.windows));
  });
});

describe('day scoring', () => {
  const result = findMuhurtas(
    'Marriage', new Date('2026-11-01'), new Date('2027-01-31'), DELHI,
    { natal, limit: 10 },
  );

  it('explains every factor and sums to the reported day score', () => {
    for (const w of result.windows) {
      expect(w.day.factors.length).toBe(7);        // five limbs plus tara and chandra bala
      const earned = w.day.factors.reduce((s, f) => s + f.points, 0);
      const possible = w.day.factors.reduce((s, f) => s + f.maximum, 0);
      expect(w.day.score).toBe(Math.round((earned / possible) * 100));
      for (const f of w.day.factors) {
        expect(f.detail.length, f.name).toBeGreaterThan(15);
        expect(f.points === 0 || f.points === f.maximum).toBe(true);
      }
    }
  });

  it('drops the natal factors when no chart is supplied', () => {
    const anonymous = findMuhurtas(
      'Travel', new Date('2026-11-01'), new Date('2026-12-15'), DELHI, { limit: 3 },
    );
    for (const w of anonymous.windows) {
      expect(w.day.factors).toHaveLength(5);
      expect(w.day.factors.map((f) => f.name)).not.toContain('Tara bala');
    }
  });

  it('honours the minimum day score', () => {
    const strict = findMuhurtas(
      'Marriage', new Date('2026-11-01'), new Date('2027-01-31'), DELHI,
      { natal, minimumDayScore: 100, limit: 20 },
    );
    for (const w of strict.windows) expect(w.day.score).toBe(100);
  });

  it('never recommends a day whose nakshatra nature the activity rejects', () => {
    // A perfect-scoring day must satisfy every factor, including this one.
    const strict = findMuhurtas(
      'Marriage', new Date('2026-11-01'), new Date('2027-01-31'), DELHI,
      { natal, minimumDayScore: 100, limit: 20 },
    );
    for (const w of strict.windows) {
      const nakshatraFactor = w.day.factors.find((f) => f.name === 'Nakshatra')!;
      expect(nakshatraFactor.ok, `${w.day.nakshatra} on ${w.day.date}`).toBe(true);
    }
  });
});

describe('honesty', () => {
  it('carries a standing caution for medical procedures and nowhere else', () => {
    const medical = findMuhurtas(
      'MedicalProcedure', new Date('2026-11-01'), new Date('2026-12-15'), DELHI, { natal },
    );
    expect(medical.caution).toBeTruthy();
    expect(medical.caution).toMatch(/must follow your doctor/i);
    expect(medical.caution).toMatch(/[Nn]ever delay/);

    const marriage = findMuhurtas(
      'Marriage', new Date('2026-11-01'), new Date('2026-12-15'), DELHI, { natal },
    );
    expect(marriage.caution).toBeUndefined();
  });

  it('states that muhurta is a preference, not a prediction', () => {
    const result = findMuhurtas(
      'BusinessStart', new Date('2026-11-01'), new Date('2026-12-31'), DELHI, { natal },
    );
    if (result.windows.length > 0) {
      expect(result.summary).toMatch(/not a prediction/);
    }
  });

  it('says plainly when nothing in the range qualifies', () => {
    const impossible = findMuhurtas(
      'Marriage', new Date('2026-11-01'), new Date('2026-11-03'), DELHI,
      { natal, minimumDayScore: 100 },
    );
    if (impossible.windows.length === 0) {
      expect(impossible.summary).toMatch(/A thin result is information/);
    }
  });
});

describe('one source of truth for the day', () => {
  // Muhurta and the panchang each need a day's sunrise and sunset. When they
  // computed them independently the two answers differed by tens of
  // milliseconds, which was enough for a window starting at sunrise to be
  // attributed to the previous day, and for two adjacent segments to register
  // as overlapping. Both now go through solarDay, and this pins that.
  it('gives the same boundaries to the panchang and to a muhurta window', () => {
    const result = findMuhurtas(
      'Marriage', new Date('2026-11-01'), new Date('2027-01-31'), DELHI,
      { natal, limit: 20 },
    );
    expect(result.windows.length).toBeGreaterThan(0);
    for (const w of result.windows) {
      const panchang = computePanchang(w.start, DELHI);
      const direct = solarDay(new Date(w.start.getTime() + 3600_000), DELHI);
      expect(panchang.sunrise!.getTime(), w.day.date).toBe(direct.sunrise!.getTime());
      expect(panchang.sunset!.getTime(), w.day.date).toBe(direct.sunset!.getTime());
    }
  });

  it('never examines the same day twice as sunrise drifts against the 24-hour step', () => {
    const result = findMuhurtas(
      'Travel', new Date('2026-11-01'), new Date('2027-01-31'), DELHI, { natal, limit: 50 },
    );
    // Roughly 92 days in the range; the scan must not double-count any of them.
    expect(result.daysExamined).toBeGreaterThan(85);
    expect(result.daysExamined).toBeLessThanOrEqual(93);
  });
});

describe('performance', () => {
  it('scans a quarter well inside the budget for a phone', () => {
    const started = Date.now();
    findMuhurtas('Travel', new Date('2026-11-01'), new Date('2027-01-31'), DELHI, { natal });
    // The cheap first pass is what makes this possible; the full panchang runs
    // only for days that already scored well.
    expect(Date.now() - started).toBeLessThan(4000);
  });
});
