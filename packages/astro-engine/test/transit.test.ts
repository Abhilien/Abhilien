import { describe, it, expect } from 'vitest';
import {
  sadeSatiPeriods, sadeSatiStatus, dhaiyaPeriods, findSaturnIntervals,
} from '../src/transit/sadesati.js';
import {
  transitReport, transitSign, FAVOURABLE_TRANSIT_HOUSES, VEDHA_PAIRS,
} from '../src/transit/gochar.js';
import { castChart } from '../src/chart/kundali.js';
import { GRAHAS } from '../src/core/constants.js';
import type { BirthData, RashiIndex, Kundali } from '../src/core/types.js';

const DELHI = { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };
const YEAR_MS = 365.25 * 86400000;

/** A chart whose natal Moon is in the requested sign. */
function chartWithMoonIn(rashi: RashiIndex): Kundali {
  for (let day = 1; day <= 31; day++) {
    for (const month of [1, 3, 5, 7, 9, 11]) {
      const birth: BirthData = {
        year: 1990, month, day, hour: 10, minute: 30,
        location: DELHI, timeAccuracy: 'Exact',
      };
      const { chart } = castChart(birth);
      if (chart.positions.Moon.rashi === rashi) return chart;
    }
  }
  throw new Error(`no chart found with Moon in sign ${rashi}`);
}

describe('Saturn ingress dates', () => {
  // Saturn's sign changes are astronomy and are widely published, so they are
  // the outside check on the whole transit layer.
  it('resolves an ingress independently of where the scan started', () => {
    // The boundary must be a property of the sky, not of the caller's range.
    const instants = ['2024-01-01', '2024-06-01', '2020-01-01'].map((from) =>
      findSaturnIntervals([11 as RashiIndex], new Date(from), new Date('2029-01-01'))[0]!
        .start.toISOString().slice(0, 16));      // to the minute
    expect(new Set(instants).size).toBe(1);
  });

  it('matches the published Kumbha and Meena ingresses', () => {
    const intervals = findSaturnIntervals(
      [10 as RashiIndex], new Date('2020-01-01'), new Date('2027-01-01'),
    );
    // Saturn first touched Kumbha in April 2022, retrograded out, and settled
    // on 17 January 2023. The merge must report one passage, not two.
    expect(intervals).toHaveLength(1);
    expect(intervals[0]!.start.toISOString().slice(0, 7)).toBe('2022-04');

    const meena = findSaturnIntervals(
      [11 as RashiIndex], new Date('2024-01-01'), new Date('2029-01-01'),
    );
    expect(meena[0]!.start.toISOString().slice(0, 10)).toBe('2025-03-29');
  });

  it('merges a retrograde excursion instead of reporting two passages', () => {
    // Without merging, Saturn's 2022 wobble splits Kumbha into two occupancies.
    const unmerged = findSaturnIntervals(
      [10 as RashiIndex], new Date('2020-01-01'), new Date('2026-01-01'), 'Lahiri', 0,
    );
    const merged = findSaturnIntervals(
      [10 as RashiIndex], new Date('2020-01-01'), new Date('2026-01-01'),
    );
    expect(unmerged.length).toBeGreaterThan(merged.length);
    expect(merged).toHaveLength(1);
  });
});

describe('Sade Sati structure', () => {
  const chart = chartWithMoonIn(10 as RashiIndex);   // Kumbha
  const status = sadeSatiStatus(chart, new Date('2026-09-18T00:00:00Z'));

  it('recurs on Saturn own cycle', () => {
    const starts = status.all.map((p) => p.start.getTime());
    for (let i = 1; i < starts.length; i++) {
      const gap = (starts[i]! - starts[i - 1]!) / YEAR_MS;
      expect(gap).toBeGreaterThan(28);
      expect(gap).toBeLessThan(31);
    }
  });

  it('gives everyone three or four periods in a century', () => {
    // The point users most need to hear: this is a universal cycle, not a
    // personal affliction. Checked for every possible natal Moon sign.
    for (let sign = 0; sign < 12; sign++) {
      const s = sadeSatiStatus(chartWithMoonIn(sign as RashiIndex), new Date('2026-01-01'));
      expect(s.all.length, `Moon in sign ${sign}`).toBeGreaterThanOrEqual(3);
      expect(s.all.length, `Moon in sign ${sign}`).toBeLessThanOrEqual(4);
    }
  });

  it('runs seven to eight and a quarter years, varying with Saturn orbital speed', () => {
    // "Sade sati" means seven and a half, but that is a round number. Saturn is
    // near aphelion crossing Tula-Dhanu and near perihelion crossing
    // Vrishabha-Karka, so the real span varies by well over a year depending on
    // the natal Moon sign.
    const durations: number[] = [];
    for (let sign = 0; sign < 12; sign++) {
      const s = sadeSatiStatus(chartWithMoonIn(sign as RashiIndex), new Date('2026-01-01'));
      const middle = s.all[1]!;      // not truncated by the search bounds
      durations.push(middle.years);
    }
    for (const d of durations) {
      expect(d).toBeGreaterThan(7.0);
      expect(d).toBeLessThan(8.3);
    }
    // The variation is real and substantial, not rounding noise.
    expect(Math.max(...durations) - Math.min(...durations)).toBeGreaterThan(0.8);
  });

  it('uses the 12th, 1st and 2nd signs from the natal Moon', () => {
    const moon = chart.positions.Moon.rashi;
    for (const period of status.all) {
      expect(period.phases.map((p) => p.sign)).toEqual([
        (moon + 11) % 12, moon, (moon + 1) % 12,
      ]);
      expect(period.phases.map((p) => p.phase)).toEqual(['Rising', 'Peak', 'Setting']);
    }
  });
});

