/**
 * Chart assembly.
 *
 * `castChart` is the single entry point everything else builds on. It is a pure
 * function of birth data and settings: same input, same chart, forever. No
 * network, no clock, no randomness, no model.
 */
import * as Astro from 'astronomy-engine';
import { zonedTimeToUTC, dateToJulianDay, deltaTSeconds } from '../core/time.js';
import { computePositions, ascendant, decomposeLongitude } from '../core/ephemeris.js';
import { buildBhavas, houseOf } from './houses.js';
import { GRAHAS } from '../core/constants.js';
import type {
  BirthData, ChartSettings, Kundali, Graha, BhavaNumber, RashiIndex,
} from '../core/types.js';
import { DEFAULT_SETTINGS } from '../core/types.js';

export interface CastOptions extends Partial<ChartSettings> {}

/** Warnings a chart can carry. These are surfaced to the user rather than hidden:
 *  an honest chart says what it is unsure about. */
export interface ChartWarning {
  code:
    | 'AMBIGUOUS_LOCAL_TIME'
    | 'NONEXISTENT_LOCAL_TIME'
    | 'UNKNOWN_BIRTH_TIME'
    | 'COARSE_BIRTH_TIME'
    | 'HIGH_LATITUDE'
    | 'PRE_1955_INDIA';
  message: string;
}

export interface CastResult {
  chart: Kundali;
  warnings: ChartWarning[];
}

/** Cast a rashi chart (D1) for the given birth data. */
export function castChart(birth: BirthData, options: CastOptions = {}): CastResult {
  const settings: ChartSettings = { ...DEFAULT_SETTINGS, ...options };
  const warnings: ChartWarning[] = [];

  const { latitude, longitude, timezone } = birth.location;

  const resolved = zonedTimeToUTC(
    birth.year, birth.month, birth.day,
    birth.hour, birth.minute, birth.second ?? 0,
    timezone,
  );

  if (resolved.ambiguous) {
    warnings.push({
      code: 'AMBIGUOUS_LOCAL_TIME',
      message:
        `${pad(birth.hour)}:${pad(birth.minute)} occurred twice in ${timezone} on this date ` +
        `(clocks went back). The earlier occurrence has been used.`,
    });
  }
  if (resolved.nonexistent) {
    warnings.push({
      code: 'NONEXISTENT_LOCAL_TIME',
      message:
        `${pad(birth.hour)}:${pad(birth.minute)} did not occur in ${timezone} on this date ` +
        `(clocks went forward). The instant the clock jumped to has been used.`,
    });
  }

  warnings.push(...timeAccuracyWarnings(birth));

  if (Math.abs(latitude) > 66.5) {
    warnings.push({
      code: 'HIGH_LATITUDE',
      message:
        `At latitude ${latitude.toFixed(1)}° some houses span very unequal arcs and the sun may ` +
        `not rise or set. Whole-sign houses remain well defined; cusp-based systems may not.`,
    });
  }

  if (isPre1955India(birth)) {
    warnings.push({
      code: 'PRE_1955_INDIA',
      message:
        `Before 1955 Indian local time was not uniform. The offset in force at this place and ` +
        `date has been applied from the IANA time zone database, but if the birth was recorded ` +
        `in local Bombay (+04:51) or Calcutta (+05:53:20) time rather than the official standard, ` +
        `confirm which was meant.`,
    });
  }

  const time = Astro.MakeTime(resolved.date);
  const { ayanamsa, positions } = computePositions(time, settings.ayanamsa, settings.nodeModel);
  const asc = ascendant(time, latitude, longitude, ayanamsa);

  const bhavas = buildBhavas(asc.sidereal, asc.mc, settings.houseSystem);

  const grahaBhava = {} as Record<Graha, BhavaNumber>;
  for (const graha of GRAHAS) {
    grahaBhava[graha] = houseOf(positions[graha].longitude, bhavas, settings.houseSystem);
  }

  const lagnaParts = decomposeLongitude(asc.sidereal);
  const julianDayUT = dateToJulianDay(resolved.date);

  const chart: Kundali = {
    birth,
    julianDayUT,
    julianDayTT: julianDayUT + deltaTSeconds(julianDayUT) / 86400,
    utcISO: resolved.date.toISOString(),
    settings,
    ayanamsa,
    lagna: asc.sidereal,
    lagnaRashi: lagnaParts.rashi as RashiIndex,
    lagnaNakshatra: lagnaParts.nakshatra,
    lagnaPada: lagnaParts.pada,
    madhyaLagna: asc.mc,
    bhavas,
    positions,
    grahaBhava,
  };

  return { chart, warnings };
}

function timeAccuracyWarnings(birth: BirthData): ChartWarning[] {
  const accuracy = birth.timeAccuracy ?? 'ToMinute';
  if (accuracy === 'Unknown') {
    return [{
      code: 'UNKNOWN_BIRTH_TIME',
      message:
        'Birth time is unknown, so the ascendant, the houses and every divisional chart are ' +
        'not meaningful. Only the sign positions of the grahas are shown, and the Moon may be ' +
        'up to 13° out over a full day.',
    }];
  }
  if (accuracy === 'ToHour' || accuracy === 'ToPartOfDay') {
    return [{
      code: 'COARSE_BIRTH_TIME',
      message:
        'The birth time is known only roughly. The ascendant moves about one degree every four ' +
        'minutes, so the rising sign and all house placements may be wrong. Navamsa in ' +
        'particular changes every thirteen minutes. Consider birth-time rectification.',
    }];
  }
  return [];
}

function isPre1955India(birth: BirthData): boolean {
  const tz = birth.location.timezone;
  const indian = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
  return indian && birth.year < 1955;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
