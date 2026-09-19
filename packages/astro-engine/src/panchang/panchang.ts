/**
 * Panchang — the five limbs of the Indian calendar, plus the day divisions that
 * every household actually uses.
 *
 * Two things here trip up naive implementations:
 *
 *  - The Hindu day runs sunrise to sunrise, not midnight to midnight. The
 *    weekday, the hora and every day-division below are anchored on sunrise at
 *    the given place, so the "day" of a 2 a.m. event is the previous calendar
 *    date's vara.
 *  - Tithi, yoga and karana are defined by the Sun-Moon elongation at an
 *    instant, not by the date. They change at arbitrary clock times, so we
 *    report both the value at the queried moment and when it ends.
 */
import * as Astro from 'astronomy-engine';
import { norm360 } from '../core/angle.js';
import { ayanamsa } from '../core/ayanamsa.js';
import { grahaPosition } from '../core/ephemeris.js';
import {
  NAKSHATRA_SPAN, WEEKDAY_LORDS, WEEKDAY_NAMES_SA, WEEKDAY_NAMES_HI,
  NAKSHATRA_NAMES_SA, HORA_ORDER,
} from '../core/constants.js';
import type { AyanamsaSystem, GeoLocation, Graha, NakshatraIndex } from '../core/types.js';

export const TITHI_NAMES: readonly string[] = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
] as const;

export const YOGA_NAMES: readonly string[] = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma',
  'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha',
  'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const;

/** The seven repeating karanas, in order. */
const MOVABLE_KARANAS: readonly string[] = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
] as const;

/** The four that occur once each per lunar month. */
const FIXED_KARANAS = { first: 'Kimstughna', last: ['Shakuni', 'Chatushpada', 'Naga'] } as const;

export type Paksha = 'Shukla' | 'Krishna';

export interface Tithi {
  /** 1..30 across the whole lunar month. */
  index: number;
  /** 1..15 within the paksha. */
  number: number;
  paksha: Paksha;
  name: string;
  /** Fraction of the tithi elapsed at the queried moment, 0..1. */
  elapsed: number;
  endsAt: Date;
}

export interface PanchangLimb {
  index: number;
  name: string;
  elapsed: number;
  endsAt: Date;
}

export interface DayWindow {
  name: string;
  start: Date;
  end: Date;
}

export interface Panchang {
  date: Date;
  location: GeoLocation;
  sunrise: Date | null;
  sunset: Date | null;
  /** Sunrise of the following day, which closes the Hindu day. */
  nextSunrise: Date | null;
  vara: { index: number; name: string; nameHi: string; lord: Graha };
  tithi: Tithi;
  nakshatra: PanchangLimb;
  yoga: PanchangLimb;
  karana: PanchangLimb;
  /** Inauspicious windows every Indian household checks before starting anything. */
  rahuKaal: DayWindow | null;
  gulikaKaal: DayWindow | null;
  yamaganda: DayWindow | null;
  abhijitMuhurta: DayWindow | null;
  choghadiya: DayWindow[];
  hora: DayWindow[];
}

interface Longitudes { sun: number; moon: number }

function siderealLongitudes(time: Astro.AstroTime, system: AyanamsaSystem): Longitudes {
  const ayan = ayanamsa(time, system);
  return {
    sun: grahaPosition('Sun', time, ayan, 'Mean').longitude,
    moon: grahaPosition('Moon', time, ayan, 'Mean').longitude,
  };
}

/**
 * When a limb next changes.
 *
 * Each limb is a monotonically increasing angle crossing a fixed step, so a
 * bisection on "has the index advanced yet" converges quickly and does not
 * depend on assuming a constant rate — which matters because the Moon's speed
 * varies by more than 10% between perigee and apogee.
 */
function findLimbEnd(
  time: Astro.AstroTime,
  system: AyanamsaSystem,
  indexOf: (l: Longitudes) => number,
  maxDays: number,
): Date {
  const startIndex = indexOf(siderealLongitudes(time, system));

  let low = 0;
  let high = maxDays;
  // Expand until the index has changed, so bisection has a bracket.
  while (indexOf(siderealLongitudes(time.AddDays(high), system)) === startIndex && high < maxDays * 4) {
    high *= 2;
  }
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (indexOf(siderealLongitudes(time.AddDays(mid), system)) === startIndex) low = mid;
    else high = mid;
  }
  return time.AddDays(high).date;
}

/**
 * Sunrise, sunset and the following sunrise for the Hindu day containing `date`.
 *
 * Exported so that everything which needs a day's boundaries derives them from
 * exactly this function. Two independent sunrise searches disagree by tens of
 * milliseconds, which is enough for a window beginning at sunrise to be
 * attributed to the previous day, and for two adjacent segments to register as
 * overlapping. One source of truth removes the whole class of problem.
 */