describe('phase boundaries', () => {
  const chart = chartWithMoonIn(10 as RashiIndex);
  const periods = sadeSatiPeriods(chart, new Date('1960-01-01'), new Date('2090-01-01'));

  it('partitions each period with no gap and no overlap', () => {
    for (const period of periods) {
      expect(period.phases).toHaveLength(3);
      expect(period.phases[0]!.start.getTime()).toBe(period.start.getTime());
      expect(period.phases[2]!.end.getTime()).toBe(period.end.getTime());
      for (let i = 1; i < 3; i++) {
        expect(period.phases[i]!.start.getTime()).toBe(period.phases[i - 1]!.end.getTime());
      }
    }
  });

  it('survives Saturn re-entering a phase sign late in the period', () => {
    // In the 2020s period Saturn entered Meena in March 2025, retrograded out
    // in June 2027 and returned in October 2027. Dating the Setting phase from
    // that last ingress would lose two and a half years of it.
    const period = periods.find((p) => p.start.getUTCFullYear() === 2020)!;
    const setting = period.phases[2]!;
    expect(setting.start.toISOString().slice(0, 10)).toBe('2025-03-29');
    // And the raw segments do record the re-entry.
    const meenaSegments = period.segments.filter((s) => s.sign === 11);
    expect(meenaSegments.length).toBeGreaterThan(1);
  });

  it('reports segments that match Saturn actual sign on a sampled day', () => {
    const period = periods.find((p) => p.start.getUTCFullYear() === 2020)!;
    for (const segment of period.segments) {
      const middle = new Date((segment.start.getTime() + segment.end.getTime()) / 2);
      expect(transitSign('Saturn', middle), segment.signName).toBe(segment.sign);
    }
  });
});

describe('Sade Sati status', () => {
  const chart = chartWithMoonIn(10 as RashiIndex);

  it('knows when a period is running and which phase', () => {
    const status = sadeSatiStatus(chart, new Date('2026-09-18T00:00:00Z'));
    expect(status.active).toBe(true);
    // Saturn is in Meena on this date, which is the 2nd from a Kumbha Moon.
    expect(status.phase).toBe('Setting');
    expect(status.period).not.toBeNull();
  });

  it('points to the next period when none is running', () => {
    const status = sadeSatiStatus(chart, new Date('2035-06-01T00:00:00Z'));
    expect(status.active).toBe(false);
    expect(status.next).not.toBeNull();
    expect(status.next!.start.getTime()).toBeGreaterThan(new Date('2035-06-01').getTime());
  });

  it('always tells the reader the cycle is universal', () => {
    // The single most useful fact for someone frightened by the phrase, and the
    // one an app selling remedies has an incentive to leave out.
    for (const date of ['2026-09-18', '2035-06-01', '2045-01-01']) {
      const status = sadeSatiStatus(chart, new Date(date));
      expect(status.summary, date).toMatch(/everyone/i);
      expect(status.summary, date).toMatch(/not a verdict on a person/i);
    }
  });

  it('reports the classical mitigations whenever a period is running', () => {
    const status = sadeSatiStatus(chart, new Date('2026-09-18T00:00:00Z'));
    expect(status.summary).toMatch(/bindus/);
    expect(status.summary).toMatch(/rather than of disaster/);
  });
});

