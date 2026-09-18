import { describe, it, expect } from 'vitest';
import * as Astro from 'astronomy-engine';
import { castChart } from '../src/chart/kundali.js';
import { ayanamsa } from '../src/core/ayanamsa.js';
import { decomposeLongitude, trueObliquity } from '../src/core/ephemeris.js';
import { norm360, DEG, RAD } from '../src/core/angle.js';
import { NAKSHATRA_SPAN } from '../src/core/constants.js';
import type { BirthData } from '../src/core/types.js';

const DELHI = { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', label: 'New Delhi' };

const birth = (over: Partial<BirthData> = {}): BirthData => ({
  year: 1990, month: 8, day: 15, hour: 10, minute: 30, second: 0,
  location: DELHI, timeAccuracy: 'Exact', ...over,
});

/**
 * Independent check of the ascendant: take the computed lagna, place it back on
 * the sky as an ecliptic point, and confirm it is actually sitting on the
 * eastern horizon at that moment. This validates the ascendant formula against
 * astronomy-engine's coordinate machinery rather than against itself.
 */
function horizonOfEclipticPoint(
  siderealLongitude: number, ayanamsaDeg: number,
  time: Astro.AstroTime, lat: number, lon: number,
): { altitude: number; azimuth: number } {
  const tropical = norm360(siderealLongitude + ayanamsaDeg);
  const ect = new Astro.Vector(
    Math.cos(tropical * DEG), Math.sin(tropical * DEG), 0, time,
  );
  const eqd = Astro.RotateVector(Astro.Rotation_ECT_EQD(time), ect);
  const observer = new Astro.Observer(lat, lon, 0);
  const hor = Astro.RotateVector(Astro.Rotation_EQD_HOR(time, observer), eqd);
  // astronomy-engine HOR frame: x = north, y = west, z = up.
  return {
    altitude: Math.asin(hor.z) * RAD,
    azimuth: norm360(Math.atan2(-hor.y, hor.x) * RAD),
  };
}

describe('ascendant', () => {
  it('lands on the eastern horizon, checked independently', () => {
    // Sample across the whole day and across latitudes: the ascendant must
    // always be on the horizon and always in the eastern half of the sky.
    for (const lat of [8.5, 28.6, 34.1]) {          // Kanyakumari, Delhi, Srinagar
      for (let hour = 0; hour < 24; hour += 1) {
        const b = birth({ hour, minute: 17, location: { ...DELHI, latitude: lat } });
        const { chart } = castChart(b);
        const time = Astro.MakeTime(new Date(chart.utcISO));
        const { altitude, azimuth } = horizonOfEclipticPoint(
          chart.lagna, chart.ayanamsa, time, lat, DELHI.longitude,
        );
        expect(Math.abs(altitude), `altitude at lat ${lat} hour ${hour}`).toBeLessThan(1e-6);
        expect(azimuth, `azimuth at lat ${lat} hour ${hour}`).toBeGreaterThan(0);
        expect(azimuth, `azimuth at lat ${lat} hour ${hour}`).toBeLessThan(180);
      }
    }
  });

  it('advances through all twelve signs over a day and returns near its start', () => {
    const seen = new Set<number>();
    let previous = -1;
    for (let minute = 0; minute < 24 * 60; minute += 10) {
      const { chart } = castChart(birth({ hour: Math.floor(minute / 60), minute: minute % 60 }));
      seen.add(chart.lagnaRashi);
      if (previous >= 0) {
        // The ascendant only ever moves forward through the zodiac.
        const step = norm360(chart.lagna - previous);
        expect(step).toBeLessThan(20);
      }
      previous = chart.lagna;
    }
    expect(seen.size).toBe(12);
  });

  it('moves roughly one degree every four minutes, as practitioners assume', () => {
    const a = castChart(birth({ hour: 10, minute: 0 })).chart.lagna;
    const b = castChart(birth({ hour: 10, minute: 4 })).chart.lagna;
    const moved = norm360(b - a);
    expect(moved).toBeGreaterThan(0.3);
    expect(moved).toBeLessThan(3.0);
  });
});

describe('sidereal zodiac anchors', () => {
  // The Indian solar calendar is defined by the Sun's sidereal ingresses, so
  // these dates are a strong end-to-end check of ephemeris + ayanamsa together.
  it('puts Mesha Sankranti on 14 April', () => {
    const day = findSolarIngress(2024, 0);
    expect(day.getUTCMonth() + 1).toBe(4);
    expect(day.getUTCDate()).toBeGreaterThanOrEqual(13);
    expect(day.getUTCDate()).toBeLessThanOrEqual(15);
  });

  it('puts Makara Sankranti on 14-15 January', () => {
    const day = findSolarIngress(2024, 270);
    expect(day.getUTCMonth() + 1).toBe(1);
    expect(day.getUTCDate()).toBeGreaterThanOrEqual(13);
    expect(day.getUTCDate()).toBeLessThanOrEqual(15);
  });
});

/** First instant in `year` at which the sidereal Sun reaches `targetLongitude`. */
function findSolarIngress(year: number, targetLongitude: number): Date {
  let previous: number | null = null;
  for (let d = 0; d < 366; d++) {
    const date = new Date(Date.UTC(year, 0, 1 + d, 12, 0, 0));
    const time = Astro.MakeTime(date);
    const geo = Astro.GeoVector(Astro.Body.Sun, time, true);
    const ect = Astro.RotateVector(Astro.Rotation_EQJ_ECT(time), geo);
    const tropical = norm360(Math.atan2(ect.y, ect.x) * RAD);
    const sidereal = norm360(tropical - ayanamsa(time, 'Lahiri'));
    const offset = norm360(sidereal - targetLongitude);
    if (previous !== null && previous > 300 && offset < 60) return date;
    previous = offset;
  }
  throw new Error(`no ingress at ${targetLongitude} found in ${year}`);
}

describe('chart assembly', () => {
  it('produces nine grahas, twelve bhavas and a consistent house map', () => {
    const { chart } = castChart(birth());
    expect(Object.keys(chart.positions)).toHaveLength(9);
    expect(chart.bhavas).toHaveLength(12);

    // Whole-sign: a graha's house must follow from its sign alone.
    for (const [graha, position] of Object.entries(chart.positions)) {
      const expected = ((position.rashi - chart.lagnaRashi + 12) % 12) + 1;
      expect(chart.grahaBhava[graha as keyof typeof chart.grahaBhava], graha).toBe(expected);
    }
  });

  it('keeps Ketu exactly opposite Rahu', () => {
    const { chart } = castChart(birth());
    const separation = norm360(chart.positions.Ketu.longitude - chart.positions.Rahu.longitude);
    expect(Math.abs(separation - 180)).toBeLessThan(1e-9);
  });

  it('shows the nodes as retrograde', () => {
    const { chart } = castChart(birth());
    expect(chart.positions.Rahu.retrograde).toBe(true);
    expect(chart.positions.Ketu.retrograde).toBe(true);
  });

  it('is deterministic', () => {
    const a = castChart(birth()).chart;
    const b = castChart(birth()).chart;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('gives the Sun a speed near one degree per day and the Moon near thirteen', () => {
    const { chart } = castChart(birth());
    expect(chart.positions.Sun.speed).toBeGreaterThan(0.95);
    expect(chart.positions.Sun.speed).toBeLessThan(1.03);
    expect(chart.positions.Moon.speed).toBeGreaterThan(11.7);
    expect(chart.positions.Moon.speed).toBeLessThan(15.4);
  });
});

describe('nakshatra decomposition', () => {
  it('assigns padas and lords consistently across the whole zodiac', () => {
    for (let lon = 0; lon < 360; lon += 0.37) {
      const d = decomposeLongitude(lon);
      expect(d.nakshatra).toBe(Math.floor(lon / NAKSHATRA_SPAN));
      expect(d.pada).toBeGreaterThanOrEqual(1);
      expect(d.pada).toBeLessThanOrEqual(4);
      expect(d.rashi).toBe(Math.floor(lon / 30));
    }
  });

  it('starts Ashwini at 0 Mesha and ends Revati at 360', () => {
    expect(decomposeLongitude(0).nakshatra).toBe(0);
    expect(decomposeLongitude(0).pada).toBe(1);
    expect(decomposeLongitude(359.999).nakshatra).toBe(26);
    expect(decomposeLongitude(359.999).pada).toBe(4);
  });
});

describe('historical Indian time', () => {
  it('applies wartime +06:30 for a 1943 birth rather than +05:30', () => {
    const { chart } = castChart(birth({ year: 1943, month: 6, day: 15, hour: 12, minute: 0 }));
    // 12:00 local at +06:30 is 05:30 UTC; a naive +05:30 would give 06:30 UTC.
    expect(chart.utcISO).toBe('1943-06-15T05:30:00.000Z');
  });

  it('applies Madras time for an 1890 birth', () => {
    const { chart } = castChart(birth({ year: 1890, month: 6, day: 15, hour: 12, minute: 0 }));
    // +05:21:10 in force, so 12:00 local is 06:38:50 UTC.
    expect(chart.utcISO).toBe('1890-06-15T06:38:50.000Z');
  });

  it('warns about pre-1955 Indian local time', () => {
    const { warnings } = castChart(birth({ year: 1943 }));
    expect(warnings.map((w) => w.code)).toContain('PRE_1955_INDIA');
  });

  it('warns when the birth time is unknown', () => {
    const { warnings } = castChart(birth({ timeAccuracy: 'Unknown' }));
    expect(warnings.map((w) => w.code)).toContain('UNKNOWN_BIRTH_TIME');
  });
});

describe('obliquity', () => {
  it('is about 23.44 degrees now and was larger in the past', () => {
    const now = trueObliquity(Astro.MakeTime(new Date(Date.UTC(2000, 0, 1))));
    expect(now).toBeGreaterThan(23.4);
    expect(now).toBeLessThan(23.5);
    const ancient = trueObliquity(Astro.MakeTime(new Date(Date.UTC(1000, 0, 1))));
    expect(ancient).toBeGreaterThan(now);
  });
});