export function solarDay(date: Date, location: GeoLocation) {
  const observer = new Astro.Observer(location.latitude, location.longitude, location.altitude ?? 0);

  // The Hindu day opens at the LAST sunrise at or before the queried instant.
  // Searching forward from a fixed offset is not enough on its own: the first
  // sunrise found can already be later than the query, which would silently
  // attribute a 2 a.m. event to the wrong day. So we walk candidates forward and
  // keep the last one that is still in the past.
  const searchStart = Astro.MakeTime(new Date(date.getTime() - 36 * 3600_000));
  let candidate = Astro.SearchRiseSet(Astro.Body.Sun, observer, +1, searchStart, 4);

  let sunrise: Astro.AstroTime | null = null;
  let next: Astro.AstroTime | null = null;

  while (candidate) {
    if (candidate.date.getTime() <= date.getTime()) {
      sunrise = candidate;
      candidate = Astro.SearchRiseSet(Astro.Body.Sun, observer, +1, candidate.AddDays(0.1), 3);
    } else {
      next = candidate;
      break;
    }
  }

  // No sunrise in the preceding 36 hours means polar day or night, where the
  // sunrise-anchored divisions are simply not defined.
  if (!sunrise) return { sunrise: null, sunset: null, nextSunrise: null };

  const sunset = Astro.SearchRiseSet(Astro.Body.Sun, observer, -1, sunrise, 2);
  return {
    sunrise: sunrise.date,
    sunset: sunset ? sunset.date : null,
    nextSunrise: next ? next.date : null,
  };
}

/**
 * Which of the eight daylight parts each inauspicious window occupies, indexed
 * by weekday with Sunday at 0.
 */
const RAHU_KAAL_PART = [8, 2, 7, 5, 6, 4, 3];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];
const YAMAGANDA_PART = [5, 4, 3, 2, 1, 7, 6];

const CHOGHADIYA_DAY: Record<number, string[]> = {
  0: ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'],
  1: ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'],
  2: ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],
  3: ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'],
  4: ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'],
  5: ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],
  6: ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal'],
};

function segment(start: Date, end: Date, part: number, of: number, name: string): DayWindow {
  const span = (end.getTime() - start.getTime()) / of;
  return {
    name,
    start: new Date(start.getTime() + (part - 1) * span),
    end: new Date(start.getTime() + part * span),
  };
}

/**
 * The sunrise-anchored divisions of a day.
 *
 * Split out because muhurta selection needs exactly these and nothing else, and
 * routing it through `computePanchang` would pay for four limb-end bisections
 * per day that it never reads — the difference between a scan that feels
 * instant on a budget phone and one that freezes it for ten seconds.
 */
export function dayDivisions(
  sunrise: Date,
  sunset: Date,
  nextSunrise: Date | null,
  weekdayIndex: number,
): {
  rahuKaal: DayWindow; gulikaKaal: DayWindow; yamaganda: DayWindow;
  abhijitMuhurta: DayWindow | null; choghadiya: DayWindow[]; hora: DayWindow[];
} {
  return {
    rahuKaal: segment(sunrise, sunset, RAHU_KAAL_PART[weekdayIndex]!, 8, 'Rahu Kaal'),
    gulikaKaal: segment(sunrise, sunset, GULIKA_PART[weekdayIndex]!, 8, 'Gulika Kaal'),
    yamaganda: segment(sunrise, sunset, YAMAGANDA_PART[weekdayIndex]!, 8, 'Yamaganda'),
    // Abhijit is the 8th of 15 daylight muhurtas, straddling local noon. It is
    // conventionally not observed on Wednesday.
    abhijitMuhurta: weekdayIndex === 3
      ? null
      : segment(sunrise, sunset, 8, 15, 'Abhijit Muhurta'),
    choghadiya: CHOGHADIYA_DAY[weekdayIndex]!.map(
      (name, i) => segment(sunrise, sunset, i + 1, 8, name),
    ),
    hora: buildHoras(sunrise, sunset, nextSunrise, weekdayIndex),
  };
}

export interface PanchangOptions {
  ayanamsa?: AyanamsaSystem;
}