describe('Dhaiya', () => {
  const chart = chartWithMoonIn(10 as RashiIndex);

  it('finds Saturn in the 4th and 8th from the Moon, about two and a half years each', () => {
    const periods = dhaiyaPeriods(chart, new Date('2000-01-01'), new Date('2060-01-01'));
    expect(periods.length).toBeGreaterThan(2);

    const moon = chart.positions.Moon.rashi;
    for (const p of periods) {
      const expectedSign = p.kind === 'KantakaShani' ? (moon + 3) % 12 : (moon + 7) % 12;
      expect(p.sign).toBe(expectedSign);
      if (!p.truncated) {
        expect(p.years).toBeGreaterThan(2.0);
        expect(p.years).toBeLessThan(3.2);
      }
    }
  });

  it('flags an interval cut short by the search range', () => {
    const periods = dhaiyaPeriods(chart, new Date('2000-01-01'), new Date('2010-01-01'));
    const cut = periods.filter((p) => p.truncated);
    for (const p of cut) {
      const touchesEdge = p.end.getTime() === new Date('2010-01-01').getTime()
        || p.start.getTime() === new Date('2000-01-01').getTime();
      expect(touchesEdge).toBe(true);
    }
  });
});

describe('Gochar tables', () => {
  it('gives every graha a set of favourable transit houses within 1-12', () => {
    for (const graha of GRAHAS) {
      const houses = FAVOURABLE_TRANSIT_HOUSES[graha];
      expect(houses.length, graha).toBeGreaterThan(0);
      expect(new Set(houses).size, graha).toBe(houses.length);
      for (const h of houses) {
        expect(h, graha).toBeGreaterThanOrEqual(1);
        expect(h, graha).toBeLessThanOrEqual(12);
      }
    }
  });

  it('only defines vedha for houses that are favourable in the first place', () => {
    // An obstruction to a transit that was never favourable would be meaningless.
    for (const [graha, pairs] of Object.entries(VEDHA_PAIRS)) {
      const favourable = FAVOURABLE_TRANSIT_HOUSES[graha as keyof typeof FAVOURABLE_TRANSIT_HOUSES];
      for (const [house, vedha] of Object.entries(pairs!)) {
        expect(favourable, `${graha} house ${house}`).toContain(Number(house));
        expect(vedha).toBeGreaterThanOrEqual(1);
        expect(vedha).toBeLessThanOrEqual(12);
        expect(vedha, `${graha} ${house} blocks itself`).not.toBe(Number(house));
      }
    }
  });

  it('omits Venus rather than guessing a disputed table', () => {
    expect(VEDHA_PAIRS.Venus).toBeUndefined();
    expect(VEDHA_PAIRS.Rahu).toBeUndefined();
    expect(VEDHA_PAIRS.Ketu).toBeUndefined();
  });
});

describe('transit report', () => {
  const chart = chartWithMoonIn(10 as RashiIndex);
  const report = transitReport(chart, new Date('2026-09-18T00:00:00Z'));

  it('covers all nine grahas with houses from both the Moon and the lagna', () => {
    expect(report).toHaveLength(9);
    for (const t of report) {
      expect(t.houseFromMoon).toBeGreaterThanOrEqual(1);
      expect(t.houseFromMoon).toBeLessThanOrEqual(12);
      expect(t.houseFromLagna).toBeGreaterThanOrEqual(1);
      expect(t.houseFromLagna).toBeLessThanOrEqual(12);
      expect(t.reading.length).toBeGreaterThan(30);
    }
  });

  it('agrees with the favourable-house table', () => {
    for (const t of report) {
      expect(t.favourable).toBe(FAVOURABLE_TRANSIT_HOUSES[t.graha].includes(t.houseFromMoon));
    }
  });

  it('only reports obstruction for a transit that was favourable', () => {
    for (const t of report) {
      if (t.obstructedBy) expect(t.favourable).toBe(true);
    }
  });

  it('carries Ashtakavarga bindus for the seven grahas and none for the nodes', () => {
    for (const t of report) {
      if (t.graha === 'Rahu' || t.graha === 'Ketu') {
        expect(t.bindus).toBeNull();
      } else {
        expect(t.bindus).toBeGreaterThanOrEqual(0);
        expect(t.bindus).toBeLessThanOrEqual(8);
      }
    }
  });

  it('places the Moon transit sign consistently with the report', () => {
    for (const t of report) {
      expect(transitSign(t.graha, new Date('2026-09-18T00:00:00Z'))).toBe(t.rashi);
    }
  });
});
