/**
 * Synthetic chart builder for rule tests.
 *
 * Rules must be testable at exact placements, not only at whatever a real date
 * happens to produce. This builds a well-formed Kundali from explicit
 * longitudes so a test can say "Mars exalted in Makara in the 10th" and mean it.
 */
import { decomposeLongitude } from '../../src/core/ephemeris.js';
import { buildBhavas, houseOf } from '../../src/chart/houses.js';
import { GRAHAS } from '../../src/core/constants.js';
import { norm360 } from '../../src/core/angle.js';
import { DEFAULT_SETTINGS } from '../../src/core/types.js';
import type {
  Kundali, Graha, GrahaPosition, BhavaNumber, RashiIndex,
} from '../../src/core/types.js';

/** Longitudes may be given as a number, or as `[rashi, degreeInRashi]`. */
export type Placement = number | [rashi: number, degree: number];

const toLongitude = (p: Placement): number =>
  typeof p === 'number' ? norm360(p) : norm360(p[0] * 30 + p[1]);

export function makeChart(spec: {
  lagna: Placement;
  /** Any graha left out is parked at 0° Mesha, out of the way of most rules. */
  positions: Partial<Record<Graha, Placement>>;
  retrograde?: Graha[];
}): Kundali {
  const lagna = toLongitude(spec.lagna);
  const bhavas = buildBhavas(lagna, norm360(lagna - 90), 'WholeSign');

  const positions = {} as Record<Graha, GrahaPosition>;
  const grahaBhava = {} as Record<Graha, BhavaNumber>;

  for (const graha of GRAHAS) {
    const raw = spec.positions[graha];
    const longitude = raw === undefined ? 0 : toLongitude(raw);
    const parts = decomposeLongitude(longitude);
    const retrograde = spec.retrograde?.includes(graha)
      ?? (graha === 'Rahu' || graha === 'Ketu');

    positions[graha] = {
      graha,
      longitude,
      latitude: 0,
      speed: retrograde ? -1 : 1,
      retrograde,
      ...parts,
    };
    grahaBhava[graha] = houseOf(longitude, bhavas, 'WholeSign');
  }

  // Keep Ketu opposite Rahu unless the caller placed it deliberately.
  if (spec.positions.Rahu !== undefined && spec.positions.Ketu === undefined) {
    const ketuLongitude = norm360(positions.Rahu.longitude + 180);
    positions.Ketu = {
      graha: 'Ketu', longitude: ketuLongitude, latitude: 0, speed: -1, retrograde: true,
      ...decomposeLongitude(ketuLongitude),
    };
    grahaBhava.Ketu = houseOf(ketuLongitude, bhavas, 'WholeSign');
  }

  const lagnaParts = decomposeLongitude(lagna);

  return {
    birth: {
      year: 2000, month: 1, day: 1, hour: 12, minute: 0,
      location: { latitude: 28.6, longitude: 77.2, timezone: 'Asia/Kolkata' },
      timeAccuracy: 'Exact',
    },
    julianDayUT: 2451545.0,
    julianDayTT: 2451545.0,
    utcISO: '2000-01-01T12:00:00.000Z',
    settings: DEFAULT_SETTINGS,
    ayanamsa: 23.85,
    lagna,
    lagnaRashi: lagnaParts.rashi as RashiIndex,
    lagnaNakshatra: lagnaParts.nakshatra,
    lagnaPada: lagnaParts.pada,
    madhyaLagna: norm360(lagna - 90),
    bhavas,
    positions,
    grahaBhava,
  };
}

/** Sign indices by name, for readable test specs. */
export const SIGN = {
  Mesha: 0, Vrishabha: 1, Mithuna: 2, Karka: 3, Simha: 4, Kanya: 5,
  Tula: 6, Vrischika: 7, Dhanu: 8, Makara: 9, Kumbha: 10, Meena: 11,
} as const;