export function computePanchang(
  date: Date,
  location: GeoLocation,
  options: PanchangOptions = {},
): Panchang {
  const system = options.ayanamsa ?? 'Lahiri';
  const time = Astro.MakeTime(date);
  const { sun, moon } = siderealLongitudes(time, system);

  // --- the five limbs ---
  const elongation = norm360(moon - sun);
  const tithiIndex = Math.floor(elongation / 12);            // 0..29
  const tithiNumber = (tithiIndex % 15) + 1;
  const paksha: Paksha = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const tithiName = tithiNumber === 15
    ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya')
    : TITHI_NAMES[tithiNumber - 1]!;

  const nakshatraIndex = Math.floor(moon / NAKSHATRA_SPAN) as NakshatraIndex;
  const yogaIndex = Math.floor(norm360(sun + moon) / NAKSHATRA_SPAN);
  const karanaIndex = Math.floor(elongation / 6);            // 0..59

  const karanaName = karanaIndex === 0
    ? FIXED_KARANAS.first
    : karanaIndex >= 57
      ? FIXED_KARANAS.last[karanaIndex - 57]!
      : MOVABLE_KARANAS[(karanaIndex - 1) % 7]!;

  // --- sunrise-anchored day ---
  const { sunrise, sunset, nextSunrise } = solarDay(date, location);

  // The vara belongs to the sunrise that opened the current Hindu day, and must
  // be read in local civil terms, not UTC, or it flips either side of midnight.
  const localVaraIndex = sunrise
    ? localWeekday(sunrise, location.timezone)
    : localWeekday(date, location.timezone);

  const dayWindows = (sunrise && sunset)
    ? dayDivisions(sunrise, sunset, nextSunrise, localVaraIndex)
    : {
      rahuKaal: null, gulikaKaal: null, yamaganda: null,
      abhijitMuhurta: null, choghadiya: [], hora: [],
    };


  return {
    date,
    location,
    sunrise,
    sunset,
    nextSunrise,
    vara: {
      index: localVaraIndex,
      name: WEEKDAY_NAMES_SA[localVaraIndex]!,
      nameHi: WEEKDAY_NAMES_HI[localVaraIndex]!,
      lord: WEEKDAY_LORDS[localVaraIndex]!,
    },
    tithi: {
      index: tithiIndex + 1,
      number: tithiNumber,
      paksha,
      name: tithiName,
      elapsed: (elongation % 12) / 12,
      endsAt: findLimbEnd(time, system, (l) => Math.floor(norm360(l.moon - l.sun) / 12), 1.2),
    },
    nakshatra: {
      index: nakshatraIndex,
      name: NAKSHATRA_NAMES_SA[nakshatraIndex]!,
      elapsed: (moon % NAKSHATRA_SPAN) / NAKSHATRA_SPAN,
      endsAt: findLimbEnd(time, system, (l) => Math.floor(l.moon / NAKSHATRA_SPAN), 1.2),
    },
    yoga: {
      index: yogaIndex,
      name: YOGA_NAMES[yogaIndex]!,
      elapsed: (norm360(sun + moon) % NAKSHATRA_SPAN) / NAKSHATRA_SPAN,
      endsAt: findLimbEnd(time, system, (l) => Math.floor(norm360(l.sun + l.moon) / NAKSHATRA_SPAN), 1.2),
    },
    karana: {
      index: karanaIndex,
      name: karanaName,
      elapsed: (elongation % 6) / 6,
      endsAt: findLimbEnd(time, system, (l) => Math.floor(norm360(l.moon - l.sun) / 6), 0.7),
    },
    ...dayWindows,
  };
}

/** Planetary hours: twelve unequal by day, twelve by night, in Chaldean order. */
function buildHoras(
  sunrise: Date, sunset: Date, nextSunrise: Date | null, varaIndex: number,
): DayWindow[] {
  const out: DayWindow[] = [];
  // The first hora of a day belongs to that day's lord.
  const dayLord = WEEKDAY_LORDS[varaIndex]!;
  let cursor = HORA_ORDER.indexOf(dayLord);
  if (cursor < 0) cursor = 0;

  const dayPart = (sunset.getTime() - sunrise.getTime()) / 12;
  for (let i = 0; i < 12; i++) {
    out.push({
      name: HORA_ORDER[(cursor + i) % 7]!,
      start: new Date(sunrise.getTime() + i * dayPart),
      end: new Date(sunrise.getTime() + (i + 1) * dayPart),
    });
  }

  if (nextSunrise) {
    const nightPart = (nextSunrise.getTime() - sunset.getTime()) / 12;
    for (let i = 0; i < 12; i++) {
      out.push({
        name: HORA_ORDER[(cursor + 12 + i) % 7]!,
        start: new Date(sunset.getTime() + i * nightPart),
        end: new Date(sunset.getTime() + (i + 1) * nightPart),
      });
    }
  }
  return out;
}

/** Day of week as observed locally, 0 = Sunday. */
export function localWeekday(instant: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}
